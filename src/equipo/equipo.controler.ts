import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { Equipo } from './equipo.entity.js';
import { Jugador } from '../jugador/jugador.entity.js';
import { Torneo } from '../torneo/torneo.entity.js';
import { Participacion } from '../participacion/participacion.entity.js';

const em = orm.em;

/** Sanitiza el body */
function sanitizeEquipoInput(req: Request, _res: Response, next: NextFunction) {
  req.body.sanitizedInput = {
    nombreEquipo: req.body.nombreEquipo,
    colorCamiseta: req.body.colorCamiseta,
    idJugador: req.body.idJugador, // 👈 identificamos quién lo crea
  };

  // Elimina claves undefined
  Object.keys(req.body.sanitizedInput).forEach((k) => {
    if (req.body.sanitizedInput[k] === undefined) delete req.body.sanitizedInput[k];
  });

  next();
}

/** GET /equipos */
async function findAll(_req: Request, res: Response) {
  try {
    const equipos = await em.find(Equipo, {}, { populate: ['jugadores', 'participaciones'] });
    res.status(200).json({ message: 'found all equipos', data: equipos });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** GET /equipos/:id */
async function findOne(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const equipo = await em.findOne(Equipo, { id }, {
      populate: [
        'jugadores',
        'participaciones.torneo',
        'participaciones.partidosLocal',
        'participaciones.partidosVisitante'
      ]
    });
    if (!equipo) return res.status(404).json({ message: 'equipo not found' });

    res.status(200).json({ message: 'found equipo', data: equipo });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** POST /equipos */
async function add(req: Request, res: Response) {
  try {
    const { nombreEquipo, colorCamiseta, idJugador } = req.body.sanitizedInput;

    // 1️⃣ Crear el equipo
    const nuevoEquipo = em.create(Equipo, { nombreEquipo, colorCamiseta });
    await em.persistAndFlush(nuevoEquipo);

    // 2️⃣ Buscar el jugador creador
    const jugador = await em.findOne(Jugador, { id: idJugador });

    if (jugador) {
      // Verificar que no tenga ya un equipo
      if (jugador.equipo) {
        return res.status(400).json({ message: 'El jugador ya pertenece a un equipo' });
      }

      // Asignar equipo y marcar como capitán
      jugador.equipo = nuevoEquipo;
      jugador.esCapitan = true;
      await em.flush();
    }

    res.status(201).json({
      message: 'equipo created',
      data: nuevoEquipo,
    });
  } catch (e: any) {
    console.error('Error al crear equipo:', e);
    res.status(500).json({ message: e.message });
  }
}

/** PUT /equipos/:id */
async function update(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const equipoToUpdate = await em.findOne(Equipo, { id });
    if (!equipoToUpdate) return res.status(404).json({ message: 'equipo not found' });

    const data = { ...req.body.sanitizedInput };
    em.assign(equipoToUpdate, data);
    await em.flush();

    res.status(200).json({ message: 'equipo updated', data: equipoToUpdate });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** DELETE /equipos/:id */
async function remove(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const equipo = await em.findOne(Equipo, { id });
    if (!equipo) return res.status(404).json({ message: 'equipo not found' });

    await em.removeAndFlush(equipo);
    res.status(204).end();
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** GET /equipos/estadisticas/:torneoId */
async function getEstadisticas(req: Request, res: Response) {
  try {
    const torneoId = Number(req.params.torneoId);
    if (Number.isNaN(torneoId))
      return res.status(400).json({ message: 'torneoId inválido' });

    // ✅ Filtrar participaciones del torneo activo y traer los partidos completos
    const participaciones = await em.find(
      Participacion,
      { torneo: torneoId },
      {
        populate: [
          'equipo',
          'partidosLocal.torneo',
          'partidosVisitante.torneo',
          'partidosLocal.local',
          'partidosLocal.visitante',
          'partidosVisitante.local',
          'partidosVisitante.visitante',
        ],
      }
    );

    const estadisticas: any[] = [];

    for (const participacion of participaciones) {
      const equipo = participacion.equipo;
      let pj = 0, pg = 0, pe = 0, pp = 0, dg = 0, pts = 0;

      // ✅ Partidos como local
      for (const partido of participacion.partidosLocal) {
        if (partido.torneo.id !== torneoId) continue; // filtrar por torneo
        if (partido.estado_partido === 'Finalizado' || partido.estado_partido === 'finalizado') {
          pj++;
          if (partido.goles_local > partido.goles_visitante) {
            pg++;
            pts += 3;
          } else if (partido.goles_local === partido.goles_visitante) {
            pe++;
            pts += 1;
          } else {
            pp++;
          }
          dg += partido.goles_local - partido.goles_visitante;
        }
      }

      // ✅ Partidos como visitante
      for (const partido of participacion.partidosVisitante) {
        if (partido.torneo.id !== torneoId) continue;
        if (partido.estado_partido === 'Finalizado' || partido.estado_partido === 'finalizado') {
          pj++;
          if (partido.goles_visitante > partido.goles_local) {
            pg++;
            pts += 3;
          } else if (partido.goles_visitante === partido.goles_local) {
            pe++;
            pts += 1;
          } else {
            pp++;
          }
          dg += partido.goles_visitante - partido.goles_local;
        }
      }

      estadisticas.push({
        id: equipo.id,
        nombreEquipo: equipo.nombreEquipo,
        pj,
        pg,
        pe,
        pp,
        dg,
        pts,
        posicion: 0,
      });
    }

    // Ordenar
    estadisticas.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      return b.pj - a.pj;
    });

    // Agregar posición
    estadisticas.forEach((est, index) => {
      est.posicion = index + 1;
    });

    res.status(200).json({ message: 'estadisticas found', data: estadisticas });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

export { sanitizeEquipoInput, findAll, findOne, add, update, remove, getEstadisticas };
