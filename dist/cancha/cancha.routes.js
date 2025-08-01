import { Router } from 'express';
import { sanitizeCanchaInput, findAll, findOne, add, update, remove } from './cancha.controler.js';
export const canchaRouter = Router();
canchaRouter.get('/', findAll);
canchaRouter.get('/:id', findOne);
canchaRouter.post('/', sanitizeCanchaInput, add);
canchaRouter.put('/:id', sanitizeCanchaInput, update);
canchaRouter.patch('/:id', sanitizeCanchaInput, update);
canchaRouter.delete('/:id', remove);
//# sourceMappingURL=cancha.routes.js.map