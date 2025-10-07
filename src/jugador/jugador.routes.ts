import { Router } from 'express';
import { sanitizeJugadorInput, findAll, findOne, add, update, remove } from './jugador.controler.js';
import { login } from './jugador.controler.js';
import { register } from './jugador.controler.js';

export const jugadorRouter = Router();

jugadorRouter.get('/', findAll);
jugadorRouter.get('/:id', findOne);
jugadorRouter.post('/', sanitizeJugadorInput, add);
jugadorRouter.put('/:id', sanitizeJugadorInput, update);
jugadorRouter.patch('/:id', sanitizeJugadorInput, update);
jugadorRouter.delete('/:id', remove);
jugadorRouter.post('/login', login);
jugadorRouter.post('/registro', sanitizeJugadorInput, register);