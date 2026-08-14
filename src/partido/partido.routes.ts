import { Router } from 'express';
import { sanitizePartidoInput, findAll, findOne, add, update, remove, findProgramados, getPartidosPorTorneo, actualizarResultado, actualizarProgramacion } from './partido.controler.js';
import { requireRole } from '../middleware/role.middleware.js';

export const partidoRouter = Router();

partidoRouter.get('/', findAll);
partidoRouter.get('/programados', findProgramados);
partidoRouter.get("/torneo/:id", getPartidosPorTorneo);
partidoRouter.get('/:id', findOne);
partidoRouter.post('/', requireRole('admin'), sanitizePartidoInput, add);
partidoRouter.patch('/:id/resultado', requireRole('admin'), actualizarResultado);
partidoRouter.patch('/:id/programacion', requireRole('admin'), actualizarProgramacion);
partidoRouter.put('/:id', requireRole('admin'), sanitizePartidoInput, update);
partidoRouter.patch('/:id', requireRole('admin'), sanitizePartidoInput, update);
partidoRouter.delete('/:id', requireRole('admin'), remove);

