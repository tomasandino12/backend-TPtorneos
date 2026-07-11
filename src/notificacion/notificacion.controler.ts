import { Request, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { Notificacion } from './notificacion.entity.js';

const em = orm.em;

/** 🔹 GET /notificacion/jugador/:idJugador — notificaciones no leídas */
async function findByJugador(req: Request, res: Response) {
  try {
    const idJugador = Number(req.params.idJugador);
    if (Number.isNaN(idJugador)) return res.status(400).json({ message: 'idJugador inválido' });

    const notificaciones = await em.find(
      Notificacion,
      { jugador: idJugador, leida: false },
      { populate: ['torneo'], orderBy: { fecha: 'DESC' } }
    );

    res.status(200).json({ message: 'found notificaciones', data: notificaciones });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** 🔹 PATCH /notificacion/:id/leida */
async function marcarLeida(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const notificacion = await em.findOne(Notificacion, { id });
    if (!notificacion) return res.status(404).json({ message: 'Notificación no encontrada' });

    notificacion.leida = true;
    await em.flush();

    res.status(200).json({ message: 'notificacion marcada como leida', data: notificacion });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export { findByJugador, marcarLeida };
