import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { orm } from '../shared/db/orm.js';
import { Equipo } from './equipo.entity.js';
import { Jugador } from '../jugador/jugador.entity.js';
import { Participacion } from '../participacion/participacion.entity.js';
import { Partido } from '../partido/partido.entity.js';
import { Suspension } from '../suspension/suspension.entity.js';

const em = orm.em;

/** 🔹 Sanitiza el body */
function sanitizeEquipoInput(req: Request, res: Response, next: NextFunction) {
  req.body.sanitizedInput = {
    nombreEquipo: req.body.nombreEquipo,
    colorPrimario: req.body.colorPrimario,
    colorSecundario: req.body.colorSecundario,
    categoria: req.body.categoria,
    descripcion: req.body.descripcion,
    idJugador: req.body.idJugador,
  };

  Object.keys(req.body.sanitizedInput).forEach((k) => {
    if (req.body.sanitizedInput[k] === undefined) delete req.body.sanitizedInput[k];
  });

  const categoriasValidas = ['sub15', 'sub17', 'mayores', 'veteranos', 'femenino'];
  if (req.body.sanitizedInput.categoria && !categoriasValidas.includes(req.body.sanitizedInput.categoria)) {
    return res.status(400).json({ message: `Categoría inválida. Valores permitidos: ${categoriasValidas.join(', ')}` });
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


/** 🔹 POST /equipos */
async function add(req: Request, res: Response) {
  try {
    const { nombreEquipo, colorPrimario, colorSecundario, categoria, descripcion, idJugador } = req.body.sanitizedInput;

    const nuevoEquipo = em.create(Equipo, { nombreEquipo, colorPrimario, colorSecundario, categoria, descripcion });
    await em.persistAndFlush(nuevoEquipo);

    
    const jugador = await em.findOne(Jugador, { id: idJugador });
    if (jugador) {
      if (jugador.equipo) {
        return res.status(400).json({ message: 'El jugador ya pertenece a un equipo' });
      }
      jugador.equipo = nuevoEquipo;
      jugador.esCapitan = true;
      await em.flush();
    }

    res.status(201).json({ message: 'equipo created', data: nuevoEquipo });
  } catch (e: any) {
    console.error('Error al crear equipo:', e);
    res.status(500).json({ message: e.message });
  }
}

/** 🔹 PUT /equipos/:id */
async function update(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const equipoToUpdate = await em.findOne(Equipo, { id });
    if (!equipoToUpdate) return res.status(404).json({ message: 'equipo not found' });

    if (req.user?.rol !== 'admin') {
      const jugadorAutenticado = await em.findOne(Jugador, { id: req.user?.id }, { populate: ['equipo'] });
      const esCapitanDeEsteEquipo = jugadorAutenticado?.esCapitan && jugadorAutenticado.equipo?.id === id;
      if (!esCapitanDeEsteEquipo) {
        return res.status(403).json({ message: 'Solo el capitán del equipo puede editarlo' });
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

    if (req.user?.rol !== 'admin') {
      const jugadorAutenticado = await em.findOne(Jugador, { id: req.user?.id }, { populate: ['equipo'] });
      const esCapitanDeEsteEquipo = jugadorAutenticado?.esCapitan && jugadorAutenticado.equipo?.id === id;
      if (!esCapitanDeEsteEquipo) {
        return res.status(403).json({ message: 'Solo el capitán del equipo puede editarlo' });
      }
    }

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
        pj,
        pg,
        pe,
        pp,
        dg,
        pts,
        posicion: 0,
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
