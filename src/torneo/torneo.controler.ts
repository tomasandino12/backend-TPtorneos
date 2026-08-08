import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { Torneo } from './torneo.entity.js';
import { Participacion } from '../participacion/participacion.entity.js';
import { Partido } from '../partido/partido.entity.js';
import { TorneoArbitro } from '../torneoArbitro/torneoArbitro.entity.js';
import { TorneoCancha } from '../torneoCancha/torneoCancha.entity.js';
import { Arbitro } from '../arbitro/arbitro.entity.js';
import { Cancha } from '../cancha/cancha.entity.js';
import { Notificacion } from '../notificacion/notificacion.entity.js';
import { Suspension } from '../suspension/suspension.entity.js';

const em = orm.em;

/** Devuelve un { status, message } si el admin autenticado (req.user) no es el
 * dueño de este torneo, o null si puede operar sobre él. JWT-driven: nunca
 * confía en un dato de la URL/body para decidir "quién sos" — mismo patrón
 * que expulsar()/formaciones (ver docs/backend/glosario.md). */
function verificarAdminDueño(torneo: Torneo, req: Request): { status: number; message: string } | null {
  if (req.user?.rol !== 'admin') {
    return { status: 403, message: 'Solo un administrador de torneo puede realizar esta acción' };
  }
  if (torneo.adminTorneo?.id !== req.user?.id) {
    return { status: 403, message: 'No sos el administrador dueño de este torneo' };
  }
  return null;
}

/** Regla 3: duración mínima = 7 días × cantidad de equipos. IMPORTANTE: el
 * tercer parámetro tiene que ser el conteo REAL de equipos a validar en ese
 * momento (participaciones.length, +1 si se está por agregar uno nuevo que
 * todavía no está persistido) — nunca `Torneo.cantidadEquipos`, que es solo
 * el cupo máximo declarado y puede desincronizarse de la realidad (llegó a
 * quedar en 0 con 12 equipos ya inscriptos). Devuelve un mensaje de error si
 * no se cumple, o null si la duración es válida. */
function validarDuracionMinima(fechaInicio: Date, fechaFin: Date, cantidadEquiposReal: number): string | null {
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  const dias = Math.round((fechaFin.getTime() - fechaInicio.getTime()) / MS_POR_DIA);
  const minimoRequerido = 7 * cantidadEquiposReal;
  if (dias < minimoRequerido) {
    return `La duración del torneo (${dias} día(s)) es menor a la mínima requerida: 7 días × ${cantidadEquiposReal} equipos = ${minimoRequerido} día(s).`;
  }
  return null;
}

/** Dos rangos de fechas se superponen si el inicio de cada uno cae antes (o
 * el mismo día) que el fin del otro — misma fórmula que participacion.controler.ts. */
function seSuperponen(a: { fechaInicio: Date; fechaFin: Date }, b: { fechaInicio: Date; fechaFin: Date }): boolean {
  return a.fechaInicio <= b.fechaFin && b.fechaInicio <= a.fechaFin;
}

interface ConflictoFecha {
  participacionId: number;
  equipoId: number;
  equipoNombre: string;
  torneoConflictoId: number;
  torneoConflictoNombre: string;
}

/** Regla 2 (generalizada): para cada equipo participante de `torneo`, busca
 * sus OTRAS participaciones en torneos "borrador"/"inscripcion" cuyas fechas
 * se superponen con `ventana`. `ventana` puede ser la fecha_fin ya persistida
 * del torneo (activación) o una fecha_fin todavía no guardada (preview/
 * confirmación de extensión) — no muta nada. */
async function buscarConflictosDeSuperposicion(
  txEm: typeof em,
  torneo: Torneo,
  ventana: { fechaInicio: Date; fechaFin: Date }
): Promise<ConflictoFecha[]> {
  const participaciones = await txEm.find(Participacion, { torneo: torneo.id }, { populate: ['equipo'] });
  const conflictos: ConflictoFecha[] = [];

  for (const participacion of participaciones) {
    const otras = await txEm.find(
      Participacion,
      {
        equipo: participacion.equipo.id,
        $and: [{ torneo: { $ne: torneo.id } }, { torneo: { estado: { $in: ['borrador', 'inscripcion'] } } }],
      },
      { populate: ['torneo'] }
    );
    for (const otra of otras) {
      if (seSuperponen(ventana, otra.torneo)) {
        conflictos.push({
          participacionId: otra.id!,
          equipoId: participacion.equipo.id!,
          equipoNombre: participacion.equipo.nombreEquipo,
          torneoConflictoId: otra.torneo.id!,
          torneoConflictoNombre: otra.torneo.nombreTorneo,
        });
      }
    }
  }
  return conflictos;
}

/** Borra las participaciones en conflicto (Regla 2) y deja constancia en el
 * log del servidor de cada remoción automática — no hay sistema de auditoría
 * al que engancharse en este proyecto todavía. */
async function removerParticipacionesEnConflicto(txEm: typeof em, conflictos: ConflictoFecha[]): Promise<void> {
  for (const c of conflictos) {
    await txEm.nativeDelete(Participacion, { id: c.participacionId });
    console.log(
      `[Regla 2] Equipo "${c.equipoNombre}" (id ${c.equipoId}) removido automáticamente de "${c.torneoConflictoNombre}" (torneo ${c.torneoConflictoId}) por superposición de fechas.`
    );
  }
}

function sanitizeTorneoInput(req: Request, res: Response, next: NextFunction) {
  req.body.sanitizedInput = {
    nombreTorneo: req.body.nombreTorneo,
    fechaInicio: req.body.fechaInicio,
    fechaFin: req.body.fechaFin,
    estado: req.body.estado,
    formato: req.body.formato,
    cantidadEquipos: req.body.cantidadEquipos,
    categoria: req.body.categoria,
    adminTorneo: req.body.adminTorneo, // FK
  };

  const categoriasValidas = ['sub15', 'sub17', 'mayores', 'veteranos', 'femenino'];
  if (req.body.sanitizedInput.categoria && !categoriasValidas.includes(req.body.sanitizedInput.categoria)) {
    return res.status(400).json({ message: `Categoría inválida. Valores permitidos: ${categoriasValidas.join(', ')}` });
  }

  const estadosValidos = ['borrador', 'inscripcion', 'en_curso', 'finalizado'];
  if (req.body.sanitizedInput.estado && !estadosValidos.includes(req.body.sanitizedInput.estado)) {
    return res.status(400).json({ message: `Estado inválido. Valores permitidos: ${estadosValidos.join(', ')}` });
  }

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

/** 🔹 POST /torneo — el admin autenticado crea el torneo a su propio nombre
 * (adminTorneo se resuelve siempre de req.user, nunca del body). */
async function add(req: Request, res: Response) {
  try {
    if (req.user?.rol !== 'admin') {
      return res.status(403).json({ message: 'Solo un administrador de torneo puede crear torneos' });
    }

    const data = { ...req.body.sanitizedInput, adminTorneo: req.user.id };

    // Regla 3 NO se valida acá: un torneo recién creado tiene 0 equipos
    // inscriptos por definición (todavía no existe ni tiene id), así que
    // validar contra el conteo real siempre daría mínimo 0 días — no hay
    // nada sensato que chequear hasta que empiecen a inscribirse equipos
    // (ver participacion.controler.ts add(), que sí la valida en cada alta).

    const torneo = em.create(Torneo, data);
    await em.persistAndFlush(torneo);

    res.status(201).json({ message: 'torneo created', data: torneo });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** 🔹 PUT|PATCH /torneo/:id — con el torneo "en_curso", solo se permite tocar
 * nombreTorneo y estado acá; fechaFin tiene su propio endpoint dedicado
 * (PATCH /torneo/:id/fecha-fin) porque extenderla puede disparar la Regla 2.
 * Si este update hace pasar el torneo a "en_curso" (sea porque lo activa a
 * mano o por cualquier otro camino que no sea generarFixture), también
 * dispara la Regla 2 dentro de la misma transacción. */
async function update(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const torneoToUpdate = await em.findOne(Torneo, { id }, { populate: ['adminTorneo'] });
    if (!torneoToUpdate) return res.status(404).json({ message: 'torneo not found' });

    const errorAuth = verificarAdminDueño(torneoToUpdate, req);
    if (errorAuth) return res.status(errorAuth.status).json({ message: errorAuth.message });

    const data = { ...req.body.sanitizedInput };

    if (torneoToUpdate.estado === 'en_curso') {
      const bloqueados = ['fechaInicio', 'categoria', 'formato', 'cantidadEquipos'].filter(
        (campo) => (data as any)[campo] !== undefined
      );
      if (bloqueados.length > 0) {
        return res.status(400).json({ message: `Con el torneo en curso no se pueden modificar: ${bloqueados.join(', ')}.` });
      }
      if (data.fechaFin !== undefined) {
        return res.status(400).json({
          message: 'Para extender la fecha de fin de un torneo en curso usá PATCH /torneo/:id/fecha-fin (revisa conflictos con otros torneos antes de aplicar).',
        });
      }
    }

    // Solo se re-valida la duración si fechaInicio o fechaFin cambian —
    // cantidadEquipos ya no participa de este cálculo (Regla 3 usa el
    // conteo real de participaciones, no el cupo declarado).
    if (data.fechaInicio !== undefined || data.fechaFin !== undefined) {
      const fechaInicioEfectiva = data.fechaInicio ? new Date(data.fechaInicio) : torneoToUpdate.fechaInicio;
      const fechaFinEfectiva = data.fechaFin ? new Date(data.fechaFin) : torneoToUpdate.fechaFin;
      const equiposReales = await em.count(Participacion, { torneo: id });

      const errorDuracion = validarDuracionMinima(fechaInicioEfectiva, fechaFinEfectiva, equiposReales);
      if (errorDuracion) return res.status(400).json({ message: errorDuracion });
    }

    const activandose = data.estado === 'en_curso' && torneoToUpdate.estado !== 'en_curso';

    const resultado = await em.transactional(async (txEm) => {
      const torneoTx = await txEm.findOneOrFail(Torneo, { id });
      txEm.assign(torneoTx, data);
      await txEm.flush();

      let conflictos: ConflictoFecha[] = [];
      if (activandose) {
        conflictos = await buscarConflictosDeSuperposicion(txEm, torneoTx, {
          fechaInicio: torneoTx.fechaInicio,
          fechaFin: torneoTx.fechaFin,
        });
        await removerParticipacionesEnConflicto(txEm, conflictos);
      }
      return { torneo: torneoTx, conflictos };
    });

    res.status(200).json({
      message: resultado.conflictos.length > 0
        ? `Torneo actualizado. Se removieron ${resultado.conflictos.length} equipo(s) de otros torneos por superposición de fechas.`
        : 'torneo updated',
      data: { torneo: resultado.torneo, equiposRemovidos: resultado.conflictos },
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** 🔹 DELETE /torneo/:id — borrado en cascada. Un Torneo no se puede borrar
 * directo (Partido/Participacion/Notificacion/Suspension/TorneoArbitro/
 * TorneoCancha lo referencian con FK RESTRICT), así que primero se limpia
 * todo lo que depende de él, en el orden que exige la integridad referencial
 * (Partido antes que Participacion porque Partido.local/visitante apuntan a
 * Participacion), y recién al final el Torneo. Todo dentro de una única
 * transacción: si cualquier paso falla, no queda un borrado a medias. */
async function remove(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const torneo = await em.findOne(Torneo, { id }, { populate: ['adminTorneo'] });
    if (!torneo) return res.status(404).json({ message: 'torneo not found' });

    const errorAuth = verificarAdminDueño(torneo, req);
    if (errorAuth) return res.status(errorAuth.status).json({ message: errorAuth.message });

    const nombreTorneo = torneo.nombreTorneo;

    const resumen = await em.transactional(async (txEm) => {
      const partidos = await txEm.nativeDelete(Partido, { torneo: id });
      const notificaciones = await txEm.nativeDelete(Notificacion, { torneo: id });
      const suspensiones = await txEm.nativeDelete(Suspension, { torneo: id });
      const arbitrosAsignados = await txEm.nativeDelete(TorneoArbitro, { torneo: id });
      const canchasAsignadas = await txEm.nativeDelete(TorneoCancha, { torneo: id });
      const participaciones = await txEm.nativeDelete(Participacion, { torneo: id });
      await txEm.nativeDelete(Torneo, { id });

      return { participaciones, partidos, notificaciones, suspensiones, arbitrosAsignados, canchasAsignadas };
    });

    res.status(200).json({
      message: `Torneo "${nombreTorneo}" eliminado junto con ${resumen.participaciones} participaciones, ${resumen.partidos} partidos, ${resumen.suspensiones} suspensiones y ${resumen.notificaciones} notificaciones.`,
      data: resumen,
    });
  } catch (e: any) {
    console.error('Error al eliminar torneo (se hizo rollback):', e);
    res.status(500).json({ message: `No se pudo eliminar el torneo: ${e.message}` });
  }
}

/** 🔹 GET /torneo/:id/arbitros — árbitros asignados a este torneo */
async function getArbitros(req: Request, res: Response) {
  try {
    const torneoId = Number(req.params.id);
    if (Number.isNaN(torneoId)) return res.status(400).json({ message: 'id inválido' });

    const asociaciones = await em.find(TorneoArbitro, { torneo: torneoId }, { populate: ['arbitro'] });
    res.status(200).json({ message: 'found arbitros del torneo', data: asociaciones.map((a) => a.arbitro) });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** 🔹 PUT /torneo/:id/arbitros — body { arbitroIds }, reemplaza el set completo */
async function setArbitros(req: Request, res: Response) {
  try {
    const torneoId = Number(req.params.id);
    if (Number.isNaN(torneoId)) return res.status(400).json({ message: 'id inválido' });

    const torneo = await em.findOne(Torneo, { id: torneoId }, { populate: ['adminTorneo'] });
    if (!torneo) return res.status(404).json({ message: 'Torneo no encontrado' });

    const errorAuth = verificarAdminDueño(torneo, req);
    if (errorAuth) return res.status(errorAuth.status).json({ message: errorAuth.message });

    const arbitroIds: number[] = Array.isArray(req.body.arbitroIds) ? req.body.arbitroIds : [];

    if (arbitroIds.length > 0) {
      const encontrados = await em.count(Arbitro, { id: { $in: arbitroIds } });
      if (encontrados !== new Set(arbitroIds).size) {
        return res.status(400).json({ message: 'Uno o más árbitros no existen' });
      }
    }

    await em.nativeDelete(TorneoArbitro, { torneo: torneoId });
    const nuevas = arbitroIds.map((arbitroId) => em.create(TorneoArbitro, { torneo: torneoId, arbitro: Number(arbitroId) }));
    await em.persistAndFlush(nuevas);

    res.status(200).json({ message: 'Árbitros del torneo actualizados', data: nuevas });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** 🔹 GET /torneo/:id/canchas — canchas asignadas a este torneo */
async function getCanchas(req: Request, res: Response) {
  try {
    const torneoId = Number(req.params.id);
    if (Number.isNaN(torneoId)) return res.status(400).json({ message: 'id inválido' });

    const asociaciones = await em.find(TorneoCancha, { torneo: torneoId }, { populate: ['cancha'] });
    res.status(200).json({ message: 'found canchas del torneo', data: asociaciones.map((c) => c.cancha) });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** 🔹 PUT /torneo/:id/canchas — body { canchaIds }, reemplaza el set completo */
async function setCanchas(req: Request, res: Response) {
  try {
    const torneoId = Number(req.params.id);
    if (Number.isNaN(torneoId)) return res.status(400).json({ message: 'id inválido' });

    const torneo = await em.findOne(Torneo, { id: torneoId }, { populate: ['adminTorneo'] });
    if (!torneo) return res.status(404).json({ message: 'Torneo no encontrado' });

    const errorAuth = verificarAdminDueño(torneo, req);
    if (errorAuth) return res.status(errorAuth.status).json({ message: errorAuth.message });

    const canchaIds: number[] = Array.isArray(req.body.canchaIds) ? req.body.canchaIds : [];

    if (canchaIds.length > 0) {
      const encontradas = await em.count(Cancha, { id: { $in: canchaIds } });
      if (encontradas !== new Set(canchaIds).size) {
        return res.status(400).json({ message: 'Una o más canchas no existen' });
      }
    }

    await em.nativeDelete(TorneoCancha, { torneo: torneoId });
    const nuevas = canchaIds.map((canchaId) => em.create(TorneoCancha, { torneo: torneoId, cancha: Number(canchaId) }));
    await em.persistAndFlush(nuevas);

    res.status(200).json({ message: 'Canchas del torneo actualizadas', data: nuevas });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

// Genera pares round-robin. Retorna un array de jornadas, cada jornada es un array de pares [local, visitante].
function generarRondas(participaciones: Participacion[], formato: string): [Participacion, Participacion][][] {
  const teams = [...participaciones];

  // Con cantidad impar se agrega un "bye" para que el algoritmo funcione con N par
  if (teams.length % 2 !== 0) teams.push(null as any);
  const total = teams.length;
  const rondas: [Participacion, Participacion][][] = [];

  // El primer equipo es fijo; el resto rota una posición hacia la derecha por jornada
  const circulo = teams.slice(1);

  for (let r = 0; r < total - 1; r++) {
    const jornada: [Participacion, Participacion][] = [];
    const actual = [teams[0], ...circulo];

    for (let i = 0; i < total / 2; i++) {
      const local = actual[i];
      const visitante = actual[total - 1 - i];
      if (local && visitante) jornada.push([local, visitante]);
    }

    rondas.push(jornada);
    // Rotar circulo a la derecha: el último pasa al frente
    circulo.unshift(circulo.pop()!);
  }

  if (formato === 'idayvuelta') {
    const vuelta = rondas.map(r => r.map(([a, b]) => [b, a] as [Participacion, Participacion]));
    return [...rondas, ...vuelta];
  }

  return rondas;
}

async function generarFixture(req: Request, res: Response) {
  try {
    const torneoId = Number(req.params.id);
    if (Number.isNaN(torneoId)) return res.status(400).json({ message: 'id inválido' });

    const torneo = await em.findOne(Torneo, { id: torneoId }, { populate: ['participaciones', 'adminTorneo'] });
    if (!torneo) return res.status(404).json({ message: 'Torneo no encontrado' });

    const errorAuth = verificarAdminDueño(torneo, req);
    if (errorAuth) return res.status(errorAuth.status).json({ message: errorAuth.message });

    const participaciones = torneo.participaciones.getItems();
    if (participaciones.length < 2) {
      return res.status(400).json({ message: 'Se necesitan al menos 2 equipos inscriptos para generar el fixture' });
    }

    const existenPartidos = await em.count(Partido, { torneo: torneoId });
    if (existenPartidos > 0) {
      return res.status(409).json({ message: 'El torneo ya tiene un fixture generado' });
    }

    const { fechaBase, horaBase, diasEntreJornadas = 7 } = req.body;

    if (!fechaBase || !horaBase) {
      return res.status(400).json({ message: 'Campos requeridos: fechaBase, horaBase' });
    }

    const torneoArbitros = await em.find(TorneoArbitro, { torneo: torneoId }, { populate: ['arbitro'] });
    const torneoCanchas = await em.find(TorneoCancha, { torneo: torneoId }, { populate: ['cancha'] });
    const arbitroIds = torneoArbitros.map((ta) => ta.arbitro.id).filter((aid): aid is number => aid !== undefined);
    const canchaIds = torneoCanchas.map((tc) => tc.cancha.id).filter((cid): cid is number => cid !== undefined);

    if (!arbitroIds.length || !canchaIds.length) {
      return res.status(400).json({
        message: 'Asigná al menos un árbitro y una cancha al torneo antes de generar el fixture (pestañas Árbitros y Canchas)',
      });
    }

    const rondas = generarRondas(participaciones, torneo.formato);

    const partidos: Partido[] = [];
    let canchaIdx = 0;
    let arbitroIdx = 0;
    const fechaActual = new Date(fechaBase);

    for (let j = 0; j < rondas.length; j++) {
      for (const [local, visitante] of rondas[j]) {
        const partido = em.create(Partido, {
          torneo: torneoId,
          local: local.id as number,
          visitante: visitante.id as number,
          fecha_partido: new Date(fechaActual),
          hora_partido: horaBase,
          estado_partido: 'programado',
          jornada: j + 1,
          goles_local: 0,
          goles_visitante: 0,
          cancha: canchaIds[canchaIdx % canchaIds.length],
          arbitro: arbitroIds[arbitroIdx % arbitroIds.length],
        });
        partidos.push(partido);
        canchaIdx++;
        arbitroIdx++;
      }
      fechaActual.setDate(fechaActual.getDate() + Number(diasEntreJornadas));
    }

    await em.persistAndFlush(partidos);

    torneo.estado = 'en_curso';
    await em.flush();

    // Regla 2: al activarse el torneo, los equipos participantes quedan
    // "comprometidos" con sus fechas — se los saca de cualquier otro torneo
    // borrador/inscripción con el que ahora se superpongan.
    const conflictos = await buscarConflictosDeSuperposicion(em, torneo, {
      fechaInicio: torneo.fechaInicio,
      fechaFin: torneo.fechaFin,
    });
    await removerParticipacionesEnConflicto(em, conflictos);

    res.status(201).json({
      message: `Fixture generado: ${partidos.length} partidos en ${rondas.length} jornadas.`
        + (conflictos.length > 0 ? ` Se removieron ${conflictos.length} equipo(s) de otros torneos por superposición de fechas.` : ''),
      data: { totalPartidos: partidos.length, totalJornadas: rondas.length, equiposRemovidos: conflictos },
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** 🔹 POST /torneo/:id/fecha-fin/preview — Regla 2 aplicada a una fecha_fin
 * hipotética: no muta nada, solo devuelve qué participaciones quedarían en
 * conflicto si se aplicara. Solo tiene sentido para un torneo "en_curso" —
 * la fechaFin de un torneo que no arrancó se edita por el PATCH genérico. */
async function previewFechaFin(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const torneo = await em.findOne(Torneo, { id }, { populate: ['adminTorneo'] });
    if (!torneo) return res.status(404).json({ message: 'Torneo no encontrado' });

    const errorAuth = verificarAdminDueño(torneo, req);
    if (errorAuth) return res.status(errorAuth.status).json({ message: errorAuth.message });

    if (torneo.estado !== 'en_curso') {
      return res.status(400).json({ message: 'Este endpoint es solo para extender la fecha fin de un torneo en curso.' });
    }

    const nuevaFechaFin = new Date(req.body.fechaFin);
    if (Number.isNaN(nuevaFechaFin.getTime())) {
      return res.status(400).json({ message: 'fechaFin inválida' });
    }

    const equiposReales = await em.count(Participacion, { torneo: id });
    const errorDuracion = validarDuracionMinima(torneo.fechaInicio, nuevaFechaFin, equiposReales);
    if (errorDuracion) return res.status(400).json({ message: errorDuracion });

    const conflictos = await buscarConflictosDeSuperposicion(em, torneo, {
      fechaInicio: torneo.fechaInicio,
      fechaFin: nuevaFechaFin,
    });

    res.status(200).json({
      message: conflictos.length > 0
        ? `Extender la fecha fin removería ${conflictos.length} equipo(s) de otros torneos por superposición de fechas.`
        : 'Sin conflictos: la fecha fin se puede extender directamente.',
      data: { conflictos },
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** 🔹 PATCH /torneo/:id/fecha-fin — aplica la extensión. Si hay conflictos y
 * no vino `confirmarCascada: true`, no aplica ningún cambio y devuelve 409
 * con la misma lista que el preview (no confía en que el frontend haya
 * llamado al preview antes). Todo dentro de una transacción: fechaFin nueva
 * + remoción de las participaciones en conflicto. */
async function extenderFechaFin(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const torneo = await em.findOne(Torneo, { id }, { populate: ['adminTorneo'] });
    if (!torneo) return res.status(404).json({ message: 'Torneo no encontrado' });

    const errorAuth = verificarAdminDueño(torneo, req);
    if (errorAuth) return res.status(errorAuth.status).json({ message: errorAuth.message });

    if (torneo.estado !== 'en_curso') {
      return res.status(400).json({ message: 'Este endpoint es solo para extender la fecha fin de un torneo en curso.' });
    }

    const nuevaFechaFin = new Date(req.body.fechaFin);
    if (Number.isNaN(nuevaFechaFin.getTime())) {
      return res.status(400).json({ message: 'fechaFin inválida' });
    }

    // Regla 3 primero — ni vale la pena calcular conflictos si la duración
    // ya es inválida para este mismo torneo. Se valida contra el conteo real
    // de equipos inscriptos, no contra Torneo.cantidadEquipos.
    const equiposReales = await em.count(Participacion, { torneo: id });
    const errorDuracion = validarDuracionMinima(torneo.fechaInicio, nuevaFechaFin, equiposReales);
    if (errorDuracion) return res.status(400).json({ message: errorDuracion });

    const conflictos = await buscarConflictosDeSuperposicion(em, torneo, {
      fechaInicio: torneo.fechaInicio,
      fechaFin: nuevaFechaFin,
    });

    const confirmarCascada = req.body.confirmarCascada === true;
    if (conflictos.length > 0 && !confirmarCascada) {
      return res.status(409).json({
        message: `Extender la fecha fin removería ${conflictos.length} equipo(s) de otros torneos por superposición de fechas. Confirmá para aplicar.`,
        data: { conflictos },
      });
    }

    const resultado = await em.transactional(async (txEm) => {
      const torneoTx = await txEm.findOneOrFail(Torneo, { id });
      torneoTx.fechaFin = nuevaFechaFin;
      await txEm.flush();

      if (conflictos.length > 0) {
        await removerParticipacionesEnConflicto(txEm, conflictos);
      }
      return torneoTx;
    });

    res.status(200).json({
      message: conflictos.length > 0
        ? `Fecha fin extendida. Se removieron ${conflictos.length} equipo(s) de otros torneos por superposición de fechas.`
        : 'Fecha fin extendida.',
      data: { torneo: resultado, equiposRemovidos: conflictos },
    });
  } catch (e: any) {
    console.error('Error al extender fecha fin (se hizo rollback):', e);
    res.status(500).json({ message: `No se pudo extender la fecha fin: ${e.message}` });
  }
}

export {
  sanitizeTorneoInput,
  findAll,
  findOne,
  add,
  update,
  remove,
  getArbitros,
  setArbitros,
  getCanchas,
  setCanchas,
  generarFixture,
  generarRondas,
  previewFechaFin,
  extenderFechaFin,
};
