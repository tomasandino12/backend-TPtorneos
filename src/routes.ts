import { Router } from 'express';
import { jugadorRouter } from './jugador/jugador.routes.js';
import { canchaRouter } from './cancha/cancha.routes.js';
import { partidoRouter } from './partido/partido.routes.js';
import { equipoRouter } from './equipo/equipo.routes.js';
import { arbitroRouter } from './arbitro/arbitro.routes.js';

export const apiRouter = Router();

// Montaje de routers por entidad
apiRouter.use('/jugadores', jugadorRouter);
apiRouter.use('/canchas', canchaRouter);
apiRouter.use('/partidos', partidoRouter);
apiRouter.use('/equipos', equipoRouter);
apiRouter.use('/arbitros', arbitroRouter);



