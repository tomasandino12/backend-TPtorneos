import { Router } from 'express';
import {
  sanitizeTorneoInput,
  findAll,
  findOne,
  add,
  update,
  remove,
  getArbitros,
  setArbitros,
  getCanchas,
  setCanchas,
  generarFixture,
} from './torneo.controler.js';
import { requireRole } from '../middleware/role.middleware.js';

export const torneoRouter = Router();

torneoRouter.get('/', findAll);
torneoRouter.get('/:id/arbitros', getArbitros);
torneoRouter.put('/:id/arbitros', requireRole('admin'), setArbitros);
torneoRouter.get('/:id/canchas', getCanchas);
torneoRouter.put('/:id/canchas', requireRole('admin'), setCanchas);
torneoRouter.get('/:id', findOne);
torneoRouter.post('/', requireRole('admin'), sanitizeTorneoInput, add);
torneoRouter.post('/:id/generar-fixture', requireRole('admin'), generarFixture);
torneoRouter.put('/:id', requireRole('admin'), sanitizeTorneoInput, update);
torneoRouter.patch('/:id', requireRole('admin'), sanitizeTorneoInput, update);
torneoRouter.delete('/:id', requireRole('admin'), remove);
