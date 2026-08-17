import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { Participacion } from './participacion.entity.js';
import { Equipo } from '../equipo/equipo.entity.js';
import { Torneo } from '../torneo/torneo.entity.js';

const em = orm.em;

/** Formatea una fecha como DD/MM/AAAA para mensajes de error legibles. */
function formatFecha(fecha: Date): string {
  const d = new Date(fecha);
  // getUTCDate/getUTCMonth/getUTCFullYear, no getDate/getMonth/getFullYear:
  // las fechas de torneo/participación se guardan como medianoche UTC, y con
  // los getters en hora local esto retrocedía un día en cualquier entorno con
  // huso horario negativo respecto a UTC (bug real, detectado porque hacía
  // fallar un test de integración con la fecha "un día antes" de la esperada).
  const dia = String(d.getUTCDate()).padStart(2, '0');
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${d.getUTCFullYear()}`;
}

/** Dos torneos se superponen si el inicio de cada uno cae antes (o el mismo
 * día) que el fin del otro. Fórmula estándar de solapamiento de rangos. */
function seSuperponen(a: { fechaInicio: Date; fechaFin: Date }, b: { fechaInicio: Date; fechaFin: Date }): boolean {
  return a.fechaInicio <= b.fechaFin && b.fechaInicio <= a.fechaFin;
}

/** Regla 3 (misma fórmula que torneo.controler.ts): duración mínima = 7 días
 * × cantidad REAL de equipos. `cantidadEquiposReal` tiene que ser el conteo
 * de participaciones en el momento de la validación (acá, +1 por el equipo
 * que se está por agregar y todavía no está persistido) — nunca
 * `Torneo.cantidadEquipos`, que es solo el cupo máximo declarado. */
function validarDuracionMinima(fechaInicio: Date, fechaFin: Date, cantidadEquiposReal: number): string | null {
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  const dias = Math.round((fechaFin.getTime() - fechaInicio.getTime()) / MS_POR_DIA);
  const minimoRequerido = 7 * cantidadEquiposReal;
  if (dias < minimoRequerido) {
    return `La duración del torneo (${dias} día(s)) es menor a la mínima requerida: 7 días × ${cantidadEquiposReal} equipos = ${minimoRequerido} día(s).`;
  }
  return null;
}

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

    // Validación 3: el equipo no puede estar inscripto en otro torneo cuyas
    // fechas se superpongan con las de este (sin importar el estado de ese
    // otro torneo — a diferencia de la validación 2, que solo mira "en_curso").
    const participacionesDelEquipo = await em.find(
      Participacion,
      { equipo: equipoId, torneo: { $ne: torneoId } },
      { populate: ['torneo'] }
    );
    const conflicto = participacionesDelEquipo.find((p) => seSuperponen(p.torneo, torneo));
    if (conflicto) {
      const otroTorneo = conflicto.torneo as any;
      return res.status(409).json({
        message: `El equipo ya está inscripto en "${otroTorneo.nombreTorneo}", que finaliza el ${formatFecha(otroTorneo.fechaFin)}, y sus fechas se superponen con las de este torneo (inicia el ${formatFecha(torneo.fechaInicio)}).`,
      });
    }

    // Validación 4: no exceder el cupo máximo de equipos del torneo. No puede
    // depender solo del frontend (que además calcula "cupos restantes" pero
    // no lo usaba para bloquear la selección) — sin esto, pegándole directo
    // al endpoint se podía inscribir de más.
    const equiposActuales = await em.count(Participacion, { torneo: torneoId });
    if (equiposActuales >= torneo.cantidadEquipos) {
      return res.status(409).json({
        message: `El torneo ya alcanzó su cupo máximo de ${torneo.cantidadEquipos} equipo(s).`,
      });
    }

    // Validación 5 (Regla 3): la duración fija del torneo (fechaInicio/fechaFin
    // no cambian acá) tiene que alcanzar para 7 días × cada equipo ya inscripto
    // MÁS este que se está por agregar (+1, porque todavía no está persistido).
    const errorDuracion = validarDuracionMinima(torneo.fechaInicio, torneo.fechaFin, equiposActuales + 1);
    if (errorDuracion) {
      return res.status(400).json({ message: errorDuracion });
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
