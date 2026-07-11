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

export const torneoRouter = Router();

torneoRouter.get('/', findAll);
torneoRouter.get('/:id/arbitros', getArbitros);
torneoRouter.put('/:id/arbitros', setArbitros);
torneoRouter.get('/:id/canchas', getCanchas);
torneoRouter.put('/:id/canchas', setCanchas);
torneoRouter.get('/:id', findOne);
torneoRouter.post('/', sanitizeTorneoInput, add);
torneoRouter.post('/:id/generar-fixture', generarFixture);
torneoRouter.put('/:id', sanitizeTorneoInput, update);
torneoRouter.patch('/:id', sanitizeTorneoInput, update);
torneoRouter.delete('/:id', remove);
