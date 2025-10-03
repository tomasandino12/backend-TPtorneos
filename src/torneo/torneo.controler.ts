import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { Torneo } from './torneo.entity.js';

const em = orm.em;

function sanitizeTorneoInput(req: Request, _res: Response, next: NextFunction) {
  req.body.sanitizedInput = {
    nombreTorneo: req.body.nombreTorneo,
    fechaInicio: req.body.fechaInicio,
    fechaFin: req.body.fechaFin,
    estado: req.body.estado,
    adminTorneo: req.body.adminTorneo, // FK
  };

  Object.keys(req.body.sanitizedInput).forEach((k) => {
    if (req.body.sanitizedInput[k] === undefined) delete req.body.sanitizedInput[k];
  });

  next();
}

async function findAll(_req: Request, res: Response) {
  try {
    const torneos = await em.find(Torneo, {}, { populate: ['adminTorneo', 'partidos', 'participaciones'] });
    res.status(200).json({ message: 'found all torneos', data: torneos });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const torneo = await em.findOne(Torneo, { id }, { populate: ['adminTorneo', 'partidos', 'participaciones'] });
    if (!torneo) return res.status(404).json({ message: 'torneo not found' });

    res.status(200).json({ message: 'found torneo', data: torneo });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

async function add(req: Request, res: Response) {
  try {
    const data = { ...req.body.sanitizedInput };
    const torneo = em.create(Torneo, data);
    await em.persistAndFlush(torneo);

    res.status(201).json({ message: 'torneo created', data: torneo });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

async function update(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const torneoToUpdate = await em.findOne(Torneo, { id });
    if (!torneoToUpdate) return res.status(404).json({ message: 'torneo not found' });

    const data = { ...req.body.sanitizedInput };
    em.assign(torneoToUpdate, data);
    await em.flush();

    res.status(200).json({ message: 'torneo updated', data: torneoToUpdate });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const torneo = await em.findOne(Torneo, { id });
    if (!torneo) return res.status(404).json({ message: 'torneo not found' });

    await em.removeAndFlush(torneo);
    res.status(204).end();
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

export { sanitizeTorneoInput, findAll, findOne, add, update, remove };
