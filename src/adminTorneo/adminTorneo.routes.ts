import { Router } from 'express';
import { sanitizeAdminTorneoInput, findAll, findOne, add, update, remove } from './adminTorneo.controler.js';

export const adminTorneoRouter = Router();

adminTorneoRouter.get('/', findAll);
adminTorneoRouter.get('/:id', findOne);
adminTorneoRouter.post('/', sanitizeAdminTorneoInput, add);
adminTorneoRouter.put('/:id', sanitizeAdminTorneoInput, update);
adminTorneoRouter.patch('/:id', sanitizeAdminTorneoInput, update);
adminTorneoRouter.delete('/:id', remove);
