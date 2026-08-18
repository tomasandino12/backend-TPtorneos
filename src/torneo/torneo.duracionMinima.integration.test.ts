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
 * Test de integración: Regla 3 — duración mínima = (cantidad de jornadas - 1)
 * × 4 días, donde la cantidad de jornadas sale del mismo cálculo round-robin
 * que usa generarFixture (ver calcularCantidadJornadas() en
 * torneo.controler.ts), no de "7 días × cantidad de equipos" (fórmula vieja).
 *
 * Para 8 equipos "ida": 7 jornadas -> mínimo (7-1)×4 = 24 días.
 * Para 3 equipos "ida": 3 jornadas -> mínimo (3-1)×4 = 8 días.
 *
 * Se valida en 3 puntos de entrada distintos:
 * - POST /torneo (creación): contra `cantidadEquipos` (el cupo declarado),
 *   porque en ese momento el conteo real de participaciones siempre es 0.
 * - POST /participacion (alta de equipo) y PATCH /torneo/:id/fecha-fin:
 *   contra el conteo REAL de participaciones — nunca contra
 *   `Torneo.cantidadEquipos`, que puede desincronizarse de la realidad.
 */
describe('Regla 3 — duración mínima = (jornadas - 1) × 4 días', () => {
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

  describe('POST /torneo (creación) — contra cantidadEquipos, el cupo declarado', () => {
    it('rechaza con 409 si la duración no alcanza para las jornadas que necesita el cupo declarado', async () => {
      // 8 equipos "ida" -> 7 jornadas -> mínimo 24 días. Acá van solo 20.
      const res = await request(app)
        .post('/api/torneo')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombreTorneo: `Torneo Corto ${sufijo}`,
          fechaInicio: '2025-01-01',
          fechaFin: '2025-01-21', // 20 días
          estado: 'inscripcion',
          categoria: 'mayores',
          cantidadEquipos: 8,
          formato: 'ida',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('7 jornada(s)');
      expect(res.body.message).toContain('24 día(s)');
      expect(res.body.message).toContain('20 día(s)');
      // No se creó nada, nada que limpiar en afterAll.
    });

    it('permite crear el torneo si la duración alcanza exactamente el mínimo requerido', async () => {
      // 8 equipos "ida" -> 7 jornadas -> mínimo 24 días, exactos.
      const res = await request(app)
        .post('/api/torneo')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombreTorneo: `Torneo Justo ${sufijo}`,
          fechaInicio: '2025-01-01',
          fechaFin: '2025-01-25', // 24 días
          estado: 'inscripcion',
          categoria: 'mayores',
          cantidadEquipos: 8,
          formato: 'ida',
        });

      expect(res.status).toBe(201);
      idsTorneosCreados.push(res.body.data.id);
    });
  });

  describe('POST /participacion (alta de equipo) — contra el conteo REAL de participaciones', () => {
    it('inscribe equipos mientras la duración real alcance para las jornadas que necesita el conteo real, y rechaza cuando deja de alcanzar', async () => {
      // Torneo creado directo por ORM (no pasa por la validación de creación,
      // igual que ya hacía este archivo) con cantidadEquipos deliberadamente
      // desincronizado del conteo real, para aislar específicamente la
      // validación de participacion.controler.ts add(). Duración: 7 días.
      // 1er equipo (1 jornada, mínimo 0 días) y 2do equipo (2 equipos =
      // todavía 1 jornada, mínimo 0 días) entran; el 3ro (3 equipos = 3
      // jornadas, mínimo 8 días) ya no entra en los 7 días reales.
      const em = orm.em.fork();
      const torneo = em.create(Torneo, {
        nombreTorneo: `Torneo Progresivo ${sufijo}`,
        fechaInicio: new Date('2025-01-01'),
        fechaFin: new Date('2025-01-08'), // 7 días
        estado: 'inscripcion',
        categoria: 'mayores',
        formato: 'ida',
        cantidadEquipos: 50, // desincronizado a propósito, como el caso real
        adminTorneo: em.getReference(AdminTorneo, adminId),
      });
      await em.persistAndFlush(torneo);
      idsTorneosCreados.push(torneo.id!);

      const equipoUno = await crearEquipo(`Equipo Uno ${sufijo}`);
      const equipoDos = await crearEquipo(`Equipo Dos ${sufijo}`);
      const equipoTres = await crearEquipo(`Equipo Tres ${sufijo}`);

      const resUno = await request(app)
        .post('/api/participacion')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ equipo: equipoUno, torneo: torneo.id, fecha_inscripcion: new Date().toISOString() });
      expect(resUno.status).toBe(201);

      const resDos = await request(app)
        .post('/api/participacion')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ equipo: equipoDos, torneo: torneo.id, fecha_inscripcion: new Date().toISOString() });
      expect(resDos.status).toBe(201);

      const resTres = await request(app)
        .post('/api/participacion')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ equipo: equipoTres, torneo: torneo.id, fecha_inscripcion: new Date().toISOString() });
      expect(resTres.status).toBe(400);
      expect(resTres.body.message).toContain('3 jornada(s)');
      expect(resTres.body.message).toContain('8 día(s)');
      expect(resTres.body.message).toContain('7 día(s)');
    });
  });

  describe('PATCH /torneo/:id/fecha-fin — contra el conteo REAL de participaciones', () => {
    it('rechaza extender a una fecha fin que no alcanza para el conteo real de equipos ya en_curso, y permite una que sí alcanza', async () => {
      const em = orm.em.fork();
      const equipoA = await crearEquipo(`Equipo A ${sufijo}`);
      const equipoB = await crearEquipo(`Equipo B ${sufijo}`);
      const equipoC = await crearEquipo(`Equipo C ${sufijo}`);

      const torneo = em.create(Torneo, {
        nombreTorneo: `Torneo En Curso ${sufijo}`,
        fechaInicio: new Date('2025-01-01'),
        fechaFin: new Date('2025-02-01'),
        estado: 'en_curso',
        categoria: 'mayores',
        formato: 'ida',
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

      // 3 equipos "ida" -> 3 jornadas -> mínimo 8 días. 4 días no alcanza,
      // aunque cantidadEquipos (0) hubiera dado luz verde con la regla vieja.
      const resCorta = await request(app)
        .patch(`/api/torneo/${torneo.id}/fecha-fin`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fechaFin: '2025-01-05' }); // 4 días
      expect(resCorta.status).toBe(400);
      expect(resCorta.body.message).toContain('3 jornada(s)');
      expect(resCorta.body.message).toContain('8 día(s)');

      // 8 días exactos alcanzan justo -> se aplica directo.
      const resLarga = await request(app)
        .patch(`/api/torneo/${torneo.id}/fecha-fin`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fechaFin: '2025-01-09' }); // 8 días
      expect(resLarga.status).toBe(200);
    });
  });
});
