import { Router } from 'express';
import {
  sanitizeEquipoInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './equipo.controler.js';

export const equipoRouter = Router();

equipoRouter.get('/', findAll);
equipoRouter.get('/:id', findOne);
equipoRouter.post('/', sanitizeEquipoInput, add);
equipoRouter.put('/:id', sanitizeEquipoInput, update);
equipoRouter.patch('/:id', sanitizeEquipoInput, update);
equipoRouter.delete('/:id', remove);
