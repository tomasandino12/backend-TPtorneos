import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app.js';
import { orm } from '../shared/db/orm.js';
import { AdminTorneo } from '../adminTorneo/adminTorneo.entity.js';
import { Equipo } from '../equipo/equipo.entity.js';
import { Torneo } from '../torneo/torneo.entity.js';
import { Participacion } from './participacion.entity.js';

/**
 * Test de integración: levanta la app Express real (con MikroORM conectado a
 * `gestordetorneos_test`) y verifica la regla de negocio "un equipo no puede
 * inscribirse en un torneo cuyas fechas se superponen con las de otro torneo
 * en el que ya participa" (participacion.controler.ts, Validación 3).
 *
 * Torneo base del equipo: 01/01/2025 - 01/03/2025.
 */
describe('POST /api/participacion — superposición de fechas entre torneos', () => {
  const sufijo = Date.now();
  let adminToken: string;
  let adminId: number;
  let equipoId: number;
  let torneoBaseId: number;
  const idsTorneosCreados: number[] = [];

  beforeAll(async () => {
    const em = orm.em.fork();

    const admin = em.create(AdminTorneo, {
      nombre: 'Test',
      apellido: 'Fechas',
      email: `admin-fechas-${sufijo}@example.com`,
      contraseña: 'no-se-usa-en-este-test',
      telefono: '0000000000',
    });
    const equipo = em.create(Equipo, {
      nombreEquipo: `Equipo Fechas ${sufijo}`,
      colorPrimario: '#000000',
      categoria: 'mayores',
    });
    await em.persistAndFlush([admin, equipo]);

    const torneoBase = em.create(Torneo, {
      nombreTorneo: `Torneo Apertura ${sufijo}`,
      fechaInicio: new Date('2025-01-01'),
      fechaFin: new Date('2025-03-01'),
      estado: 'inscripcion',
      categoria: 'mayores',
      adminTorneo: admin,
    });
    await em.persistAndFlush(torneoBase);

    em.create(Participacion, { equipo, torneo: torneoBase, fecha_inscripcion: new Date() });
    await em.flush();

    adminId = admin.id!;
    equipoId = equipo.id!;
    torneoBaseId = torneoBase.id!;
    idsTorneosCreados.push(torneoBaseId);

    // Se firma el JWT directo (mismo secreto que usa la app en .env.test) en
    // vez de pasar por /adminTorneo/login — evita depender del flujo de
    // hasheo de contraseña, que no es lo que este test verifica.
    adminToken = jwt.sign({ id: adminId, rol: 'admin' }, process.env.JWT_SECRET as string, {
      expiresIn: '1h',
    });
  });

  afterAll(async () => {
    const em = orm.em.fork();
    await em.nativeDelete(Participacion, { equipo: equipoId });
    if (idsTorneosCreados.length) await em.nativeDelete(Torneo, { id: { $in: idsTorneosCreados } });
    await em.nativeDelete(Equipo, { id: equipoId });
    await em.nativeDelete(AdminTorneo, { id: adminId });
    await orm.close(true);
  });

  /** Crea un torneo adicional (misma categoría, mismo admin) directo por ORM
   * — evita pasar por el endpoint de creación, que no es lo que se testea. */
  async function crearTorneo(nombre: string, fechaInicio: string, fechaFin: string) {
    const em = orm.em.fork();
    const torneo = em.create(Torneo, {
      nombreTorneo: nombre,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      estado: 'inscripcion',
      categoria: 'mayores',
      adminTorneo: em.getReference(AdminTorneo, adminId),
    });
    await em.persistAndFlush(torneo);
    idsTorneosCreados.push(torneo.id!);
    return torneo.id!;
  }

  it('rechaza con 409 la inscripción a un torneo cuyas fechas se superponen con el torneo donde el equipo ya participa', async () => {
    // 15/02/2025 - 01/04/2025: arranca DENTRO del rango del torneo base (01/01 - 01/03) -> se superponen.
    const torneoSolapadoId = await crearTorneo(`Torneo Solapado ${sufijo}`, '2025-02-15', '2025-04-01');

    const res = await request(app)
      .post('/api/participacion')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ equipo: equipoId, torneo: torneoSolapadoId, fecha_inscripcion: new Date().toISOString() });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('Torneo Apertura');
    expect(res.body.message).toContain('01/03/2025');
  });

  it('permite la inscripción a un torneo cuyas fechas NO se superponen con el torneo donde el equipo ya participa', async () => {
    // 01/04/2025 - 01/06/2025: arranca DESPUÉS de que termina el torneo base (01/03) -> no se superponen.
    const torneoLibreId = await crearTorneo(`Torneo Libre ${sufijo}`, '2025-04-01', '2025-06-01');

    const res = await request(app)
      .post('/api/participacion')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ equipo: equipoId, torneo: torneoLibreId, fecha_inscripcion: new Date().toISOString() });

    expect(res.status).toBe(201);
  });
});
