import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app.js';
import { orm } from '../shared/db/orm.js';
import { AdminTorneo } from '../adminTorneo/adminTorneo.entity.js';
import { Equipo } from '../equipo/equipo.entity.js';
import { Torneo } from '../torneo/torneo.entity.js';
import { Participacion } from '../participacion/participacion.entity.js';
import { Arbitro } from '../arbitro/arbitro.entity.js';
import { Cancha } from '../cancha/cancha.entity.js';
import { Partido } from '../partido/partido.entity.js';

/**
 * Test de integración: el CRUD base de Partido (POST/PUT/PATCH/DELETE, sin
 * contar /:id/resultado y /:id/programacion, que ya tenían protección) no
 * exigía ningún rol ni ownership — cualquier autenticado podía crear, editar
 * o borrar cualquier partido de cualquier torneo. Corregido con el mismo
 * patrón que actualizarResultado/actualizarProgramacion (partido.controler.ts).
 */
describe('CRUD de Partido — requireRole(admin) + ownership del torneo', () => {
  const sufijo = Date.now();
  let tokenDueño: string;
  let tokenOtroAdmin: string;
  let tokenJugador: string;
  let adminDueñoId: number;
  let adminOtroId: number;
  let torneoId: number;
  let partidoId: number;
  const idsEquipos: number[] = [];
  let arbitroId: number;
  let canchaId: number;

  beforeAll(async () => {
    const em = orm.em.fork();

    const adminDueño = em.create(AdminTorneo, {
      nombre: 'Dueño', apellido: `Test${sufijo}`, email: `admin-dueno-${sufijo}@example.com`,
      contraseña: 'no-se-usa', telefono: '0000000000',
    });
    const adminOtro = em.create(AdminTorneo, {
      nombre: 'Otro', apellido: `Test${sufijo}`, email: `admin-otro-${sufijo}@example.com`,
      contraseña: 'no-se-usa', telefono: '0000000000',
    });
    await em.persistAndFlush([adminDueño, adminOtro]);
    adminDueñoId = adminDueño.id!;
    adminOtroId = adminOtro.id!;
    tokenDueño = jwt.sign({ id: adminDueñoId, rol: 'admin' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
    tokenOtroAdmin = jwt.sign({ id: adminOtroId, rol: 'admin' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
    tokenJugador = jwt.sign({ id: 999999, rol: 'jugador' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });

    const arbitro = em.create(Arbitro, {
      nombre: 'Arb', apellido: `Test${sufijo}`, nro_matricula: `MAT-${sufijo}`, email: `arb-${sufijo}@example.com`,
    });
    const cancha = em.create(Cancha, {
      nombre: `Cancha ${sufijo}`, direccion: 'Calle Falsa 123', tipoSuperficie: 'cesped', capacidad: 20,
    });
    await em.persistAndFlush([arbitro, cancha]);
    arbitroId = arbitro.id!;
    canchaId = cancha.id!;

    const equipoLocal = em.create(Equipo, { nombreEquipo: `Local ${sufijo}`, colorPrimario: '#111', categoria: 'mayores' });
    const equipoVisitante = em.create(Equipo, { nombreEquipo: `Visitante ${sufijo}`, colorPrimario: '#222', categoria: 'mayores' });
    await em.persistAndFlush([equipoLocal, equipoVisitante]);
    idsEquipos.push(equipoLocal.id!, equipoVisitante.id!);

    const torneo = em.create(Torneo, {
      nombreTorneo: `Torneo Auth ${sufijo}`,
      fechaInicio: new Date('2025-01-01'),
      fechaFin: new Date('2025-06-01'),
      estado: 'en_curso',
      categoria: 'mayores',
      cantidadEquipos: 2,
      adminTorneo: em.getReference(AdminTorneo, adminDueñoId),
    });
    await em.persistAndFlush(torneo);
    torneoId = torneo.id!;

    const participacionLocal = em.create(Participacion, {
      equipo: em.getReference(Equipo, equipoLocal.id), torneo, fecha_inscripcion: new Date(),
    });
    const participacionVisitante = em.create(Participacion, {
      equipo: em.getReference(Equipo, equipoVisitante.id), torneo, fecha_inscripcion: new Date(),
    });
    await em.persistAndFlush([participacionLocal, participacionVisitante]);

    const partido = em.create(Partido, {
      torneo: torneoId,
      local: participacionLocal.id!,
      visitante: participacionVisitante.id!,
      fecha_partido: new Date('2025-02-01'),
      hora_partido: '15:00',
      estado_partido: 'programado',
      jornada: 1,
      goles_local: 0,
      goles_visitante: 0,
      walkover: false,
      cancha: canchaId,
      arbitro: arbitroId,
    });
    await em.persistAndFlush(partido);
    partidoId = partido.id!;
  });

  afterAll(async () => {
    const em = orm.em.fork();
    await em.nativeDelete(Partido, { torneo: torneoId });
    await em.nativeDelete(Participacion, { torneo: torneoId });
    await em.nativeDelete(Torneo, { id: torneoId });
    if (idsEquipos.length) await em.nativeDelete(Equipo, { id: { $in: idsEquipos } });
    await em.nativeDelete(Arbitro, { id: arbitroId });
    await em.nativeDelete(Cancha, { id: canchaId });
    await em.nativeDelete(AdminTorneo, { id: { $in: [adminDueñoId, adminOtroId] } });
    await orm.close(true);
  });

  it('rechaza POST /partidos de un jugador (sin rol admin)', async () => {
    const res = await request(app)
      .post('/api/partidos')
      .set('Authorization', `Bearer ${tokenJugador}`)
      .send({ torneo: torneoId, local: 1, visitante: 2, fecha_partido: '2025-03-01', hora_partido: '15:00', jornada: 2, estado_partido: 'programado' });
    expect(res.status).toBe(403);
  });

  it('rechaza PUT /partidos/:id de un admin que no es dueño del torneo', async () => {
    const res = await request(app)
      .put(`/api/partidos/${partidoId}`)
      .set('Authorization', `Bearer ${tokenOtroAdmin}`)
      .send({ jornada: 5 });
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('dueño');
  });

  it('rechaza DELETE /partidos/:id de un admin que no es dueño del torneo', async () => {
    const res = await request(app)
      .delete(`/api/partidos/${partidoId}`)
      .set('Authorization', `Bearer ${tokenOtroAdmin}`);
    expect(res.status).toBe(403);
  });

  it('permite PUT /partidos/:id al admin dueño del torneo', async () => {
    const res = await request(app)
      .put(`/api/partidos/${partidoId}`)
      .set('Authorization', `Bearer ${tokenDueño}`)
      .send({ jornada: 3 });
    expect(res.status).toBe(200);
    expect(res.body.data.jornada).toBe(3);
  });
});
