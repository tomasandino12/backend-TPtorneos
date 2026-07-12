import { Request, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { Notificacion } from './notificacion.entity.js';

const em = orm.em;

/** 🔹 GET /notificaciones — todas las notificaciones (cualquier tipo, leídas y no
 * leídas) del jugador autenticado (req.user), ordenadas por fecha descendente. */
async function misNotificaciones(req: Request, res: Response) {
  try {
    const notificaciones = await em.find(
      Notificacion,
      { jugador: req.user?.id },
      { populate: ['torneo'], orderBy: { fecha: 'DESC' } }
    );

    res.status(200).json({ message: 'found notificaciones', data: notificaciones });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** 🔹 PATCH /notificaciones/:id/leida — solo el dueño de la notificación (req.user) puede marcarla */
async function marcarLeida(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const notificacion = await em.findOne(Notificacion, { id }, { populate: ['jugador'] });
    if (!notificacion) return res.status(404).json({ message: 'Notificación no encontrada' });
    if (notificacion.jugador.id !== req.user?.id) {
      return res.status(403).json({ message: 'No podés marcar como leída la notificación de otro jugador' });
    }

    notificacion.leida = true;
    await em.flush();

    res.status(200).json({ message: 'notificacion marcada como leida', data: notificacion });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export { misNotificaciones, marcarLeida };
