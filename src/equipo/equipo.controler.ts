import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { Equipo } from './equipo.entity.js';
import { Jugador } from '../jugador/jugador.entity.js';

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

    const equipo = await em.findOne(Equipo, { id }, { populate: ['jugadores', 'participaciones'] });
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

export { sanitizeEquipoInput, findAll, findOne, add, update, remove };
