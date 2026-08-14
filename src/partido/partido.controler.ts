import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { Partido } from './partido.entity.js';

const em = orm.em;

/** Formatea una fecha como DD/MM/AAAA para mensajes de error legibles —
 * mismo formato que participacion.controler.ts. */
function formatFecha(fecha: Date): string {
  const d = new Date(fecha);
  // Ver el comentario equivalente en participacion.controler.ts: getUTC* en
  // vez de los getters locales, para no retroceder un día en husos horarios
  // negativos respecto a UTC.
  const dia = String(d.getUTCDate()).padStart(2, '0');
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${d.getUTCFullYear()}`;
}

/** Combina la parte de fecha de `fecha` con la hora de `hora` ("HH:MM" o
 * "HH:MM:SS") en un único Date comparable — para saber si un partido "ya
 * pasó" hace falta la fecha Y la hora juntas, no solo el día. */
function combinarFechaHora(fecha: Date, hora: string): Date {
  const [horas, minutos] = hora.split(':').map(Number);
  const combinado = new Date(fecha);
  combinado.setHours(horas, minutos, 0, 0);
  return combinado;
}

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
 * Se puede cargar/modificar SIEMPRE, sin importar la fecha del partido ni el
 * estado del torneo — la única restricción de acceso es que quien llama sea
 * el admin dueño del torneo (más el chequeo de "ya tiene resultado, confirmá
 * para sobreescribir" de más abajo, que es una protección aparte, no un
 * bloqueo por fecha/estado). goles_local/goles_visitante tienen que ser
 * enteros >= 0. Marca el partido como 'finalizado' — el mismo valor que ya
 * esperaban getEstadisticasTorneo/calcularEstadisticas (equipo.controler.ts)
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

/** 🔹 PATCH /partidos/:id/programacion — reprograma fecha y horario de un
 * partido. Mismo criterio de acceso que actualizarResultado: solo el admin
 * dueño del torneo, y solo mientras el torneo está "en_curso".
 *
 * La programación queda bloqueada si se cumple CUALQUIERA de estas dos
 * condiciones (no una en reemplazo de la otra):
 *  - el partido ya está 'finalizado' (tiene resultado cargado), o
 *  - su fecha+hora ya pasó (aunque nadie haya cargado el resultado todavía).
 * Un partido finalizado con fecha futura (podría pasar si se cargó el
 * resultado antes de tiempo) igual queda bloqueado: ya se jugó en los
 * hechos, no tiene sentido reprogramarlo.
 *
 * La NUEVA fecha/hora propuesta, en cambio, tiene que ser hoy o futura —
 * validación aparte, sobre el valor que se está por guardar, no sobre el
 * valor actual del partido.
 *
 * Árbitro y Cancha son recursos GLOBALES (un mismo Arbitro/Cancha puede estar
 * asignado a varios torneos a la vez, no hay exclusividad por torneo — ver
 * TorneoArbitro/TorneoCancha), así que el chequeo de doble-reserva es contra
 * TODOS los partidos del sistema, no solo los de este torneo. */
async function actualizarProgramacion(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const partido = await em.findOne(
      Partido,
      { id },
      { populate: ['torneo.adminTorneo', 'arbitro', 'cancha'] }
    );
    if (!partido) return res.status(404).json({ message: 'Partido no encontrado' });

    if (req.user?.rol !== 'admin' || partido.torneo.adminTorneo?.id !== req.user?.id) {
      return res.status(403).json({ message: 'No sos el administrador dueño de este torneo' });
    }

    if (partido.torneo.estado !== 'en_curso') {
      return res.status(400).json({ message: 'Solo se puede reprogramar un partido de un torneo en curso' });
    }

    if (partido.estado_partido === 'finalizado') {
      return res.status(400).json({ message: 'No se puede reprogramar un partido que ya fue jugado' });
    }

    if (combinarFechaHora(partido.fecha_partido, partido.hora_partido) < new Date()) {
      return res.status(400).json({ message: 'No se puede reprogramar un partido cuya fecha y hora ya pasaron' });
    }

    const { fecha_partido, hora_partido } = req.body;
    if (!fecha_partido || !hora_partido) {
      return res.status(400).json({ message: 'fecha_partido y hora_partido son obligatorios' });
    }

    const nuevaFecha = new Date(fecha_partido);
    if (Number.isNaN(nuevaFecha.getTime())) {
      return res.status(400).json({ message: 'fecha_partido inválida' });
    }
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(hora_partido)) {
      return res.status(400).json({ message: 'hora_partido inválida (formato HH:MM)' });
    }

    if (combinarFechaHora(nuevaFecha, hora_partido) < new Date()) {
      return res.status(400).json({ message: 'No se puede programar un partido en una fecha u horario ya pasado.' });
    }

    const conflictoArbitro = await em.findOne(
      Partido,
      { id: { $ne: id }, arbitro: partido.arbitro.id, fecha_partido: nuevaFecha, hora_partido },
      { populate: ['local.equipo', 'visitante.equipo'] }
    );
    if (conflictoArbitro) {
      const local = conflictoArbitro.local?.equipo?.nombreEquipo ?? 'Local';
      const visitante = conflictoArbitro.visitante?.equipo?.nombreEquipo ?? 'Visitante';
      return res.status(409).json({
        message: `Este árbitro ya tiene asignado el partido "${local} vs ${visitante}" el ${formatFecha(nuevaFecha)} a las ${hora_partido}.`,
      });
    }

    const conflictoCancha = await em.findOne(
      Partido,
      { id: { $ne: id }, cancha: partido.cancha.id, fecha_partido: nuevaFecha, hora_partido },
      { populate: ['local.equipo', 'visitante.equipo'] }
    );
    if (conflictoCancha) {
      const local = conflictoCancha.local?.equipo?.nombreEquipo ?? 'Local';
      const visitante = conflictoCancha.visitante?.equipo?.nombreEquipo ?? 'Visitante';
      return res.status(409).json({
        message: `Esta cancha ya tiene asignado el partido "${local} vs ${visitante}" el ${formatFecha(nuevaFecha)} a las ${hora_partido}.`,
      });
    }

    partido.fecha_partido = nuevaFecha;
    partido.hora_partido = hora_partido;
    await em.flush();

    res.status(200).json({ message: 'Fecha y horario actualizados', data: partido });
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




export { sanitizePartidoInput, findAll, findOne, add, update, remove, findProgramados, getPartidosPorTorneo, actualizarResultado, actualizarProgramacion };


