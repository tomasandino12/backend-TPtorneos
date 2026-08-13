import { Router } from 'express';
import { requireRole } from '../middleware/role.middleware.js';
import { misSuspensiones, eliminarSuspension } from './suspension.controler.js';

export const suspensionRouter = Router();

suspensionRouter.get('/', requireRole('admin'), misSuspensiones);
suspensionRouter.delete('/:id', requireRole('admin'), eliminarSuspension);
