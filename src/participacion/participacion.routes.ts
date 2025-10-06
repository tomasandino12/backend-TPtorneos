import { Router } from 'express';
import { sanitizeParticipacionInput, findAll, findOne, add, update, remove } from './participacion.controler.js';

export const participacionRouter = Router();

participacionRouter.get('/', findAll);
participacionRouter.get('/:id', findOne);
participacionRouter.post('/', sanitizeParticipacionInput, add);
participacionRouter.put('/:id', sanitizeParticipacionInput, update);
participacionRouter.patch('/:id', sanitizeParticipacionInput, update);
participacionRouter.delete('/:id', remove);
