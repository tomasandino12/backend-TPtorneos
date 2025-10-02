import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { Equipo } from './equipo.entity.js';

const em = orm.em;

function sanitizeEquipoInput(req: Request, _res: Response, next: NextFunction) {
  req.body.sanitizedInput = {
    nombreEquipo: req.body.nombreEquipo,
    colorCamiseta: req.body.colorCamiseta,
  };

  Object.keys(req.body.sanitizedInput).forEach((k) => {
    if (req.body.sanitizedInput[k] === undefined) delete req.body.sanitizedInput[k];
  });

  next();
}

async function findAll(_req: Request, res: Response) {
  try {
    const equipos = await em.find(Equipo, {}, { populate: ['jugadores', 'torneos'] });
    res.status(200).json({ message: 'found all equipos', data: equipos });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const equipo = await em.findOne(Equipo, { id }, { populate: ['jugadores', 'torneos'] });
    if (!equipo) return res.status(404).json({ message: 'equipo not found' });

    res.status(200).json({ message: 'found equipo', data: equipo });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

async function add(req: Request, res: Response) {
  try {
    const data = { ...req.body.sanitizedInput };
    const equipo = em.create(Equipo, data);
    await em.persistAndFlush(equipo);

    res.status(201).json({ message: 'equipo created', data: equipo });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

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

export { sanitizeEquipoInput, findAll, findOne, add, update, remove };
