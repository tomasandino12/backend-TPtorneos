import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { Torneo } from './torneo.entity.js';
import { Participacion } from '../participacion/participacion.entity.js';
import { Partido } from '../partido/partido.entity.js';
import { TorneoArbitro } from '../torneoArbitro/torneoArbitro.entity.js';
import { TorneoCancha } from '../torneoCancha/torneoCancha.entity.js';

const em = orm.em;

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

async function add(req: Request, res: Response) {
  try {
    const data = { ...req.body.sanitizedInput };
    const torneo = em.create(Torneo, data);
    await em.persistAndFlush(torneo);

    res.status(201).json({ message: 'torneo created', data: torneo });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

async function update(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const torneoToUpdate = await em.findOne(Torneo, { id });
    if (!torneoToUpdate) return res.status(404).json({ message: 'torneo not found' });

    const data = { ...req.body.sanitizedInput };
    em.assign(torneoToUpdate, data);
    await em.flush();

    res.status(200).json({ message: 'torneo updated', data: torneoToUpdate });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const torneo = await em.findOne(Torneo, { id });
    if (!torneo) return res.status(404).json({ message: 'torneo not found' });

    await em.removeAndFlush(torneo);
    res.status(204).end();
  } catch (e: any) {
    res.status(500).json({ message: e.message });
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

    const torneo = await em.findOne(Torneo, { id: torneoId });
    if (!torneo) return res.status(404).json({ message: 'Torneo no encontrado' });

    const arbitroIds: number[] = Array.isArray(req.body.arbitroIds) ? req.body.arbitroIds : [];

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

    const torneo = await em.findOne(Torneo, { id: torneoId });
    if (!torneo) return res.status(404).json({ message: 'Torneo no encontrado' });

    const canchaIds: number[] = Array.isArray(req.body.canchaIds) ? req.body.canchaIds : [];

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

    const torneo = await em.findOne(Torneo, { id: torneoId }, { populate: ['participaciones'] });
    if (!torneo) return res.status(404).json({ message: 'Torneo no encontrado' });

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

    res.status(201).json({
      message: `Fixture generado: ${partidos.length} partidos en ${rondas.length} jornadas`,
      data: { totalPartidos: partidos.length, totalJornadas: rondas.length },
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
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
};
