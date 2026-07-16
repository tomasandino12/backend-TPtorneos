import { Router } from 'express';
import { sanitizeAdminTorneoInput, findAll, findOne, add, update, remove, login } from './adminTorneo.controler.js';
import { requireRole } from '../middleware/role.middleware.js';

export const adminTorneoRouter = Router();

adminTorneoRouter.post('/login', login);

adminTorneoRouter.get('/', findAll);
adminTorneoRouter.get('/:id', findOne);
adminTorneoRouter.post('/', requireRole('admin'), sanitizeAdminTorneoInput, add);
adminTorneoRouter.put('/:id', requireRole('admin'), sanitizeAdminTorneoInput, update);
adminTorneoRouter.patch('/:id', requireRole('admin'), sanitizeAdminTorneoInput, update);
adminTorneoRouter.delete('/:id', requireRole('admin'), remove);

