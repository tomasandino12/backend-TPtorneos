import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { Participacion } from './participacion.entity.js';

const em = orm.em;

/** Sanitiza y normaliza el body */
function sanitizeParticipacionInput(req: Request, res: Response, next: NextFunction) {
  req.body.sanitizedInput = {
    fecha_inscripcion: req.body.fecha_inscripcion,
  };

  // elimina keys undefined
  Object.keys(req.body.sanitizedInput).forEach((k) => {
    if (req.body.sanitizedInput[k] === undefined) delete req.body.sanitizedInput[k];
  });

  next();
}

/** GET /participaciones */
async function findAll(req: Request, res: Response) {
  try {
    const participaciones = await em.find(Participacion, {});
    res.status(200).json({ message: 'found all participaciones', data: participaciones });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** GET /participaciones/:equipoId/:torneoId */
async function findOne(req: Request, res: Response) {
  try {
    const equipoId = Number(req.params.equipoId);
    const torneoId = Number(req.params.torneoId);
    if (Number.isNaN(equipoId) || Number.isNaN(torneoId)) return res.status(400).json({ message: 'ids inválidos' });

    const participacion = await em.findOneOrFail(Participacion, { equipo: equipoId, torneo: torneoId });
    res.status(200).json({ message: 'found participacion', data: participacion });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** POST /participacion */
async function add(req: Request, res: Response) {
  try {
    const participacion = em.create(Participacion, req.body.sanitizedInput);
    await em.flush();
    res.status(201).json({ message: 'participacion created', data: participacion });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** PUT /participacion/:equipoId/:torneoId */
async function update(req: Request, res: Response) {
  try {
    const equipoId = Number(req.params.equipoId);
    const torneoId = Number(req.params.torneoId);
    if (Number.isNaN(equipoId) || Number.isNaN(torneoId)) return res.status(400).json({ message: 'ids inválidos' });

    const participacionToUpdate = await em.findOneOrFail(Participacion, { equipo: equipoId, torneo: torneoId });
    em.assign(participacionToUpdate, req.body.sanitizedInput);
    await em.flush();

    res.status(200).json({ message: 'participacion updated', data: participacionToUpdate });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** DELETE /participacion/:equipoId/:torneoId */
async function remove(req: Request, res: Response) {
  try {
    const equipoId = Number(req.params.equipoId);
    const torneoId = Number(req.params.torneoId);

    if (Number.isNaN(equipoId) || Number.isNaN(torneoId)) {
      return res.status(400).json({ message: "ids inválidos" });
    }

    const result = await em.nativeDelete(Participacion, {
      equipo: equipoId,
      torneo: torneoId,
    });

    if (result === 0) {
      return res.status(404).json({ message: "participacion no encontrada" });
    }

    res.status(200).json({ message: "participacion eliminada" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export { sanitizeParticipacionInput, findAll, findOne, add, update, remove };
