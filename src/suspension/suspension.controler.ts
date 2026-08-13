import { Request, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { Suspension } from './suspension.entity.js';
import { Torneo } from '../torneo/torneo.entity.js';

const em = orm.em;

/** 🔹 GET /suspensiones — todas las suspensiones de los torneos del admin logueado
 * Filtros opcionales: ?activa=true|false  ?jugador=texto (busca en nombre+apellido) */
async function misSuspensiones(req: Request, res: Response) {
  try {
    const adminId = req.user?.id;

    const torneos = await em.find(Torneo, { adminTorneo: adminId });
    const torneoIds = torneos.map((t) => t.id).filter((id): id is number => id !== undefined);
    if (torneoIds.length === 0) {
      return res.status(200).json({ message: 'found suspensiones', data: [] });
    }

    const filtro: Record<string, any> = { torneo: { $in: torneoIds } };
    const { activa } = req.query;
    if (activa === 'true') filtro.activa = true;
    else if (activa === 'false') filtro.activa = false;

    let suspensiones = await em.find(Suspension, filtro, {
      populate: ['jugador', 'torneo'],
      orderBy: { fecha: 'DESC' },
    });

    const jugadorBuscado = typeof req.query.jugador === 'string' ? req.query.jugador.trim().toLowerCase() : '';
    if (jugadorBuscado) {
      suspensiones = suspensiones.filter((s) =>
        `${s.jugador.nombre} ${s.jugador.apellido}`.toLowerCase().includes(jugadorBuscado)
      );
    }

    res.status(200).json({ message: 'found suspensiones', data: suspensiones });
  } catch (error: any) {
    console.error('Error al obtener suspensiones:', error);
    res.status(500).json({ message: error.message });
  }
}

/** 🔹 DELETE /suspensiones/:id — borrado definitivo, solo si el torneo es del admin logueado */
async function eliminarSuspension(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const suspension = await em.findOne(Suspension, { id }, { populate: ['torneo', 'torneo.adminTorneo'] });
    if (!suspension) return res.status(404).json({ message: 'Suspensión no encontrada' });

    if (suspension.torneo.adminTorneo?.id !== req.user?.id) {
      return res.status(403).json({ message: 'No autorizado para eliminar esta suspensión' });
    }

    await em.removeAndFlush(suspension);
    res.status(200).json({ message: 'Suspensión eliminada' });
  } catch (error: any) {
    console.error('Error al eliminar suspensión:', error);
    res.status(500).json({ message: error.message });
  }
}

export { misSuspensiones, eliminarSuspension };
