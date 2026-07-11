import { Router } from 'express';
import {
  sanitizeInvitacionInput,
  sanitizeRespuestaInput,
  add,
  findByJugador,
  findByEquipo,
  responder,
  marcarVista,
} from './invitacion.controler.js';

export const invitacionRouter = Router();

invitacionRouter.get('/jugador/:idJugador', findByJugador);
invitacionRouter.get('/equipo/:idEquipo', findByEquipo);
invitacionRouter.post('/', sanitizeInvitacionInput, add);
invitacionRouter.put('/:id', sanitizeRespuestaInput, responder);
invitacionRouter.patch('/:id/vista', marcarVista);
