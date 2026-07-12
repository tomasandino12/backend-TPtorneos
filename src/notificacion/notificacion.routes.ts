import { Router } from 'express';
import { misNotificaciones, marcarLeida } from './notificacion.controler.js';

export const notificacionRouter = Router();

notificacionRouter.get('/', misNotificaciones);
notificacionRouter.patch('/:id/leida', marcarLeida);
