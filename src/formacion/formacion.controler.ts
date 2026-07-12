import { Request, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { Jugador } from '../jugador/jugador.entity.js';
import { Formacion } from './formacion.entity.js';
import { FormacionTitular } from './formacionTitular.entity.js';
import { Notificacion } from '../notificacion/notificacion.entity.js';

const em = orm.em;

const CUPOS_POR_ESQUEMA: Record<string, { arquero: number; defensor: number; mediocampista: number; delantero: number }> = {
  '4-3-3': { arquero: 1, defensor: 4, mediocampista: 3, delantero: 3 },
  '4-4-2': { arquero: 1, defensor: 4, mediocampista: 4, delantero: 2 },
  '4-2-3-1': { arquero: 1, defensor: 4, mediocampista: 5, delantero: 1 },
  '5-3-2': { arquero: 1, defensor: 5, mediocampista: 3, delantero: 2 },
};

const CATEGORIAS = ['arquero', 'defensor', 'mediocampista', 'delantero'] as const;

function categoriaDeJugador(jugador: Jugador): string | null {
  const posicion = (jugador.posicion ?? '').trim().toLowerCase();
  return (CATEGORIAS as readonly string[]).includes(posicion) ? posicion : null;
}

/** 🔹 GET /formaciones — formación activa del equipo del jugador autenticado (cualquier miembro puede leer) */
async function misFormacion(req: Request, res: Response) {
  try {
    const jugador = await em.findOne(Jugador, { id: req.user?.id }, { populate: ['equipo'] });
    if (!jugador || !jugador.equipo) {
      return res.status(403).json({ message: 'No pertenecés a ningún equipo' });
    }

    const formacion = await em.findOne(
      Formacion,
      { equipo: jugador.equipo.id },
      { populate: ['titulares', 'titulares.jugador'] }
    );

    if (!formacion) {
      return res.status(200).json({ message: 'El equipo todavía no tiene una formación configurada', data: null });
    }

    const plantel = await em.find(Jugador, { equipo: jugador.equipo.id });
    const idsTitulares = new Set(formacion.titulares.getItems().map((t) => t.jugador.id));

    const titulares = formacion.titulares.getItems()
      .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.orden - b.orden)
      .map((t) => ({
        jugadorId: t.jugador.id,
        nombre: t.jugador.nombre,
        apellido: t.jugador.apellido,
        categoria: t.categoria,
        orden: t.orden,
      }));

    const suplentes = plantel
      .filter((j) => !idsTitulares.has(j.id))
      .map((j) => ({ jugadorId: j.id, nombre: j.nombre, apellido: j.apellido, posicion: j.posicion }));

    res.status(200).json({
      message: 'found formación',
      data: {
        equipoId: jugador.equipo.id,
        esquema: formacion.esquema,
        notas: formacion.notas ?? null,
        fecha: formacion.fecha,
        titulares,
        suplentes,
      },
    });
  } catch (error: any) {
    console.error('Error en misFormacion:', error);
    res.status(500).json({ message: error.message });
  }
}

/** 🔹 PUT /formaciones — el capitán autenticado (req.user) crea o actualiza la
 * formación activa de SU equipo. Body: { esquema, titulares: number[], notas? } */
async function guardar(req: Request, res: Response) {
  try {
    const esquema = String(req.body.esquema ?? '');
    const titularesIds: number[] = Array.isArray(req.body.titulares) ? req.body.titulares.map(Number) : [];
    const notas = req.body.notas !== undefined ? String(req.body.notas) : undefined;

    const result = await em.transactional(async (txEm) => {
      const capitan = await txEm.findOne(Jugador, { id: req.user?.id }, { populate: ['equipo'] });
      if (!capitan || !capitan.esCapitan || !capitan.equipo) {
        throw Object.assign(new Error('Solo el capitán de un equipo puede configurar la formación'), { status: 403 });
      }

      const plantel = await txEm.find(Jugador, { equipo: capitan.equipo.id });
      if (plantel.length < 11) {
        throw Object.assign(new Error('El plantel tiene menos de 11 jugadores, no se puede crear ni actualizar la formación'), { status: 400 });
      }

      const cupos = CUPOS_POR_ESQUEMA[esquema];
      if (!cupos) {
        throw Object.assign(
          new Error(`Formación inválida. Valores permitidos: ${Object.keys(CUPOS_POR_ESQUEMA).join(', ')}`),
          { status: 400 }
        );
      }

      if (titularesIds.length !== 11 || titularesIds.some((id) => Number.isNaN(id))) {
        throw Object.assign(new Error('Se requieren exactamente 11 jugadores titulares'), { status: 400 });
      }

      if (new Set(titularesIds).size !== titularesIds.length) {
        throw Object.assign(new Error('Un jugador no puede ocupar dos posiciones a la vez en la formación'), { status: 400 });
      }

      const plantelPorId = new Map(plantel.map((j) => [j.id, j]));
      const jugadoresTitulares = titularesIds.map((id) => {
        const j = plantelPorId.get(id);
        if (!j) {
          throw Object.assign(new Error(`El jugador ${id} no pertenece a este equipo`), { status: 400 });
        }
        return j;
      });

      const conteoPorCategoria: Record<string, number> = { arquero: 0, defensor: 0, mediocampista: 0, delantero: 0 };
      const ordenPorCategoria: Record<string, number> = { arquero: 0, defensor: 0, mediocampista: 0, delantero: 0 };
      const asignaciones: { jugador: Jugador; categoria: string; orden: number }[] = [];

      for (const jugador of jugadoresTitulares) {
        const categoria = categoriaDeJugador(jugador);
        if (!categoria) {
          throw Object.assign(
            new Error(`El jugador ${jugador.id} tiene una posición no reconocida ("${jugador.posicion}")`),
            { status: 400 }
          );
        }
        conteoPorCategoria[categoria]++;
        asignaciones.push({ jugador, categoria, orden: ordenPorCategoria[categoria]++ });
      }

      const cuposFaltantes = (Object.keys(cupos) as (keyof typeof cupos)[])
        .filter((cat) => conteoPorCategoria[cat] !== cupos[cat]);
      if (cuposFaltantes.length > 0) {
        const requerido = Object.entries(cupos).map(([cat, n]) => `${n} ${cat}(es)`).join(', ');
        throw Object.assign(
          new Error(`La formación ${esquema} requiere exactamente ${requerido}. El equipo no cumple esos cupos con los jugadores elegidos.`),
          { status: 400 }
        );
      }

      let formacion = await txEm.findOne(Formacion, { equipo: capitan.equipo.id });
      if (!formacion) {
        formacion = txEm.create(Formacion, { equipo: capitan.equipo, esquema, notas, fecha: new Date() });
        txEm.persist(formacion);
      } else {
        formacion.esquema = esquema;
        formacion.notas = notas;
        formacion.fecha = new Date();
        await txEm.nativeDelete(FormacionTitular, { formacion: formacion.id });
      }
      await txEm.flush();

      for (const a of asignaciones) {
        txEm.create(FormacionTitular, { formacion, jugador: a.jugador, categoria: a.categoria, orden: a.orden });
      }

      const idsTitulares = new Set(titularesIds);
      for (const jugador of plantel) {
        txEm.create(Notificacion, {
          jugador,
          tipo: 'formacion_actualizada',
          mensaje: idsTitulares.has(jugador.id!)
            ? `Se actualizó la formación de "${capitan.equipo.nombreEquipo}" (${esquema}): quedaste como titular.`
            : `Se actualizó la formación de "${capitan.equipo.nombreEquipo}" (${esquema}): quedaste como suplente.`,
          leida: false,
          fecha: new Date(),
        });
      }

      return { formacion, equipo: capitan.equipo };
    });

    res.status(200).json({
      message: 'Formación guardada correctamente',
      data: { equipoId: result.equipo.id, esquema: result.formacion.esquema, notas: result.formacion.notas ?? null },
    });
  } catch (e: any) {
    console.error('Error al guardar formación:', e);
    res.status(e.status ?? 500).json({ message: e.message });
  }
}

export { misFormacion, guardar };
