import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { orm } from '../shared/db/orm.js';
import { Equipo } from './equipo.entity.js';
import { Jugador } from '../jugador/jugador.entity.js';
import { Participacion } from '../participacion/participacion.entity.js';
import { Partido } from '../partido/partido.entity.js';
import { Suspension } from '../suspension/suspension.entity.js';
import { MIN_JUGADORES_PLANTEL_TORNEO } from '../shared/constants.js';
import { CATEGORIAS_VALIDAS, validarJugadorParaCategoria, obtenerReglaCategoria } from '../shared/categorias.js';

const em = orm.em;

/** Devuelve un { status, message } si quien llama (req.user) no puede operar
 * sobre este equipo (no es admin ni es su capitán), o null si puede — mismo
 * patrón que verificarAdminDueño en torneo.controler.ts. Recibe el
 * EntityManager como parámetro porque uploadEscudo() usa uno forkeado propio,
 * distinto del `em` global que usan el resto de las funciones de este archivo. */
async function verificarCapitanDueño(
  equipoId: number,
  req: Request,
  emInstance: typeof em
): Promise<{ status: number; message: string } | null> {
  if (req.user?.rol === 'admin') return null;

  const jugadorAutenticado = await emInstance.findOne(Jugador, { id: req.user?.id }, { populate: ['equipo'] });
  const esCapitanDeEsteEquipo = jugadorAutenticado?.esCapitan && jugadorAutenticado.equipo?.id === equipoId;
  if (!esCapitanDeEsteEquipo) {
    return { status: 403, message: 'Solo el capitán del equipo puede realizar esta acción' };
  }
  return null;
}

/** No puede haber dos equipos con el mismo nombre (insensible a mayúsculas y
 * a espacios al principio/final) dentro de la misma categoría — entre
 * categorías distintas el mismo nombre no es problema. `excluirId` es el
 * propio equipo al editar, para no bloquearlo consigo mismo. */
async function existeNombreDuplicadoEnCategoria(
  txEm: typeof em,
  nombreEquipo: string,
  categoria: string,
  excluirId?: number
): Promise<boolean> {
  const nombreNormalizado = nombreEquipo.trim().toLowerCase();
  const candidatos = await txEm.find(Equipo, {
    categoria,
    ...(excluirId !== undefined ? { id: { $ne: excluirId } } : {}),
  });
  return candidatos.some((e) => e.nombreEquipo.trim().toLowerCase() === nombreNormalizado);
}

function mensajeNombreDuplicado(nombreEquipo: string, categoria: string): string {
  const label = obtenerReglaCategoria(categoria)?.label ?? categoria;
  return `Ya existe un equipo llamado "${nombreEquipo.trim()}" en la categoría ${label}.`;
}

/** Baja automática: si el plantel de un equipo cae por debajo de
 * MIN_JUGADORES_PLANTEL_TORNEO, se lo da de baja de todas sus participaciones
 * activas en torneos en_curso, y se le sobrescribe el resultado de sus
 * partidos todavía no jugados de esos torneos: 3-0 a favor del rival si el
 * rival sigue activo, o 0-0 (sin puntos para nadie) si el rival también está
 * de baja. Se llama SIEMPRE dentro de la misma transacción que sacó al
 * jugador del equipo (jugador.controler.ts: update() y expulsar()) — recibe
 * el EntityManager transaccional, nunca el `em` global. No hace nada si el
 * equipo no tiene ninguna participación activa en un torneo en_curso. */
export async function procesarBajaAutomaticaSiCorresponde(txEm: typeof em, equipoId: number): Promise<void> {
  const cantidadJugadores = await txEm.count(Jugador, { equipo: equipoId });
  if (cantidadJugadores >= MIN_JUGADORES_PLANTEL_TORNEO) return;

  const participacionesActivas = await txEm.find(
    Participacion,
    { equipo: equipoId, estado_participacion: 'activo', torneo: { estado: 'en_curso' } },
    { populate: ['torneo', 'equipo'] }
  );

  for (const participacion of participacionesActivas) {
    participacion.estado_participacion = 'dado_de_baja';

    const partidosPendientes = await txEm.find(
      Partido,
      {
        torneo: participacion.torneo.id,
        estado_partido: { $ne: 'finalizado' },
        $or: [{ local: participacion.id }, { visitante: participacion.id }],
      },
      { populate: ['local.equipo', 'visitante.equipo'] }
    );

    for (const partido of partidosPendientes) {
      const esteEquipoEsLocal = partido.local.id === participacion.id;
      const rival = esteEquipoEsLocal ? partido.visitante : partido.local;

      if (rival.estado_participacion === 'dado_de_baja') {
        partido.goles_local = 0;
        partido.goles_visitante = 0;
      } else if (esteEquipoEsLocal) {
        partido.goles_local = 0;
        partido.goles_visitante = 3;
      } else {
        partido.goles_local = 3;
        partido.goles_visitante = 0;
      }
      partido.estado_partido = 'finalizado';
      partido.walkover = true;

      console.log(
        `[Baja automática] Partido ${partido.id} (torneo ${participacion.torneo.id} "${participacion.torneo.nombreTorneo}") ` +
        `sobrescrito por W.O.: ${partido.local.equipo?.nombreEquipo ?? partido.local.id} ${partido.goles_local}-${partido.goles_visitante} ` +
        `${partido.visitante.equipo?.nombreEquipo ?? partido.visitante.id}.`
      );
    }

    console.log(
      `[Baja automática] Equipo "${participacion.equipo.nombreEquipo}" (id ${equipoId}) dado de baja del torneo ` +
      `"${participacion.torneo.nombreTorneo}" (id ${participacion.torneo.id}) — plantel cayó a ${cantidadJugadores} jugador(es).`
    );
  }
}

/** 🔹 Sanitiza el body */
function sanitizeEquipoInput(req: Request, res: Response, next: NextFunction) {
  req.body.sanitizedInput = {
    nombreEquipo: req.body.nombreEquipo,
    colorPrimario: req.body.colorPrimario,
    colorSecundario: req.body.colorSecundario,
    categoria: req.body.categoria,
    descripcion: req.body.descripcion,
  };

  Object.keys(req.body.sanitizedInput).forEach((k) => {
    if (req.body.sanitizedInput[k] === undefined) delete req.body.sanitizedInput[k];
  });

  if (req.body.sanitizedInput.categoria && !CATEGORIAS_VALIDAS.includes(req.body.sanitizedInput.categoria)) {
    return res.status(400).json({ message: `Categoría inválida. Valores permitidos: ${CATEGORIAS_VALIDAS.join(', ')}` });
  }

  // Obligatoria solo al crear (POST): este mismo middleware también corre en
  // PUT/PATCH /equipos/:id, donde una edición parcial (ej. solo la
  // descripción, ver EquipoInfo.jsx handleGuardarDescripcion) no tiene por
  // qué reenviar la categoría del equipo ya existente.
  if (req.method === 'POST' && !req.body.sanitizedInput.categoria) {
    return res.status(400).json({ message: 'La categoría del equipo es obligatoria.' });
  }

  next();
}

/** 🔹 GET /equipos */
async function findAll(_req: Request, res: Response) {
  try {
    const equipos = await em.find(Equipo, {}, {
      populate: ['jugadores'],
      fields: [
        'id', 'nombreEquipo', 'colorPrimario', 'colorSecundario', 'categoria',
        'descripcion', 'escudoUrl',
        'jugadores.id', 'jugadores.nombre', 'jugadores.apellido',
        'jugadores.posicion', 'jugadores.esCapitan', 'jugadores.fechaNacimiento',
      ],
    });
    res.status(200).json({ message: 'found all equipos', data: equipos });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** GET /equipos/:id */
async function findOne(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "id inválido" });

    const equipo = await em.findOne(
      Equipo,
      { id },
      {
        populate: [
          "jugadores",
          "participaciones.torneo",
          "participaciones.partidosLocal",
          "participaciones.partidosVisitante",
          "participaciones.partidosLocal.visitante.equipo",
          "participaciones.partidosVisitante.local.equipo",
        ],
        fields: [
          "id",
          "nombreEquipo",
          "colorPrimario",
          "colorSecundario",
          "categoria",
          "descripcion",
          "escudoUrl",
          "jugadores.id",
          "jugadores.nombre",
          "jugadores.apellido",
          "jugadores.posicion",
          "jugadores.fechaNacimiento",
          "jugadores.esCapitan",
          "participaciones.id",
          "participaciones.torneo",
          "participaciones.partidosLocal",
          "participaciones.partidosVisitante",
        ],
      }
    );

    if (!equipo) return res.status(404).json({ message: "equipo not found" });

    // Enriquecer cada jugador con si tiene una suspensión activa (en cualquier
    // torneo — esta pantalla muestra el plantel completo, sin distinguir torneo).
    const jugadorIds = equipo.jugadores
      .getItems()
      .map((j) => j.id)
      .filter((jid): jid is number => jid !== undefined);

    const suspensionesActivas = jugadorIds.length > 0
      ? await em.find(Suspension, { jugador: { $in: jugadorIds }, activa: true })
      : [];
    const idsSuspendidos = new Set(suspensionesActivas.map((s) => (s.jugador as any).id));

    const equipoConSuspensiones = {
      ...equipo,
      jugadores: equipo.jugadores.getItems().map((j) => ({ ...j, suspendido: idsSuspendidos.has(j.id) })),
    };

    res.status(200).json({ message: "found equipo", data: equipoConSuspensiones });
  } catch (e: any) {
    console.error("Error en findOne:", e);
    res.status(500).json({ message: e.message });
  }
}


/** 🔹 POST /equipos — quien crea el equipo queda como su capitán inicial
 * (resuelto siempre por req.user, nunca por un idJugador que mande el body). */
async function add(req: Request, res: Response) {
  try {
    const { nombreEquipo, colorPrimario, colorSecundario, categoria, descripcion } = req.body.sanitizedInput;

    // Toda la escritura en una transacción: si la validación de "el jugador ya
    // tiene equipo" falla, el rollback evita que quede un Equipo huérfano
    // (sin capitán ni jugadores) persistido en la base.
    const nuevoEquipo = await em.transactional(async (txEm) => {
      if (await existeNombreDuplicadoEnCategoria(txEm, nombreEquipo, categoria)) {
        throw Object.assign(new Error(mensajeNombreDuplicado(nombreEquipo, categoria)), { status: 409 });
      }

      if (req.user?.rol !== 'admin') {
        const jugador = await txEm.findOne(Jugador, { id: req.user?.id });
        if (jugador?.equipo) {
          throw Object.assign(new Error('El jugador ya pertenece a un equipo'), { status: 400 });
        }

        const equipo = txEm.create(Equipo, { nombreEquipo, colorPrimario, colorSecundario, categoria, descripcion });
        txEm.persist(equipo);

        if (jugador) {
          jugador.equipo = equipo;
          jugador.esCapitan = true;
        }

        return equipo;
      }

      const equipo = txEm.create(Equipo, { nombreEquipo, colorPrimario, colorSecundario, categoria, descripcion });
      txEm.persist(equipo);
      return equipo;
    });

    res.status(201).json({ message: 'equipo created', data: nuevoEquipo });
  } catch (e: any) {
    console.error('Error al crear equipo:', e);
    res.status(e.status ?? 500).json({ message: e.message });
  }
}

/** 🔹 PUT /equipos/:id */
async function update(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const equipoToUpdate = await em.findOne(Equipo, { id });
    if (!equipoToUpdate) return res.status(404).json({ message: 'equipo not found' });

    const errorAuth = await verificarCapitanDueño(id, req, em);
    if (errorAuth) return res.status(errorAuth.status).json({ message: errorAuth.message });

    const nombreNuevo: string | undefined = req.body.sanitizedInput.nombreEquipo;
    if (nombreNuevo !== undefined) {
      const categoriaEfectiva: string = req.body.sanitizedInput.categoria ?? equipoToUpdate.categoria;
      if (await existeNombreDuplicadoEnCategoria(em, nombreNuevo, categoriaEfectiva, id)) {
        return res.status(409).json({ message: mensajeNombreDuplicado(nombreNuevo, categoriaEfectiva) });
      }
    }

    em.assign(equipoToUpdate, req.body.sanitizedInput);
    await em.flush();

    res.status(200).json({ message: 'equipo updated', data: equipoToUpdate });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** 🔹 POST /equipos/:id/escudo */
async function uploadEscudo(req: Request, res: Response) {
  // El middleware de multer procesa el stream multipart antes de esta función y
  // eso rompe la propagación del RequestContext de MikroORM (AsyncLocalStorage),
  // por eso acá se usa un EntityManager propio (fork) en vez del global `em`.
  const em = orm.em.fork();
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const equipo = await em.findOne(Equipo, { id });
    if (!equipo) return res.status(404).json({ message: 'equipo not found' });

    const errorAuth = await verificarCapitanDueño(id, req, em);
    if (errorAuth) return res.status(errorAuth.status).json({ message: errorAuth.message });

    if (!req.file) return res.status(400).json({ message: 'Falta el archivo del escudo (.jpg)' });

    if (equipo.escudoUrl) {
      const rutaAnterior = path.join(process.cwd(), equipo.escudoUrl);
      fs.unlink(rutaAnterior, () => {});
    }

    equipo.escudoUrl = `/uploads/escudos/${req.file.filename}`;
    await em.flush();

    res.status(200).json({ message: 'escudo actualizado', data: equipo });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** 🔹 DELETE /equipos/:id */
async function remove(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const equipo = await em.findOne(Equipo, { id });
    if (!equipo) return res.status(404).json({ message: 'equipo not found' });

    const errorAuth = await verificarCapitanDueño(id, req, em);
    if (errorAuth) return res.status(errorAuth.status).json({ message: errorAuth.message });

    await em.removeAndFlush(equipo);
    res.status(204).end();
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** 🔹 GET /equipos/estadisticas/:torneoId */
async function getEstadisticasTorneo(req: Request, res: Response) {
  try {
    const torneoId = Number(req.params.torneoId);
    if (Number.isNaN(torneoId))
      return res.status(400).json({ message: 'torneoId inválido' });

    const participaciones = await em.find(
      Participacion,
      { torneo: torneoId },
      {
        populate: [
          'equipo',
          'partidosLocal',
          'partidosVisitante',
        ],
      }
    );

    const estadisticas: any[] = [];

    for (const participacion of participaciones) {
      const equipo = participacion.equipo;
      let pj = 0, pg = 0, pe = 0, pp = 0, dg = 0, pts = 0;

      // Partidos como local
      for (const partido of participacion.partidosLocal) {
        if (partido.estado_partido.toLowerCase() !== 'finalizado') continue;
        pj++;
        if (partido.goles_local > partido.goles_visitante) {
          pg++; pts += 3;
        } else if (partido.goles_local === partido.goles_visitante) {
          pe++; pts += 1;
        } else {
          pp++;
        }
        dg += partido.goles_local - partido.goles_visitante;
      }

      // Partidos como visitante
      for (const partido of participacion.partidosVisitante) {
        if (partido.estado_partido.toLowerCase() !== 'finalizado') continue;
        pj++;
        if (partido.goles_visitante > partido.goles_local) {
          pg++; pts += 3;
        } else if (partido.goles_visitante === partido.goles_local) {
          pe++; pts += 1;
        } else {
          pp++;
        }
        dg += partido.goles_visitante - partido.goles_local;
      }

      estadisticas.push({
        id: equipo.id,
        nombreEquipo: equipo.nombreEquipo,
        colorPrimario: equipo.colorPrimario,
        pj,
        pg,
        pe,
        pp,
        dg,
        pts,
        posicion: 0,
        estadoParticipacion: participacion.estado_participacion,
      });
    }

    
    estadisticas.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      return b.pj - a.pj;
    });

    estadisticas.forEach((est, index) => (est.posicion = index + 1));

    res.status(200).json({ message: 'estadisticas found', data: estadisticas });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

/** 🔹 GET /equipos/:id/estadisticas */
async function getEstadisticas(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const equipo = await em.findOne(
      Equipo,
      { id },
      { populate: ['participaciones.partidosLocal', 'participaciones.partidosVisitante'] }
    );

    if (!equipo) return res.status(404).json({ message: 'Equipo no encontrado' });

    const estadisticas = calcularEstadisticas(equipo);

    res.status(200).json({ message: 'estadisticas found', data: estadisticas });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

function calcularEstadisticas(equipo: Equipo) {
  let victorias = 0, empates = 0, derrotas = 0;

  equipo.participaciones.getItems().forEach((p: Participacion) => {
    p.partidosLocal?.getItems().forEach((partido: Partido) => {
      if (partido.estado_partido.toLowerCase() !== 'finalizado') return;
      if (partido.goles_local > partido.goles_visitante) victorias++;
      else if (partido.goles_local === partido.goles_visitante) empates++;
      else derrotas++;
    });

    p.partidosVisitante?.getItems().forEach((partido: Partido) => {
      if (partido.estado_partido.toLowerCase() !== 'finalizado') return;
      if (partido.goles_visitante > partido.goles_local) victorias++;
      else if (partido.goles_visitante === partido.goles_local) empates++;
      else derrotas++;
    });
  });

  return { victorias, empates, derrotas };
}

export {
  sanitizeEquipoInput,
  findAll,
  findOne,
  add,
  update,
  uploadEscudo,
  remove,
  getEstadisticasTorneo,
  getEstadisticas,
};
