import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { Partido } from './partido.entity.js';

const em = orm.em;

/** Sanitiza y normaliza el body */
function sanitizePartidoInput(req: Request, _res: Response, next: NextFunction) {
  req.body.sanitizedInput = {
    fecha_partido: req.body.fecha_partido,
    hora_partido: req.body.hora_partido,
    estado_partido: req.body.estado_partido,
    jornada: req.body.jornada,
    goles_local: req.body.goles_local,
    goles_visitante: req.body.goles_visitante,
    torneo: req.body.torneo,
    cancha: req.body.cancha,
    arbitro: req.body.arbitro,
    local: req.body.local,
    visitante: req.body.visitante,
  };

  Object.keys(req.body.sanitizedInput).forEach((k) => {
    if (req.body.sanitizedInput[k] === undefined) delete req.body.sanitizedInput[k];
  });

  next();
}

/** GET /partidos */
async function findAll(_req: Request, res: Response) {
  try {
    const partidos = await em.find(Partido, {}, { populate: ['cancha'] });
    res.status(200).json({ message: 'found all partidos', data: partidos });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** GET /partidos/:id */
async function findOne(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const partido = await em.findOne(Partido, { id }, { populate: ['cancha'] });
    if (!partido) return res.status(404).json({ message: 'partido not found' });

    res.status(200).json({ message: 'found partido', data: partido });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** POST /partidos */
async function add(req: Request, res: Response) {
  try {
    const data = { ...req.body.sanitizedInput };

    if (!data.torneo || !data.local || !data.visitante || !data.fecha_partido) {
      return res.status(400).json({ error: 'Faltan campos requeridos: torneo, local, visitante, fecha_partido' });
    }

    if (data.local === data.visitante) {
      return res.status(400).json({ error: 'El equipo local y visitante no pueden ser el mismo' });
    }

    const partido = em.create(Partido, data);
    await em.persistAndFlush(partido);

    res.status(201).json({ message: 'partido created', data: partido });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** PUT /partidos/:id */
async function update(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const partidoToUpdate = await em.findOne(Partido, { id });
    if (!partidoToUpdate) return res.status(404).json({ message: 'partido not found' });

    const data = { ...req.body.sanitizedInput };
    em.assign(partidoToUpdate, data);
    await em.flush();

    res.status(200).json({ message: 'partido updated', data: partidoToUpdate });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** DELETE /partidos/:id */
async function remove(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const partido = await em.findOne(Partido, { id });
    if (!partido) return res.status(404).json({ message: 'partido not found' });

    await em.removeAndFlush(partido);
    res.status(204).end();
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** GET /partidos/programados */
async function findProgramados(_req: Request, res: Response) {
  try {
    const partidos = await em.find(
      Partido,
      { estado_partido: { $like: 'programado' } },
      {
        populate: ['cancha', 'local.equipo', 'visitante.equipo', 'arbitro'],
        orderBy: { fecha_partido: 'ASC' },
      }
    );
    res.status(200).json({ message: 'found programados partidos', data: partidos });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** 🔹 PATCH /partidos/:id/resultado — carga el resultado de un partido.
 * Solo el admin dueño del torneo puede hacerlo, y solo mientras el torneo
 * está "en_curso" (no tiene sentido cargar resultados de un torneo que
 * todavía no arrancó o que ya cerró). goles_local/goles_visitante tienen que
 * ser enteros >= 0. Marca el partido como 'finalizado' — el mismo valor que
 * ya esperaban getEstadisticasTorneo/calcularEstadisticas (equipo.controler.ts)
 * y las pantallas de estadísticas del jugador; antes este endpoint usaba
 * 'jugado', que ningún otro lugar del código leía. */
async function actualizarResultado(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const partido = await em.findOne(Partido, { id }, { populate: ['torneo.adminTorneo'] });
    if (!partido) return res.status(404).json({ message: 'Partido no encontrado' });

    if (req.user?.rol !== 'admin' || partido.torneo.adminTorneo?.id !== req.user?.id) {
      return res.status(403).json({ message: 'No sos el administrador dueño de este torneo' });
    }

    if (partido.torneo.estado !== 'en_curso') {
      return res.status(400).json({ message: 'Solo se puede cargar el resultado de un partido de un torneo en curso' });
    }

    if (new Date(partido.fecha_partido) > new Date()) {
      return res.status(400).json({ message: 'No se puede cargar el resultado de un partido que todavía no se jugó' });
    }

    if (partido.estado_partido === 'finalizado' && req.body.confirmarReedicion !== true) {
      return res.status(409).json({
        message: `Este partido ya tiene un resultado cargado (${partido.goles_local}-${partido.goles_visitante}). Confirmá para sobreescribirlo.`,
        data: { goles_local: partido.goles_local, goles_visitante: partido.goles_visitante },
      });
    }

    const golesLocal = Number(req.body.goles_local);
    const golesVisitante = Number(req.body.goles_visitante);
    const esEnteroNoNegativo = (v: number) => Number.isInteger(v) && v >= 0;

    if (!esEnteroNoNegativo(golesLocal) || !esEnteroNoNegativo(golesVisitante)) {
      return res.status(400).json({ message: 'goles_local y goles_visitante deben ser números enteros no negativos' });
    }

    partido.goles_local = golesLocal;
    partido.goles_visitante = golesVisitante;
    partido.estado_partido = 'finalizado';
    partido.walkover = false; // un resultado cargado a mano deja de ser W.O., aunque lo hubiera sido antes
    await em.flush();

    res.status(200).json({ message: 'Resultado cargado', data: partido });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

async function getPartidosPorTorneo(req: Request, res: Response) {
  try {
    const torneoId = Number(req.params.id);
    if (isNaN(torneoId)) {
      return res.status(400).json({ message: "ID de torneo inválido." });
    }

    const partidos = await em.find(
      Partido,
      { torneo: torneoId },
      {
        populate: ["local.equipo", "visitante.equipo", "cancha", "torneo", "arbitro"],
        orderBy: { fecha_partido: "ASC" },
      }
    );

    if (!partidos.length) {
      return res.status(200).json({ message: "No hay partidos para este torneo.", data: [] });
    }

    return res.status(200).json({ message: "found partidos por torneo", data: partidos });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al obtener los partidos del torneo." });
  }
}




export { sanitizePartidoInput, findAll, findOne, add, update, remove, findProgramados, getPartidosPorTorneo, actualizarResultado };


