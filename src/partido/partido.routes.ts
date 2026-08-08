import { Router } from 'express';
import { sanitizePartidoInput, findAll, findOne, add, update, remove, findProgramados, getPartidosPorTorneo, actualizarResultado } from './partido.controler.js';
import { requireRole } from '../middleware/role.middleware.js';

export const partidoRouter = Router();

partidoRouter.get('/', findAll);
partidoRouter.get('/programados', findProgramados);
partidoRouter.get("/torneo/:id", getPartidosPorTorneo);
partidoRouter.get('/:id', findOne);
partidoRouter.post('/', sanitizePartidoInput, add);
partidoRouter.patch('/:id/resultado', requireRole('admin'), actualizarResultado);
partidoRouter.put('/:id', sanitizePartidoInput, update);
partidoRouter.patch('/:id', sanitizePartidoInput, update);
partidoRouter.delete('/:id', remove);

