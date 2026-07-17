import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { Invitacion } from './invitacion.entity.js';
import { Jugador } from '../jugador/jugador.entity.js';
import { Notificacion } from '../notificacion/notificacion.entity.js';
import { MAX_JUGADORES_PLANTEL } from '../shared/constants.js';

const em = orm.em;

const ESTADOS_VALIDOS = ['pendiente', 'aceptada', 'rechazada'];

/** 🔹 Sanitiza el body para crear una invitación */
function sanitizeInvitacionInput(req: Request, res: Response, next: NextFunction) {
  req.body.sanitizedInput = {
    idJugador: req.body.idJugador,
  };

  if (!req.body.sanitizedInput.idJugador) {
    return res.status(400).json({ message: 'idJugador es requerido' });
  }

  next();
}

/** 🔹 Sanitiza el body para responder una invitación */
function sanitizeRespuestaInput(req: Request, res: Response, next: NextFunction) {
  const { estado } = req.body;

  if (!estado || !['aceptada', 'rechazada'].includes(estado)) {
    return res.status(400).json({ message: "estado debe ser 'aceptada' o 'rechazada'" });
  }

  req.body.sanitizedInput = { estado };
  next();
}

/** 🔹 POST /invitaciones — el capitán logueado invita a un jugador a su equipo */
async function add(req: Request, res: Response) {
  try {
    const { idJugador } = req.body.sanitizedInput;
    const capitanId = req.user?.id;

    const capitanEmisor = await em.findOne(Jugador, { id: capitanId }, { populate: ['equipo'] });
    if (!capitanEmisor?.equipo || !capitanEmisor.esCapitan) {
      return res.status(403).json({ message: 'Solo el capitán de un equipo puede enviar invitaciones' });
    }

    const jugadorInvitado = await em.findOne(Jugador, { id: Number(idJugador) });
    if (!jugadorInvitado) return res.status(404).json({ message: 'Jugador no encontrado' });
    if (jugadorInvitado.equipo) {
      return res.status(400).json({ message: 'El jugador ya pertenece a un equipo' });
    }

    const cantidadJugadores = await em.count(Jugador, { equipo: capitanEmisor.equipo.id });
    if (cantidadJugadores >= MAX_JUGADORES_PLANTEL) {
      return res.status(400).json({
        message: `El plantel ya alcanzó el límite de ${MAX_JUGADORES_PLANTEL} jugadores`,
      });
    }

    const yaExiste = await em.findOne(Invitacion, {
      jugador: jugadorInvitado,
      equipo: capitanEmisor.equipo,
      estado: 'pendiente',
    });
    if (yaExiste) {
      return res.status(409).json({ message: 'Ya existe una invitación pendiente para este jugador' });
    }

    const invitacion = em.create(Invitacion, {
      jugador: jugadorInvitado,
      equipo: capitanEmisor.equipo,
      capitanEmisor,
      estado: 'pendiente',
      fechaEnvio: new Date(),
      vistaPorCapitan: false,
    });

    const notificacion = em.create(Notificacion, {
      jugador: jugadorInvitado,
      tipo: 'invitacion_recibida',
      mensaje: `Te invitaron a unirte al equipo "${capitanEmisor.equipo.nombreEquipo}".`,
      leida: false,
      fecha: new Date(),
    });

    await em.persistAndFlush([invitacion, notificacion]);
    res.status(201).json({ message: 'invitacion created', data: invitacion });
  } catch (e: any) {
    console.error('Error al crear invitación:', e);
    res.status(500).json({ message: e.message });
  }
}

/** 🔹 GET /invitaciones/jugador/:idJugador?estado=pendiente */
async function findByJugador(req: Request, res: Response) {
  try {
    const idJugador = Number(req.params.idJugador);
    if (Number.isNaN(idJugador)) return res.status(400).json({ message: 'idJugador inválido' });

    const filtro: Record<string, any> = { jugador: idJugador };
    const estado = req.query.estado as string | undefined;
    if (estado) {
      if (!ESTADOS_VALIDOS.includes(estado)) {
        return res.status(400).json({ message: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}` });
      }
      filtro.estado = estado;
    }

    const invitaciones = await em.find(Invitacion, filtro, {
      populate: ['equipo', 'capitanEmisor'],
      orderBy: { fechaEnvio: 'DESC' },
    });

    res.status(200).json({ message: 'found invitaciones', data: invitaciones });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** 🔹 GET /invitaciones/equipo/:idEquipo?estado=aceptada,rechazada&vistaPorCapitan=false */
async function findByEquipo(req: Request, res: Response) {
  try {
    const idEquipo = Number(req.params.idEquipo);
    if (Number.isNaN(idEquipo)) return res.status(400).json({ message: 'idEquipo inválido' });

    const filtro: Record<string, any> = { equipo: idEquipo };

    const estado = req.query.estado as string | undefined;
    if (estado) {
      const estados = estado.split(',').map((e) => e.trim());
      const invalidos = estados.filter((e) => !ESTADOS_VALIDOS.includes(e));
      if (invalidos.length > 0) {
        return res.status(400).json({ message: `Estado inválido: ${invalidos.join(', ')}` });
      }
      filtro.estado = { $in: estados };
    }

    if (req.query.vistaPorCapitan !== undefined) {
      filtro.vistaPorCapitan = req.query.vistaPorCapitan === 'true';
    }

    const invitaciones = await em.find(Invitacion, filtro, {
      populate: ['jugador'],
      orderBy: { fechaEnvio: 'DESC' },
    });

    res.status(200).json({ message: 'found invitaciones', data: invitaciones });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** 🔹 PUT /invitaciones/:id — el jugador invitado acepta o rechaza */
async function responder(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const { estado } = req.body.sanitizedInput;

    const result = await em.transactional(async (txEm) => {
      const invitacion = await txEm.findOneOrFail(Invitacion, { id }, { populate: ['jugador', 'equipo', 'capitanEmisor'] });

      if (invitacion.jugador.id !== req.user?.id) {
        throw Object.assign(new Error('No autorizado para responder esta invitación'), { status: 403 });
      }
      if (invitacion.estado !== 'pendiente') {
        throw Object.assign(new Error('Esta invitación ya fue respondida'), { status: 400 });
      }

      if (estado === 'aceptada') {
        const jugador = await txEm.findOneOrFail(Jugador, { id: invitacion.jugador.id });
        if (jugador.equipo) {
          throw Object.assign(new Error('Ya pertenecés a un equipo'), { status: 400 });
        }

        const cantidadJugadores = await txEm.count(Jugador, { equipo: invitacion.equipo.id });
        if (cantidadJugadores >= MAX_JUGADORES_PLANTEL) {
          throw Object.assign(
            new Error(`El equipo ya alcanzó el límite de ${MAX_JUGADORES_PLANTEL} jugadores`),
            { status: 400 }
          );
        }

        jugador.equipo = invitacion.equipo;
        jugador.esCapitan = false;
      }

      invitacion.estado = estado;
      invitacion.fechaRespuesta = new Date();
      invitacion.vistaPorCapitan = false;

      txEm.create(Notificacion, {
        jugador: invitacion.capitanEmisor,
        tipo: estado === 'aceptada' ? 'invitacion_aceptada' : 'invitacion_rechazada',
        mensaje: estado === 'aceptada'
          ? `${invitacion.jugador.nombre} ${invitacion.jugador.apellido} aceptó tu invitación y se sumó a "${invitacion.equipo.nombreEquipo}".`
          : `${invitacion.jugador.nombre} ${invitacion.jugador.apellido} rechazó tu invitación a "${invitacion.equipo.nombreEquipo}".`,
        leida: false,
        fecha: new Date(),
      });

      return invitacion;
    });

    res.status(200).json({ message: `invitacion ${estado}`, data: result });
  } catch (e: any) {
    res.status(e.status ?? 500).json({ message: e.message });
  }
}

/** 🔹 PATCH /invitaciones/:id/vista — el capitán marca la resolución como vista */
async function marcarVista(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const invitacion = await em.findOne(Invitacion, { id }, { populate: ['capitanEmisor'] });
    if (!invitacion) return res.status(404).json({ message: 'Invitación no encontrada' });

    if (invitacion.capitanEmisor.id !== req.user?.id) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    invitacion.vistaPorCapitan = true;
    await em.flush();

    res.status(200).json({ message: 'invitacion marcada como vista', data: invitacion });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

export {
  sanitizeInvitacionInput,
  sanitizeRespuestaInput,
  add,
  findByJugador,
  findByEquipo,
  responder,
  marcarVista,
};
