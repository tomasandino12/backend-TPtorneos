import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app.js';
import { orm } from '../shared/db/orm.js';
import { AdminTorneo } from '../adminTorneo/adminTorneo.entity.js';
import { Equipo } from '../equipo/equipo.entity.js';
import { Torneo } from '../torneo/torneo.entity.js';
import { Cancha } from '../cancha/cancha.entity.js';
import { Arbitro } from '../arbitro/arbitro.entity.js';
import { Jugador } from '../jugador/jugador.entity.js';
import { Participacion } from '../participacion/participacion.entity.js';
import { Partido } from '../partido/partido.entity.js';
import { Notificacion } from '../notificacion/notificacion.entity.js';
import { Suspension } from '../suspension/suspension.entity.js';
import { TorneoArbitro } from '../torneoArbitro/torneoArbitro.entity.js';
import { TorneoCancha } from '../torneoCancha/torneoCancha.entity.js';

/**
 * Test de integración: levanta la app Express real contra `gestordetorneos_test`
 * y verifica que DELETE /api/torneo/:id borra en cascada TODO lo que depende
 * del torneo (Partido, Participacion, Notificacion, Suspension, TorneoArbitro,
 * TorneoCancha) sin dejar registros huérfanos, y sin tocar lo que NO depende
 * de él (Equipo, Cancha, Arbitro, Jugador, AdminTorneo).
 */
describe('DELETE /api/torneo/:id — borrado en cascada', () => {
  const sufijo = Date.now();
  let adminToken: string;
  let adminId: number;
  let torneoId: number;
  let equipoAId: number;
  let equipoBId: number;
  let canchaId: number;
  let arbitroId: number;
  let jugadorId: number;

  beforeAll(async () => {
    const em = orm.em.fork();

    const admin = em.create(AdminTorneo, {
      nombre: 'Test',
      apellido: 'Cascada',
      email: `admin-cascada-${sufijo}@example.com`,
      contraseña: 'no-se-usa-en-este-test',
      telefono: '0000000000',
    });
    const equipoA = em.create(Equipo, { nombreEquipo: `Equipo A ${sufijo}`, colorPrimario: '#111111', categoria: 'mayores' });
    const equipoB = em.create(Equipo, { nombreEquipo: `Equipo B ${sufijo}`, colorPrimario: '#222222', categoria: 'mayores' });
    const cancha = em.create(Cancha, {
      nombre: `Cancha Cascada ${sufijo}`, direccion: 'Calle Falsa 123',
      tipoSuperficie: 'césped', capacidad: 500,
    });
    const arbitro = em.create(Arbitro, {
      nombre: 'Ref', apellido: `Cascada ${sufijo}`, nro_matricula: `M-${sufijo}`, email: `arbitro-cascada-${sufijo}@example.com`,
    });
    const jugador = em.create(Jugador, {
      nombre: 'Jugador', apellido: `Cascada ${sufijo}`, dni: `${sufijo}`.slice(-8),
      email: `jugador-cascada-${sufijo}@example.com`, fechaNacimiento: '2000-01-01',
      contraseña: 'no-se-usa', posicion: 'Delantero',
    });
    await em.persistAndFlush([admin, equipoA, equipoB, cancha, arbitro, jugador]);

    const torneo = em.create(Torneo, {
      nombreTorneo: `Torneo Cascada ${sufijo}`,
      fechaInicio: new Date('2025-01-01'),
      fechaFin: new Date('2025-03-01'),
      estado: 'inscripcion',
      categoria: 'mayores',
      adminTorneo: admin,
    });
    await em.persistAndFlush(torneo);

    const participacionA = em.create(Participacion, { equipo: equipoA, torneo, fecha_inscripcion: new Date() });
    const participacionB = em.create(Participacion, { equipo: equipoB, torneo, fecha_inscripcion: new Date() });
    await em.persistAndFlush([participacionA, participacionB]);

    const partido = em.create(Partido, {
      torneo, cancha, arbitro, local: participacionA, visitante: participacionB,
      fecha_partido: new Date('2025-01-15'), hora_partido: '15:00',
      estado_partido: 'programado', jornada: 1, goles_local: 0, goles_visitante: 0,
    });
    const notificacion = em.create(Notificacion, {
      jugador, torneo, tipo: 'aviso', mensaje: 'Aviso de prueba', leida: false, fecha: new Date(),
    });
    const suspension = em.create(Suspension, {
      jugador, torneo, motivo: 'Prueba de cascada', fecha: new Date(), activa: true,
    });
    const torneoArbitro = em.create(TorneoArbitro, { torneo, arbitro });
    const torneoCancha = em.create(TorneoCancha, { torneo, cancha });
    await em.persistAndFlush([partido, notificacion, suspension, torneoArbitro, torneoCancha]);

    adminId = admin.id!;
    torneoId = torneo.id!;
    equipoAId = equipoA.id!;
    equipoBId = equipoB.id!;
    canchaId = cancha.id!;
    arbitroId = arbitro.id!;
    jugadorId = jugador.id!;

    adminToken = jwt.sign({ id: adminId, rol: 'admin' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
  });

  afterAll(async () => {
    const em = orm.em.fork();
    // El torneo y todo lo que dependía de él ya deberían estar borrados por
    // el propio endpoint; esto solo limpia lo que el test creó aparte.
    await em.nativeDelete(Jugador, { id: jugadorId });
    await em.nativeDelete(Equipo, { id: { $in: [equipoAId, equipoBId] } });
    await em.nativeDelete(Cancha, { id: canchaId });
    await em.nativeDelete(Arbitro, { id: arbitroId });
    await em.nativeDelete(AdminTorneo, { id: adminId });
    await orm.close(true);
  });

  it('borra el torneo y todo lo que depende de él, sin dejar registros huérfanos ni tocar lo que no depende de él', async () => {
    const res = await request(app)
      .delete(`/api/torneo/${torneoId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      participaciones: 2,
      partidos: 1,
      notificaciones: 1,
      suspensiones: 1,
      arbitrosAsignados: 1,
      canchasAsignadas: 1,
    });
    expect(res.body.message).toContain('Torneo Cascada');

    const em = orm.em.fork();
    // Nada de lo que dependía del torneo debe quedar huérfano.
    expect(await em.count(Torneo, { id: torneoId })).toBe(0);
    expect(await em.count(Partido, { torneo: torneoId })).toBe(0);
    expect(await em.count(Participacion, { torneo: torneoId })).toBe(0);
    expect(await em.count(Notificacion, { torneo: torneoId })).toBe(0);
    expect(await em.count(Suspension, { torneo: torneoId })).toBe(0);
    expect(await em.count(TorneoArbitro, { torneo: torneoId })).toBe(0);
    expect(await em.count(TorneoCancha, { torneo: torneoId })).toBe(0);

    // Lo que NO depende del torneo tiene que seguir existiendo intacto.
    expect(await em.count(Equipo, { id: { $in: [equipoAId, equipoBId] } })).toBe(2);
    expect(await em.count(Cancha, { id: canchaId })).toBe(1);
    expect(await em.count(Arbitro, { id: arbitroId })).toBe(1);
    expect(await em.count(Jugador, { id: jugadorId })).toBe(1);
  });

  it('devuelve 404 si se intenta borrar un torneo que ya no existe', async () => {
    const res = await request(app)
      .delete(`/api/torneo/${torneoId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
