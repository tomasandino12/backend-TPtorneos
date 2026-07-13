import { Router } from 'express';
import { sanitizeArbitroInput, findAll, findOne, add, update, remove } from './arbitro.controler.js';
import { requireRole } from '../middleware/role.middleware.js';

export const arbitroRouter = Router();

arbitroRouter.get('/', findAll);

arbitroRouter.get('/:id', findOne);

arbitroRouter.post('/', requireRole('admin'), sanitizeArbitroInput, add);

arbitroRouter.put('/:id', requireRole('admin'), sanitizeArbitroInput, update);

arbitroRouter.patch('/:id', requireRole('admin'), sanitizeArbitroInput, update);

arbitroRouter.delete('/:id', requireRole('admin'), remove);
