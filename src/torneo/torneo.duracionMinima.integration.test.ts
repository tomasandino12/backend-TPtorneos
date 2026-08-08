import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app.js';
import { orm } from '../shared/db/orm.js';
import { AdminTorneo } from '../adminTorneo/adminTorneo.entity.js';
import { Equipo } from '../equipo/equipo.entity.js';
import { Torneo } from '../torneo/torneo.entity.js';
import { Participacion } from '../participacion/participacion.entity.js';

/**
 * Test de integración: Regla 3 (duración mínima = 7 días × cantidad REAL de
 * equipos) tiene que validar contra `participaciones.length` (+1 al agregar
 * un equipo nuevo), nunca contra `Torneo.cantidadEquipos` — ese campo puede
 * desincronizarse de la realidad (se detectó un torneo con cantidadEquipos=0
 * y 12 equipos inscriptos de verdad).
 */
describe('Regla 3 — duración mínima usa el conteo real de participaciones', () => {
  const sufijo = Date.now();
  let adminToken: string;
  let adminId: number;
  const idsTorneosCreados: number[] = [];
  const idsEquiposCreados: number[] = [];

  beforeAll(async () => {
    const em = orm.em.fork();
    const admin = em.create(AdminTorneo, {
      nombre: 'Test', apellido: 'Duracion', email: `admin-duracion-${sufijo}@example.com`,
      contraseña: 'no-se-usa', telefono: '0000000000',
    });
    await em.persistAndFlush(admin);
    adminId = admin.id!;
    adminToken = jwt.sign({ id: adminId, rol: 'admin' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
  });

  afterAll(async () => {
    const em = orm.em.fork();
    if (idsTorneosCreados.length) {
      await em.nativeDelete(Participacion, { torneo: { $in: idsTorneosCreados } });
      await em.nativeDelete(Torneo, { id: { $in: idsTorneosCreados } });
    }
    if (idsEquiposCreados.length) await em.nativeDelete(Equipo, { id: { $in: idsEquiposCreados } });
    await em.nativeDelete(AdminTorneo, { id: adminId });
    await orm.close(true);
  });

  async function crearEquipo(nombre: string) {
    const em = orm.em.fork();
    const equipo = em.create(Equipo, { nombreEquipo: nombre, colorPrimario: '#123456', categoria: 'mayores' });
    await em.persistAndFlush(equipo);
    idsEquiposCreados.push(equipo.id!);
    return equipo.id!;
  }

  it('permite crear un torneo con cupo (cantidadEquipos) muy alto y duración corta — Regla 3 ya no se valida en la creación', async () => {
    // Con la regla vieja (7 días × cantidadEquipos declarado) esto requería
    // 7 × 99 = 693 días y hubiera sido rechazado. Con la regla nueva, al
    // crear el torneo el conteo real es 0, así que no hay mínimo que violar.
    const res = await request(app)
      .post('/api/torneo')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombreTorneo: `Torneo Corto ${sufijo}`,
        fechaInicio: '2025-01-01',
        fechaFin: '2025-01-10', // 9 días
        estado: 'inscripcion',
        categoria: 'mayores',
        cantidadEquipos: 99,
      });

    expect(res.status).toBe(201);
    idsTorneosCreados.push(res.body.data.id);
  });

  it('permite inscribir el primer equipo (1 equipo × 7 días = 7, entra en los 9 días) y rechaza el segundo (2 × 7 = 14, no entra)', async () => {
    const torneoId = idsTorneosCreados[0];
    const equipoUno = await crearEquipo(`Equipo Uno ${sufijo}`);
    const equipoDos = await crearEquipo(`Equipo Dos ${sufijo}`);

    const resUno = await request(app)
      .post('/api/participacion')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ equipo: equipoUno, torneo: torneoId, fecha_inscripcion: new Date().toISOString() });
    expect(resUno.status).toBe(201);

    const resDos = await request(app)
      .post('/api/participacion')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ equipo: equipoDos, torneo: torneoId, fecha_inscripcion: new Date().toISOString() });
    expect(resDos.status).toBe(400);
    expect(resDos.body.message).toContain('14');
  });

  it('PATCH /torneo/:id/fecha-fin rechaza una fecha fin que no alcanza para el conteo real de equipos ya en_curso', async () => {
    const em = orm.em.fork();
    const equipoA = await crearEquipo(`Equipo A ${sufijo}`);
    const equipoB = await crearEquipo(`Equipo B ${sufijo}`);
    const equipoC = await crearEquipo(`Equipo C ${sufijo}`);

    const torneo = em.create(Torneo, {
      nombreTorneo: `Torneo En Curso ${sufijo}`,
      fechaInicio: new Date('2025-01-01'),
      fechaFin: new Date('2025-02-01'), // 31 días, alcanza para 3 equipos (21)
      estado: 'en_curso',
      categoria: 'mayores',
      cantidadEquipos: 0, // deliberadamente desincronizado, como el caso real
      adminTorneo: em.getReference(AdminTorneo, adminId),
    });
    await em.persistAndFlush(torneo);
    idsTorneosCreados.push(torneo.id!);

    await em.persistAndFlush([
      em.create(Participacion, { equipo: em.getReference(Equipo, equipoA), torneo, fecha_inscripcion: new Date() }),
      em.create(Participacion, { equipo: em.getReference(Equipo, equipoB), torneo, fecha_inscripcion: new Date() }),
      em.create(Participacion, { equipo: em.getReference(Equipo, equipoC), torneo, fecha_inscripcion: new Date() }),
    ]);

    // 9 días para 3 equipos reales (requiere 21) -> debe rechazarse, aunque
    // cantidadEquipos (0) hubiera dado luz verde con la regla vieja.
    const resCorta = await request(app)
      .patch(`/api/torneo/${torneo.id}/fecha-fin`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fechaFin: '2025-01-10' });
    expect(resCorta.status).toBe(400);
    expect(resCorta.body.message).toContain('21');

    // 59 días alcanza de sobra para 3 equipos (21) -> se aplica directo.
    const resLarga = await request(app)
      .patch(`/api/torneo/${torneo.id}/fecha-fin`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fechaFin: '2025-03-01' });
    expect(resLarga.status).toBe(200);
  });
});
