import { Router } from 'express';
import { sanitizeJugadorInput, findAll, findOne, findByEmail, add, update, remove, register, login, } from './jugador.controler.js';
export const jugadorRouter = Router();
jugadorRouter.get('/', findAll);
jugadorRouter.get('/by-email', findByEmail);
jugadorRouter.get('/:id', findOne);
jugadorRouter.post('/', sanitizeJugadorInput, add);
jugadorRouter.put('/:id', sanitizeJugadorInput, update);
jugadorRouter.patch('/:id', sanitizeJugadorInput, update);
jugadorRouter.delete('/:id', remove);
jugadorRouter.post('/login', login);
jugadorRouter.post('/registro', sanitizeJugadorInput, register);
//# sourceMappingURL=jugador.routes.js.map