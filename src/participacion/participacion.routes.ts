import { Router } from 'express';
import { sanitizeParticipacionInput, findAll, findOne, add, update, remove } from './participacion.controler.js';
import { requireRole } from '../middleware/role.middleware.js';

export const participacionRouter = Router();

participacionRouter.get('/', findAll);
participacionRouter.get('/:id', findOne);
participacionRouter.post('/', requireRole('admin'), sanitizeParticipacionInput, add);
participacionRouter.put('/:id', requireRole('admin'), sanitizeParticipacionInput, update);
participacionRouter.patch('/:id', requireRole('admin'), sanitizeParticipacionInput, update);
participacionRouter.delete('/:id', requireRole('admin'), remove);
