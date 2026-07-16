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
  expulsar,
  suspender,
  habilitar,
  suspensiones,
  remove,
  register,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
} from './jugador.controler.js';

export const jugadorRouter = Router();

jugadorRouter.get('/', findAll);
jugadorRouter.get('/by-email', findByEmail);
jugadorRouter.get('/sin-equipo', getJugadoresSinEquipo);
jugadorRouter.get('/por-admin/:adminId', findByAdmin);
jugadorRouter.get('/:id/suspensiones', suspensiones);
jugadorRouter.get('/:id', findOne);


jugadorRouter.post('/login', login);
jugadorRouter.post('/google-login', googleLogin);
jugadorRouter.post('/registro', sanitizeJugadorInput, register);
jugadorRouter.post('/forgot-password', forgotPassword);
jugadorRouter.post('/reset-password', resetPassword);
jugadorRouter.post('/', sanitizeJugadorInput, add);
jugadorRouter.patch('/:id/transferir-capitania', transferirCapitania);
jugadorRouter.patch('/:id/expulsar', expulsar);
jugadorRouter.patch('/:id/suspender', suspender);
jugadorRouter.patch('/:id/habilitar', habilitar);
jugadorRouter.put('/:id', sanitizeJugadorInput, update);
jugadorRouter.patch('/:id', sanitizeJugadorInput, update);
jugadorRouter.delete('/:id', remove);