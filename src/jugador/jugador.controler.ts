/*CODIGO NUEVO ADAPTADO A MIKROORM*/
import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { Jugador } from './Jugador.entity.js';

const em = orm.em;

/** Sanitiza y normaliza el body */
function sanitizeJugadorInput(req: Request, res: Response, next: NextFunction) {
  req.body.sanitizedInput = {
    nombre: req.body.nombre,
    apellido: req.body.apellido,
    dni: req.body.dni,
    email: req.body.email,
    fechaNacimiento: req.body.fechaNacimiento,
    posicion: req.body.posicion,
  };

  // elimina keys undefined
  Object.keys(req.body.sanitizedInput).forEach((k) => {
    if (req.body.sanitizedInput[k] === undefined) delete req.body.sanitizedInput[k];
  });

  next();
}

/** GET /jugadores */
async function findAll(req: Request, res: Response) {
  try {
    const jugadores = await em.find(Jugador, {});
    res.status(200).json({ message: 'found all jugadores', data: jugadores });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** GET /jugadores/:id */
async function findOne(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const jugador = await em.findOneOrFail(Jugador, { id });
    res.status(200).json({ message: 'found jugador', data: jugador });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** POST /jugadores */
async function add(req: Request, res: Response) {
  try {
    const jugador = em.create(Jugador, req.body.sanitizedInput);
    await em.flush();
    res.status(201).json({ message: 'jugador created', data: jugador });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** PUT /jugadores/:id */
async function update(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const jugadorToUpdate = await em.findOneOrFail(Jugador, { id });
    em.assign(jugadorToUpdate, req.body.sanitizedInput);
    await em.flush();

    res.status(200).json({ message: 'jugador updated', data: jugadorToUpdate });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** DELETE /jugadores/:id */
async function remove(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const ref = em.getReference(Jugador, id);
    await em.removeAndFlush(ref);
    res.status(200).json({ message: 'jugador deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export { sanitizeJugadorInput, findAll, findOne, add, update, remove };

