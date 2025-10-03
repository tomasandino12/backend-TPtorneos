import { Router } from 'express';
import { sanitizeParticipacionInput, findAll, findOne, add, update, remove } from './participacion.controler.js';

export const participacionRouter = Router();

participacionRouter.get('/', findAll);
participacionRouter.get('/:equipoId/:torneoId', findOne);
participacionRouter.post('/', sanitizeParticipacionInput, add);
participacionRouter.put('/:equipoId/:torneoId', sanitizeParticipacionInput, update);
participacionRouter.patch('/:equipoId/:torneoId', sanitizeParticipacionInput, update);
participacionRouter.delete('/:equipoId/:torneoId', remove);
