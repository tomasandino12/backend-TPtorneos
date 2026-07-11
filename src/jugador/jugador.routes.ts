import { Router } from 'express';
import {
  sanitizeJugadorInput,
  findAll,
  findOne,
  findByEmail,
  getJugadoresSinEquipo,
  findByAdmin,
  add,
  update,
  transferirCapitania,
  remove,
  register,
  login,
  forgotPassword,
  resetPassword,
} from './jugador.controler.js';

export const jugadorRouter = Router();

jugadorRouter.get('/', findAll);
jugadorRouter.get('/by-email', findByEmail);
jugadorRouter.get('/sin-equipo', getJugadoresSinEquipo);
jugadorRouter.get('/por-admin/:adminId', findByAdmin);
jugadorRouter.get('/:id', findOne);


jugadorRouter.post('/login', login);
jugadorRouter.post('/registro', sanitizeJugadorInput, register);
jugadorRouter.post('/forgot-password', forgotPassword);
jugadorRouter.post('/reset-password', resetPassword);
jugadorRouter.post('/', sanitizeJugadorInput, add);
jugadorRouter.patch('/:id/transferir-capitania', transferirCapitania);
jugadorRouter.put('/:id', sanitizeJugadorInput, update);
jugadorRouter.patch('/:id', sanitizeJugadorInput, update);
jugadorRouter.delete('/:id', remove);