import { Router } from 'express';
import { sanitizeArbitroInput, findAll, findOne, add, update, remove } from './arbitro.controler.js';

export const arbitroRouter = Router();

arbitroRouter.get('/', findAll);

arbitroRouter.get('/:id', findOne);

arbitroRouter.post('/', sanitizeArbitroInput, add);

arbitroRouter.put('/:id', sanitizeArbitroInput, update);

arbitroRouter.patch('/:id', sanitizeArbitroInput, update);

arbitroRouter.delete('/:id', remove);
