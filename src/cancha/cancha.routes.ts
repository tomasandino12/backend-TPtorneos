import { Router } from 'express';
import { sanitizeCanchaInput, findAll, findOne, add, update, remove } from './cancha.controler.js';
import { requireRole } from '../middleware/role.middleware.js';

export const canchaRouter = Router();

canchaRouter.get('/', findAll);

canchaRouter.get('/:id', findOne);

canchaRouter.post('/', requireRole('admin'), sanitizeCanchaInput, add);

canchaRouter.put('/:id', requireRole('admin'), sanitizeCanchaInput, update);

canchaRouter.patch('/:id', requireRole('admin'), sanitizeCanchaInput, update);

canchaRouter.delete('/:id', requireRole('admin'), remove);
