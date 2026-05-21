import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { Participacion } from './participacion.entity.js';
import { Equipo } from '../equipo/equipo.entity.js';
import { Torneo } from '../torneo/torneo.entity.js';

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
    const equipoId = Number(req.body.sanitizedInput.equipo);
    const torneoId = Number(req.body.sanitizedInput.torneo);

    const equipo = await em.findOne(Equipo, { id: equipoId });
    if (!equipo) return res.status(404).json({ message: 'Equipo no encontrado' });

    const torneo = await em.findOne(Torneo, { id: torneoId });
    if (!torneo) return res.status(404).json({ message: 'Torneo no encontrado' });

    // Validación 1: categoría del equipo coincide con la del torneo
    if (equipo.categoria !== torneo.categoria) {
      return res.status(400).json({
        message: `La categoría del equipo (${equipo.categoria}) no coincide con la categoría del torneo (${torneo.categoria})`,
      });
    }

    // Validación 2: el equipo no está en un torneo activo
    const participacionActiva = await em.findOne(
      Participacion,
      { equipo: equipoId, torneo: { estado: 'en_curso' } },
      { populate: ['torneo'] }
    );
    if (participacionActiva) {
      return res.status(409).json({
        message: `El equipo ya está participando en el torneo activo "${(participacionActiva.torneo as any).nombreTorneo}"`,
      });
    }

    const participacion = em.create(Participacion, req.body.sanitizedInput);
    await em.persistAndFlush(participacion);
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
