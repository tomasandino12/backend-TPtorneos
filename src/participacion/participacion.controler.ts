import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { Participacion } from './participacion.entity.js';

const em = orm.em;

/** Sanitiza y normaliza el body */
function sanitizeParticipacionInput(req: Request, res: Response, next: NextFunction) {
  req.body.sanitizedInput = {
    equipo: req.body.equipo,
    torneo: req.body.torneo,
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
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const participacion = await em.findOneOrFail(Participacion, { id });
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
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const participacionToUpdate = await em.findOneOrFail(Participacion, { id });
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
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const ref = em.getReference(Participacion, id);
        await em.removeAndFlush(ref);
        res.status(200).json({ message: 'participacion deleted' });
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
}

export { sanitizeParticipacionInput, findAll, findOne, add, update, remove };
