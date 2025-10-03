import { Router } from 'express';
import {
  sanitizeTorneoInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './torneo.controller.js';

export const torneoRouter = Router();

torneoRouter.get('/', findAll);
torneoRouter.get('/:id', findOne);
torneoRouter.post('/', sanitizeTorneoInput, add);
torneoRouter.put('/:id', sanitizeTorneoInput, update);
torneoRouter.patch('/:id', sanitizeTorneoInput, update);
torneoRouter.delete('/:id', remove);
