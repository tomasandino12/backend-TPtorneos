import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { Cancha } from './cancha.entity.js';

const em = orm.em;

const ESTADOS_VALIDOS = ['activa', 'mantenimiento', 'inactiva'];

/** Sanitiza y normaliza el body */
function sanitizeCanchaInput(req: Request, res: Response, next: NextFunction) {
  req.body.sanitizedInput = {
    nombre: req.body.nombre,
    direccion: req.body.direccion,
    tipoSuperficie: req.body.tipoSuperficie,
    capacidad: req.body.capacidad !== undefined ? Number(req.body.capacidad) : undefined,
    estado: req.body.estado,
    precioPorHora: req.body.precioPorHora !== undefined ? Number(req.body.precioPorHora) : undefined,
    iluminacion: req.body.iluminacion !== undefined ? Boolean(req.body.iluminacion) : undefined,
  };

  // elimina keys undefined
  Object.keys(req.body.sanitizedInput).forEach((k) => {
    if (req.body.sanitizedInput[k] === undefined) delete req.body.sanitizedInput[k];
  });

  if (req.body.sanitizedInput.estado && !ESTADOS_VALIDOS.includes(req.body.sanitizedInput.estado)) {
    return res.status(400).json({
      message: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}`,
    });
  }

  next();
}

/** GET /canchas */
async function findAll(_req: Request, res: Response) {
  try {
    const canchas = await em.find(Cancha, {});
    res.status(200).json({ message: 'found all canchas', data: canchas });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** GET /canchas/:id */
async function findOne(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const cancha = await em.findOneOrFail(Cancha, { id }, { populate: ['partidos'] });
    res.status(200).json({ message: 'found cancha', data: cancha });
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
    return res.status(404).json({ message: 'Cancha no encontrada' });
  }
  res.status(500).json({ message: error.message });
  }
}

/** POST /canchas */
async function add(req: Request, res: Response) {
  try {
    const cancha = em.create(Cancha, req.body.sanitizedInput);
    await em.flush();
    res.status(201).json({ message: 'cancha created', data: cancha });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** PUT /canchas/:id  (o PATCH) */
async function update(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const canchaToUpdate = await em.findOneOrFail(Cancha, { id });
    em.assign(canchaToUpdate, req.body.sanitizedInput);
    await em.flush();

    res.status(200).json({ message: 'cancha updated', data: canchaToUpdate });
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
    return res.status(404).json({ message: 'Cancha no encontrada' });
  }
  res.status(500).json({ message: error.message });
  }
}

/** DELETE /canchas/:id */
async function remove(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const ref = em.getReference(Cancha, id);
    await em.removeAndFlush(ref);
    res.status(200).json({ message: 'cancha deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export { sanitizeCanchaInput, findAll, findOne, add, update, remove };
