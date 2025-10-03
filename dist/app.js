import 'reflect-metadata';
import { RequestContext } from '@mikro-orm/core';
import express from 'express';
import { orm, syncSchema } from './shared/db/orm.js';
import { apiRouter } from './routes.js';
const app = express();
// Middleware para parsear JSON
app.use(express.json());
// RequestContext de MikroORM para cada request
app.use((req, res, next) => {
    RequestContext.create(orm.em, next);
});
// Montar todas las rutas a través de apiRouter bajo el prefijo /api
app.use('/api', apiRouter);
// Manejo de rutas no encontradas
app.use((_, res) => {
    res.status(404).send({ message: 'Resource not found' });
});
// Sincronizar schema (solo en desarrollo)
await syncSchema();
// Inicialización del servidor
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000/');
});
//# sourceMappingURL=app.js.map