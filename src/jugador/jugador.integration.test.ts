import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { orm } from '../shared/db/orm.js';
import { Jugador } from './jugador.entity.js';

/**
 * Test de integración: levanta la app Express real (con MikroORM conectado
 * a `gestordetorneos_test`, ver vitest.setup.ts) y le pega peticiones HTTP
 * de punta a punta con supertest — sin mockear nada de la capa de
 * autenticación, base de datos ni middlewares. Cubre el flujo completo
 * registro -> login -> acceso a una ruta protegida con el JWT real.
 */
describe('Flujo de integración: registro -> login -> perfil protegido', () => {
  const email = `integration-${Date.now()}@example.com`;
  const contraseña = 'ClaveDeTest123';

  afterAll(async () => {
    // Limpieza: no dejar el jugador de test dando vueltas en la base de test.
    await orm.em.fork().nativeDelete(Jugador, { email });
    await orm.close(true);
  });

  it('registra un jugador nuevo y devuelve un token', async () => {
    const res = await request(app)
      .post('/api/jugadores/registro')
      .send({
        nombre: 'Test',
        apellido: 'Integración',
        dni: `${Date.now()}`.slice(-8),
        email,
        fechaNacimiento: '2000-01-01',
        posicion: 'Delantero',
        contraseña,
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
  });

  it('rechaza el acceso a una ruta protegida sin token', async () => {
    const res = await request(app).get('/api/jugadores/por-admin/1');
    expect(res.status).toBe(401);
  });

  it('loguea con las credenciales recién registradas y accede a su propio perfil con el token', async () => {
    const loginRes = await request(app)
      .post('/api/jugadores/login')
      .send({ email, contraseña });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeTruthy();
    const token = loginRes.body.token as string;

    const porEmailRes = await request(app)
      .get(`/api/jugadores/by-email?email=${encodeURIComponent(email)}`)
      .set('Authorization', `Bearer ${token}`);

    expect(porEmailRes.status).toBe(200);
    const jugadorId = porEmailRes.body.data.id;

    const perfilRes = await request(app)
      .get(`/api/jugadores/${jugadorId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(perfilRes.status).toBe(200);
    expect(perfilRes.body.data.email).toBe(email);
    // El backend nunca debe devolver el hash de la contraseña en la respuesta.
    expect(perfilRes.body.data.contraseña).toBeUndefined();
  });
});
