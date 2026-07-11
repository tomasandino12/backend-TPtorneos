import { Router } from 'express';
import { findByJugador, marcarLeida } from './notificacion.controler.js';

export const notificacionRouter = Router();

notificacionRouter.get('/jugador/:idJugador', findByJugador);
notificacionRouter.patch('/:id/leida', marcarLeida);
