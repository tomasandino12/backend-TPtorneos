import { Router } from 'express';
import {
  sanitizeEquipoInput,
  findAll,
  findOne,
  add,
  update,
  remove,
  getEstadisticas,
  getEstadisticasTorneo,
} from './equipo.controler.js';

export const equipoRouter = Router();

equipoRouter.get('/', findAll);
equipoRouter.get('/estadisticas/:torneoId', getEstadisticasTorneo);
equipoRouter.get('/:id/estadisticas', getEstadisticas);
equipoRouter.get('/:id', findOne);
equipoRouter.post('/', sanitizeEquipoInput, add);
equipoRouter.put('/:id', sanitizeEquipoInput, update);
equipoRouter.patch('/:id', sanitizeEquipoInput, update);
equipoRouter.delete('/:id', remove);
