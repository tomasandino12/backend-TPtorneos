import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { Arbitro } from './arbitro.entity.js';

const em = orm.em;

/** Sanitiza y normaliza el body */
function sanitizeArbitroInput(req: Request, res: Response, next: NextFunction) {
  req.body.sanitizedInput = {
    nombre: req.body.nombre,
    apellido: req.body.apellido,
    nro_matricula: req.body.nro_matricula,
    email: req.body.email,
  };

  Object.keys(req.body.sanitizedInput).forEach((k) => {
    if (req.body.sanitizedInput[k] === undefined) delete req.body.sanitizedInput[k];
  });

  next();
}

/** GET /arbitros */
async function findAll(req: Request, res: Response) {
  try {
    const arbitros = await em.find(Arbitro, {});
    res.status(200).json({ message: 'found all arbitros', data: arbitros });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** GET /arbitros/:id */
async function findOne(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const arbitro = await em.findOneOrFail(Arbitro, { id });
    res.status(200).json({ message: 'found arbitro', data: arbitro });
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      return res.status(404).json({ message: 'Árbitro no encontrado' });
    }
    res.status(500).json({ message: error.message });
  }
}

/** POST /arbitros */
async function add(req: Request, res: Response) {
  try {
    const arbitro = em.create(Arbitro, req.body.sanitizedInput);
    await em.flush();
    res.status(201).json({ message: 'arbitro created', data: arbitro });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** PUT /arbitros/:id */
async function update(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const arbitroToUpdate = await em.findOneOrFail(Arbitro, { id });
    em.assign(arbitroToUpdate, req.body.sanitizedInput);
    await em.flush();

    res.status(200).json({ message: 'arbitro updated', data: arbitroToUpdate });
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      return res.status(404).json({ message: 'Árbitro no encontrado' });
    }
    res.status(500).json({ message: error.message });
  }
}

/** DELETE /arbitros/:id */
async function remove(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const ref = em.getReference(Arbitro, id);
    await em.removeAndFlush(ref);
    res.status(200).json({ message: 'arbitro deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export { sanitizeArbitroInput, findAll, findOne, add, update, remove };
