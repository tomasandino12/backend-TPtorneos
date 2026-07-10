import { Router } from 'express';
import {
  sanitizeEquipoInput,
  findAll,
  findOne,
  add,
  update,
  uploadEscudo,
  remove,
  getEstadisticas,
  getEstadisticasTorneo,
} from './equipo.controler.js';
import { uploadEscudoMiddleware } from '../shared/upload/multerConfig.js';

export const equipoRouter = Router();

equipoRouter.get('/', findAll);
equipoRouter.get('/estadisticas/:torneoId', getEstadisticasTorneo);
equipoRouter.get('/:id/estadisticas', getEstadisticas);
equipoRouter.get('/:id', findOne);
equipoRouter.post('/', sanitizeEquipoInput, add);
equipoRouter.put('/:id', sanitizeEquipoInput, update);
equipoRouter.patch('/:id', sanitizeEquipoInput, update);
equipoRouter.post('/:id/escudo', uploadEscudoMiddleware, uploadEscudo);
equipoRouter.delete('/:id', remove);
