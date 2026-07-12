import { Router } from 'express';
import { misFormacion, guardar } from './formacion.controler.js';

export const formacionRouter = Router();

formacionRouter.get('/', misFormacion);
formacionRouter.put('/', guardar);
