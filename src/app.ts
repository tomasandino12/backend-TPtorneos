import 'dotenv/config';
import 'reflect-metadata';
import path from 'path';
import { RequestContext } from '@mikro-orm/core';
import cors from 'cors';
import express from 'express';
import { orm, syncSchema } from './shared/db/orm.js';
import { apiRouter } from './routes.js';
import { authMiddleware } from './middleware/auth.middleware.js';

export const app = express();

app.use(cors());

// Middleware para parsear JSON
app.use(express.json());

// RequestContext de MikroORM para cada request
app.use((req, res, next) => {
  RequestContext.create(orm.em, next);
});

// Archivos subidos (escudos, etc.) — fuera de /api para que no exijan Bearer token
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Montar todas las rutas a través de apiRouter bajo el prefijo /api
app.use('/api', authMiddleware, apiRouter);

// Manejo de rutas no encontradas
app.use((_, res) => {
  res.status(404).send({ message: 'Resource not found' });
});

// Sincronizar schema (solo en desarrollo/test — ver docs/backend/glosario.md)
await syncSchema();

// Los tests de integración (Vitest fija NODE_ENV=test automáticamente)
// importan `app` y le pegan con supertest directamente, sin bindear un
// puerto real — evita pisar el server de desarrollo que puede estar
// corriendo en el 3000 al mismo tiempo.
if (process.env.NODE_ENV !== 'test') {
  app.listen(3000, () => {
    console.log('Server running on http://localhost:3000/');
  });
}

