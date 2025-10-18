import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { Participacion } from './participacion.entity.js';

const em = orm.em;

// 🔹 Middleware para sanitizar input
function sanitizeParticipacionInput(req: Request, res: Response, next: NextFunction) {
  req.body.sanitizedInput = {
    equipo: req.body.equipo,
    torneo: req.body.torneo,
    fecha_inscripcion: req.body.fecha_inscripcion,
  };

  Object.keys(req.body.sanitizedInput).forEach((k) => {
    if (req.body.sanitizedInput[k] === undefined) delete req.body.sanitizedInput[k];
  });

  next();
}

// 🔹 GET /participaciones
async function findAll(req: Request, res: Response) {
  try {
    const participaciones = await em.find(
      Participacion,
      {},
      { populate: ['equipo', 'torneo'] }
    );
    res.status(200).json({ message: 'found all participaciones', data: participaciones });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

// 🔹 GET /participaciones/:id
async function findOne(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const participacion = await em.findOne(
      Participacion,
      { id },
      { populate: ['equipo', 'torneo', 'partidosLocal', 'partidosVisitante'] }
    );

    if (!participacion)
      return res.status(404).json({ message: 'Participación no encontrada' });

    res.status(200).json({ message: 'found participacion', data: participacion });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

// 🔹 POST /participaciones
async function add(req: Request, res: Response) {
  try {
    const participacion = em.create(Participacion, req.body.sanitizedInput);
    await em.flush();
    res.status(201).json({ message: 'participacion created', data: participacion });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

// 🔹 PUT /participaciones/:id
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

// 🔹 DELETE /participaciones/:id
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
