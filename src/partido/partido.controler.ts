import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { Partido } from './partido.entity.js';
import { Cancha } from '../cancha/cancha.entity.js';
import { torneoRouter } from '../torneo/torneo.routes.js';

const em = orm.em;

/** Sanitiza y normaliza el body */
function sanitizePartidoInput(req: Request, _res: Response, next: NextFunction) {
  req.body.sanitizedInput = {
    fecha_partido: req.body.fecha_partido,
    hora_partido: req.body.hora_partido,
    estado_partido: req.body.estado_partido,
    jornada: req.body.jornada,
    goles_local: req.body.goles_local,
    goles_visitante: req.body.goles_visitante,
    torneo: req.body.torneo,
    cancha: req.body.cancha,
    arbitro: req.body.arbitro,
    local: req.body.local,
    visitante: req.body.visitante,
  };

  Object.keys(req.body.sanitizedInput).forEach((k) => {
    if (req.body.sanitizedInput[k] === undefined) delete req.body.sanitizedInput[k];
  });

  next();
}

/** GET /partidos */
async function findAll(_req: Request, res: Response) {
  try {
    const partidos = await em.find(Partido, {}, { populate: ['cancha'] });
    res.status(200).json({ message: 'found all partidos', data: partidos });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** GET /partidos/:id */
async function findOne(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const partido = await em.findOne(Partido, { id }, { populate: ['cancha'] });
    if (!partido) return res.status(404).json({ message: 'partido not found' });

    res.status(200).json({ message: 'found partido', data: partido });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** POST /partidos */
async function add(req: Request, res: Response) {
  try {
    const data = { ...req.body.sanitizedInput };

    if (data.canchaId !== undefined) {
      data.cancha = em.getReference(Cancha, Number(data.canchaId));
      delete data.canchaId;
    }

    const partido = em.create(Partido, data);
    await em.persistAndFlush(partido);

    res.status(201).json({ message: 'partido created', data: partido });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** PUT /partidos/:id */
async function update(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const partidoToUpdate = await em.findOne(Partido, { id });
    if (!partidoToUpdate) return res.status(404).json({ message: 'partido not found' });

    const data = { ...req.body.sanitizedInput };
    if (data.canchaId !== undefined) {
      data.cancha = em.getReference(Cancha, Number(data.canchaId));
      delete data.canchaId;
    }

    em.assign(partidoToUpdate, data);
    await em.flush();

    res.status(200).json({ message: 'partido updated', data: partidoToUpdate });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** DELETE /partidos/:id */
async function remove(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const partido = await em.findOne(Partido, { id });
    if (!partido) return res.status(404).json({ message: 'partido not found' });

    await em.removeAndFlush(partido);
    res.status(204).end();
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** GET /partidos/programados */
async function findProgramados(_req: Request, res: Response) {
  try {
    const partidos = await em.find(Partido, { estado_partido: 'programado' }, {
      populate: ['cancha', 'local.equipo', 'visitante.equipo', 'arbitro']
    });
    res.status(200).json({ message: 'found programados partidos', data: partidos });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

async function getPartidosPorTorneo(req: Request, res: Response) {
  try {
    const torneoId = Number(req.params.id);
    if (isNaN(torneoId)) {
      return res.status(400).json({ message: "ID de torneo inválido." });
    }

    const partidos = await em.find(
      Partido,
      { torneo: torneoId },
      {
        populate: ["local.equipo", "visitante.equipo", "cancha", "torneo"],
        orderBy: { fecha_partido: "ASC" },
      }
    );

    if (!partidos.length) {
      return res
        .status(404)
        .json({ message: "No se encontraron partidos para este torneo." });
    }

    return res.status(200).json({ data: partidos });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Error al obtener los partidos del torneo." });
  }
}




export { sanitizePartidoInput, findAll, findOne, add, update, remove, findProgramados,  getPartidosPorTorneo};


