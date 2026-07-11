import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { orm } from '../shared/db/orm.js';
import { Jugador } from './jugador.entity.js';
import { Equipo } from '../equipo/equipo.entity.js';
import { Torneo } from '../torneo/torneo.entity.js';
import { Participacion } from '../participacion/participacion.entity.js';
import { Suspension } from '../suspension/suspension.entity.js';
import { Notificacion } from '../notificacion/notificacion.entity.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { enviarMailRecuperacion } from '../shared/mail/mailer.js';

const em = orm.em;

/** 🔹 Sanitiza y normaliza el body */
function sanitizeJugadorInput(req: Request, res: Response, next: NextFunction) {
  req.body.sanitizedInput = {
    nombre: req.body.nombre,
    apellido: req.body.apellido,
    dni: req.body.dni,
    email: req.body.email,
    fechaNacimiento: req.body.fechaNacimiento,
    posicion: req.body.posicion,
    descripcion: req.body.descripcion,
    contraseña: req.body.contraseña,
    equipo: 'equipo' in req.body ? req.body.equipo : undefined,
    esCapitan: req.body.esCapitan,
  };

  Object.keys(req.body.sanitizedInput).forEach((k) => {
    if (req.body.sanitizedInput[k] === undefined)
      delete req.body.sanitizedInput[k];
  });

  next();
}

/** 🔹 GET /jugadores */
async function findAll(req: Request, res: Response) {
  try {
    const jugadores = await em.find(Jugador, {}, { populate: ["equipo"] });
    const jugadoresSeguros = jugadores.map(({ contraseña, ...resto }) => resto);
    res.status(200).json({ message: "found all jugadores", data: jugadoresSeguros });
  } catch (error: any) {
    console.error("Error en findAll:", error);
    res.status(500).json({ message: error.message });
  }
}

/** 🔹 GET /jugadores/:id */
async function findOne(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id))
      return res.status(400).json({ message: "id inválido" });

    const jugador = await em.findOne(Jugador, { id }, { populate: ["equipo"] });
    if (!jugador)
      return res.status(404).json({ message: "Jugador no encontrado" });

    const { contraseña, ...jugadorSinPassword } = jugador;
    res.status(200).json({ message: "found jugador", data: jugadorSinPassword });
  } catch (error: any) {
    console.error("Error en findOne:", error);
    res.status(500).json({ message: error.message });
  }
}

/** 🔹 GET /jugadores/by-email?email=... */
async function findByEmail(req: Request, res: Response) {
  try {
    const email = req.query.email as string;
    if (!email)
      return res.status(400).json({ message: "Email requerido" });

    const jugador = await em.findOne(Jugador, { email }, { populate: ["equipo"] });
    if (!jugador)
      return res.status(404).json({ message: "Jugador no encontrado" });

    const { contraseña, ...jugadorSinPassword } = jugador;
    res.status(200).json({ message: "found jugador", data: jugadorSinPassword });
  } catch (error: any) {
    console.error("Error en findByEmail:", error);
    res.status(500).json({ message: error.message });
  }
}

/** 🔹 GET /jugadores/sin-equipo */
async function getJugadoresSinEquipo(req: Request, res: Response) {
  try {
    const jugadores = await em.find(Jugador, { equipo: null });
    const jugadoresSeguros = jugadores.map(({ contraseña, ...resto }) => resto);
    res.status(200).json({ message: "found jugadores sin equipo", data: jugadoresSeguros });
  } catch (err) {
    console.error("❌ Error al obtener jugadores sin equipo:", err);
    res.status(500).json({ message: "Error al obtener jugadores sin equipo" });
  }
}

/** 🔹 GET /jugadores/por-admin/:adminId — jugadores en equipos que participan
 * en algún torneo del admin logueado (AdminTorneo → Torneo → Participacion → Equipo → Jugador) */
async function findByAdmin(req: Request, res: Response) {
  try {
    const adminId = Number(req.params.adminId);
    if (Number.isNaN(adminId)) return res.status(400).json({ message: 'adminId inválido' });

    const torneos = await em.find(Torneo, { adminTorneo: adminId });
    const torneoIds = torneos.map((t) => t.id).filter((id): id is number => id !== undefined);
    if (torneoIds.length === 0) {
      return res.status(200).json({ message: 'found jugadores por admin', data: [] });
    }

    const participaciones = await em.find(
      Participacion,
      { torneo: { $in: torneoIds } },
      { populate: ['equipo'] }
    );
    const equipoIds = [
      ...new Set(participaciones.map((p) => p.equipo.id).filter((id): id is number => id !== undefined)),
    ];
    if (equipoIds.length === 0) {
      return res.status(200).json({ message: 'found jugadores por admin', data: [] });
    }

    const jugadores = await em.find(
      Jugador,
      { equipo: { $in: equipoIds } },
      { populate: ['equipo'] }
    );
    const jugadoresSeguros = jugadores.map(({ contraseña, ...resto }) => resto);
    res.status(200).json({ message: 'found jugadores por admin', data: jugadoresSeguros });
  } catch (error: any) {
    console.error('Error en findByAdmin:', error);
    res.status(500).json({ message: error.message });
  }
}

/** 🔹 POST /jugadores */
async function add(req: Request, res: Response) {
  try {
    const data = req.body.sanitizedInput;

    if (!data.nombre || !data.apellido || !data.dni || !data.email || !data.contraseña) {
      return res.status(400).json({ error: 'Faltan campos requeridos: nombre, apellido, dni, email, contraseña' });
    }

    const existente = await em.findOne(Jugador, { email: data.email });
    if (existente) return res.status(409).json({ error: 'Ya existe un jugador con ese email' });

    if (data.contraseña) {
      data.contraseña = await bcrypt.hash(data.contraseña, 10);
    }

    data.esCapitan = data.esCapitan ?? false;
    data.equipo = data.equipo ?? null;

    const jugador = em.create(Jugador, data);
    await em.flush();
    const { contraseña, ...jugadorSinPassword } = jugador;
    res.status(201).json({ message: 'jugador created', data: jugadorSinPassword });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** 🔹 PUT /jugadores/:id */
async function update(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const {
      nombre,
      apellido,
      dni,
      email,
      fechaNacimiento,
      posicion,
      descripcion,
      equipo,
      esCapitan
    } = req.body.sanitizedInput;

    // Pre-checks fuera de la transacción (solo lecturas, sin modificar nada)
    const jugador = await em.findOne(Jugador, { id }, { populate: ['equipo'] });
    if (!jugador) return res.status(404).json({ message: 'Jugador no encontrado' });

    if (email && email !== jugador.email) {
      const emailEnUso = await em.findOne(Jugador, { email, id: { $ne: id } });
      if (emailEnUso) return res.status(409).json({ message: 'Ese email ya está en uso' });
    }

    if (equipo) {
      const equipoExiste = await em.findOne(Equipo, { id: Number(equipo) });
      if (!equipoExiste) return res.status(404).json({ message: 'Equipo no encontrado' });
    }

    // Validar capitán único: chequeamos el equipo destino (actual o nuevo)
    if (esCapitan === true) {
      const targetEquipoId = equipo ? Number(equipo) : jugador.equipo?.id;
      if (targetEquipoId) {
        const capitan = await em.findOne(Jugador, { equipo: targetEquipoId, esCapitan: true, id: { $ne: id } });
        if (capitan) return res.status(400).json({ error: 'El equipo ya tiene un capitán' });
      }
    }

    // Toda la escritura en una sola transacción atómica.
    // em.transactional() hace flush y commit al final, o rollback si lanza un error.
    const result = await em.transactional(async (txEm) => {
      const j = await txEm.findOneOrFail(Jugador, { id }, { populate: ['equipo'] });
      let mensaje = 'Jugador actualizado correctamente';

      if (equipo === null && j.equipo) {
        // Caso: se quita al jugador del equipo
        const equipoAnterior = j.equipo;
        const eraCapitan = j.esCapitan;
        j.equipo = null;
        j.esCapitan = false;

        const otrosJugadores = await txEm.find(
          Jugador,
          { equipo: equipoAnterior, id: { $ne: j.id } },
          { orderBy: { id: 'ASC' } }
        );

        if (eraCapitan && otrosJugadores.length > 0) {
          otrosJugadores[0].esCapitan = true;
          mensaje = 'Nuevo capitán asignado automáticamente.';
          console.log(`Nuevo capitán asignado: ${otrosJugadores[0].nombre}`);
        } else if (otrosJugadores.length === 0) {
          txEm.remove(equipoAnterior);
          mensaje = 'Equipo eliminado porque se quedó sin jugadores.';
          console.log('Equipo eliminado porque se quedó sin jugadores');
        }

      } else if (equipo) {
        // Caso: se asigna un nuevo equipo
        // Fix #3: si ya tiene un equipo DISTINTO, desvincularlo primero
        if (j.equipo && j.equipo.id !== Number(equipo)) {
          const equipoAnterior = j.equipo;
          const eraCapitan = j.esCapitan;
          j.esCapitan = false;
          j.equipo = null;

          const otrosJugadores = await txEm.find(
            Jugador,
            { equipo: equipoAnterior, id: { $ne: j.id } },
            { orderBy: { id: 'ASC' } }
          );

          if (eraCapitan && otrosJugadores.length > 0) {
            otrosJugadores[0].esCapitan = true;
          } else if (otrosJugadores.length === 0) {
            txEm.remove(equipoAnterior);
          }
        }

        const equipoEntidad = await txEm.findOneOrFail(Equipo, { id: Number(equipo) });
        j.equipo = equipoEntidad;
      }

      if (nombre) j.nombre = nombre;
      if (apellido) j.apellido = apellido;
      if (dni) j.dni = dni;
      if (email) j.email = email;
      if (fechaNacimiento) j.fechaNacimiento = fechaNacimiento;
      if (posicion) j.posicion = posicion;
      if (descripcion !== undefined) j.descripcion = descripcion;
      if (esCapitan !== undefined) j.esCapitan = esCapitan;

      const { contraseña, ...jugadorSinPassword } = j;
      return { message: mensaje, data: jugadorSinPassword };
    });

    return res.json(result);

  } catch (error) {
    console.error('Error en update jugador:', error);
    res.status(500).json({ message: 'Error al actualizar jugador' });
  }
}

/** 🔹 PATCH /jugadores/:id/transferir-capitania — el capitán (id) le pasa la cinta a otro jugador de su equipo */
async function transferirCapitania(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const idNuevoCapitan = Number(req.body.idNuevoCapitan);

    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });
    if (!req.body.idNuevoCapitan || Number.isNaN(idNuevoCapitan)) {
      return res.status(400).json({ message: 'idNuevoCapitan es requerido' });
    }

    const result = await em.transactional(async (txEm) => {
      const saliente = await txEm.findOneOrFail(Jugador, { id }, { populate: ['equipo'] });

      if (!saliente.esCapitan || !saliente.equipo) {
        throw Object.assign(new Error('Solo el capitán de un equipo puede transferir la capitanía'), { status: 403 });
      }

      const nuevoCapitan = await txEm.findOne(Jugador, { id: idNuevoCapitan }, { populate: ['equipo'] });
      if (!nuevoCapitan) {
        throw Object.assign(new Error('Jugador no encontrado'), { status: 404 });
      }
      if (nuevoCapitan.id === saliente.id) {
        throw Object.assign(new Error('Elegí a otro jugador del equipo'), { status: 400 });
      }
      if (nuevoCapitan.equipo?.id !== saliente.equipo.id) {
        throw Object.assign(new Error('El nuevo capitán debe pertenecer al mismo equipo'), { status: 400 });
      }

      saliente.esCapitan = false;
      nuevoCapitan.esCapitan = true;

      return { saliente, nuevoCapitan };
    });

    res.status(200).json({
      message: 'Capitanía transferida correctamente',
      data: { idSaliente: result.saliente.id, idNuevoCapitan: result.nuevoCapitan.id },
    });
  } catch (e: any) {
    console.error('Error al transferir capitanía:', e);
    res.status(e.status ?? 500).json({ message: e.message });
  }
}

/** Resuelve la Participacion del torneo 'en_curso' del equipo de un jugador
 * (un equipo solo puede estar en un torneo en_curso a la vez — validado en
 * POST /participacion — así que como mucho hay una). */
async function resolverParticipacionActiva(jugador: Jugador) {
  if (!jugador.equipo) return null;
  return em.findOne(
    Participacion,
    { equipo: jugador.equipo.id, torneo: { estado: 'en_curso' } },
    { populate: ['torneo', 'torneo.adminTorneo'] }
  );
}

/** 🔹 PATCH /jugadores/:id/suspender — body { motivo } */
async function suspender(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const motivo = String(req.body.motivo ?? '').trim();
    if (!motivo) return res.status(400).json({ message: 'El motivo es requerido' });

    const jugador = await em.findOne(Jugador, { id }, { populate: ['equipo'] });
    if (!jugador) return res.status(404).json({ message: 'Jugador no encontrado' });

    const participacion = await resolverParticipacionActiva(jugador);
    if (!participacion) {
      return res.status(400).json({ message: 'El equipo del jugador no participa en ningún torneo activo' });
    }
    const torneo = participacion.torneo;

    if ((torneo as any).adminTorneo?.id !== req.user?.id) {
      return res.status(403).json({ message: 'No autorizado para suspender jugadores de este torneo' });
    }

    const yaSuspendido = await em.findOne(Suspension, { jugador: id, torneo: torneo.id, activa: true });
    if (yaSuspendido) {
      return res.status(409).json({ message: 'El jugador ya está suspendido en este torneo' });
    }

    const suspension = em.create(Suspension, {
      jugador,
      torneo,
      motivo,
      fecha: new Date(),
      activa: true,
    });

    const notificacion = em.create(Notificacion, {
      jugador,
      tipo: 'suspension',
      mensaje: `Fuiste suspendido del torneo "${torneo.nombreTorneo}". Motivo: ${motivo}`,
      torneo,
      leida: false,
      fecha: new Date(),
    });

    await em.persistAndFlush([suspension, notificacion]);
    res.status(201).json({ message: 'Jugador suspendido', data: suspension });
  } catch (error: any) {
    console.error('Error al suspender jugador:', error);
    res.status(500).json({ message: error.message });
  }
}

/** 🔹 PATCH /jugadores/:id/habilitar — body { idSuspension } */
async function habilitar(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const idSuspension = Number(req.body.idSuspension);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });
    if (!req.body.idSuspension || Number.isNaN(idSuspension)) {
      return res.status(400).json({ message: 'idSuspension es requerido' });
    }

    const suspension = await em.findOne(
      Suspension,
      { id: idSuspension, jugador: id },
      { populate: ['jugador', 'torneo', 'torneo.adminTorneo'] }
    );
    if (!suspension) return res.status(404).json({ message: 'Suspensión no encontrada' });
    if (!suspension.activa) return res.status(400).json({ message: 'La suspensión ya fue levantada' });

    if ((suspension.torneo as any).adminTorneo?.id !== req.user?.id) {
      return res.status(403).json({ message: 'No autorizado para levantar esta suspensión' });
    }

    suspension.activa = false;
    suspension.fechaLevantamiento = new Date();

    const notificacion = em.create(Notificacion, {
      jugador: suspension.jugador,
      tipo: 'habilitacion',
      mensaje: `Se levantó tu suspensión en el torneo "${suspension.torneo.nombreTorneo}".`,
      torneo: suspension.torneo,
      leida: false,
      fecha: new Date(),
    });

    await em.persistAndFlush(notificacion);
    res.status(200).json({ message: 'Suspensión levantada', data: suspension });
  } catch (error: any) {
    console.error('Error al habilitar jugador:', error);
    res.status(500).json({ message: error.message });
  }
}

/** 🔹 GET /jugadores/:id/suspensiones — historial + torneo activo actual */
async function suspensiones(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const jugador = await em.findOne(Jugador, { id }, { populate: ['equipo'] });
    if (!jugador) return res.status(404).json({ message: 'Jugador no encontrado' });

    const historial = await em.find(
      Suspension,
      { jugador: id },
      { populate: ['torneo'], orderBy: { fecha: 'DESC' } }
    );

    const participacionActiva = await resolverParticipacionActiva(jugador);

    res.status(200).json({
      message: 'found suspensiones',
      data: {
        suspensiones: historial,
        torneoActivo: participacionActiva
          ? { id: participacionActiva.torneo.id, nombreTorneo: participacionActiva.torneo.nombreTorneo }
          : null,
      },
    });
  } catch (error: any) {
    console.error('Error en suspensiones:', error);
    res.status(500).json({ message: error.message });
  }
}

/** 🔹 DELETE /jugadores/:id */
async function remove(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id))
      return res.status(400).json({ message: 'id inválido' });

    const ref = em.getReference(Jugador, id);
    await em.removeAndFlush(ref);
    res.status(200).json({ message: 'jugador deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** 🔹 POST /jugadores/login */
async function login(req: Request, res: Response) {
  const { email, contraseña } = req.body;

  try {
    const jugador = await em.findOne(Jugador, { email });

    if (!jugador) {
      return res.status(401).json({ message: 'Jugador no encontrado' });
    }

    const contraseñaValida = await bcrypt.compare(contraseña, jugador.contraseña);

    if (!contraseñaValida) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      {
        id: jugador.id,
        nombre: jugador.nombre,
        email: jugador.email,
      },
      process.env.JWT_SECRET || 'clave-segura-del-gestor-torneos-2024',
      { expiresIn: '2h' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
}

/** 🔹 POST /jugadores/registro */
async function register(req: Request, res: Response) {
  try {
    const datos = req.body.sanitizedInput;

    if (!datos.email || !datos.contraseña)
      return res.status(400).json({ message: "Email y contraseña requeridos" });

    const existeJugador = await em.findOne(Jugador, { email: datos.email });
    if (existeJugador)
      return res.status(409).json({ message: "Ya existe un jugador con ese email" });

    const hash = await bcrypt.hash(datos.contraseña, 10);

    const nuevoJugador = em.create(Jugador, {
      ...datos,
      contraseña: hash,
      equipo: null,
      esCapitan: false,
    });

    await em.persistAndFlush(nuevoJugador);

    const token = jwt.sign(
      { id: nuevoJugador.id },
      process.env.JWT_SECRET || 'clave-segura-del-gestor-torneos-2024',
      { expiresIn: "2h" }
    );

    res.status(201).json({ token, id: nuevoJugador.id });
  } catch (error: any) {
    console.error("Error en registro:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
}

/** 🔹 POST /jugadores/forgot-password */
async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  const mensajeGenerico = { message: 'Si el email existe, te enviamos un correo con instrucciones.' };

  try {
    if (!email) return res.status(400).json({ message: 'Email requerido' });

    const jugador = await em.findOne(Jugador, { email });
    if (jugador) {
      const tokenPlano = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(tokenPlano).digest('hex');

      jugador.resetPasswordTokenHash = tokenHash;
      jugador.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
      await em.flush();

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const link = `${frontendUrl}/restablecer-password?token=${tokenPlano}`;

      try {
        await enviarMailRecuperacion(jugador.email, link);
      } catch (mailError) {
        console.error('Error al enviar mail de recuperación:', mailError);
      }
    }

    res.status(200).json(mensajeGenerico);
  } catch (error) {
    console.error('Error en forgotPassword:', error);
    res.status(200).json(mensajeGenerico);
  }
}

/** 🔹 POST /jugadores/reset-password */
async function resetPassword(req: Request, res: Response) {
  try {
    const { token, nuevaContraseña } = req.body;
    if (!token || !nuevaContraseña) {
      return res.status(400).json({ message: 'Token y nueva contraseña requeridos' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const jugador = await em.findOne(Jugador, { resetPasswordTokenHash: tokenHash });

    if (!jugador || !jugador.resetPasswordExpires || jugador.resetPasswordExpires < new Date()) {
      return res.status(400).json({ message: 'Token inválido o expirado' });
    }

    jugador.contraseña = await bcrypt.hash(nuevaContraseña, 10);
    jugador.resetPasswordTokenHash = undefined;
    jugador.resetPasswordExpires = undefined;
    await em.flush();

    res.status(200).json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error en resetPassword:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
}

export {
  sanitizeJugadorInput,
  findAll,
  findOne,
  findByEmail,
  getJugadoresSinEquipo,
  findByAdmin,
  add,
  update,
  transferirCapitania,
  suspender,
  habilitar,
  suspensiones,
  remove,
  register,
  login,
  forgotPassword,
  resetPassword,
};
