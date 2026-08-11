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
import { TorneoArbitro } from '../torneoArbitro/torneoArbitro.entity.js';
import { TorneoCancha } from '../torneoCancha/torneoCancha.entity.js';

/**
 * Test de integración: setArbitros/setCanchas (torneo.controler.ts) tienen
 * que rechazar un set de tamaño 1 o 2 (mínimo 3), y cuando se saca un
 * árbitro/cancha que tenía partidos 'programado' asignados, esos partidos se
 * tienen que reasignar automáticamente a uno de los que quedan — un partido
 * 'finalizado' con el mismo árbitro/cancha removido no se toca.
 */
describe('setArbitros/setCanchas — mínimo 3 y reasignación automática', () => {
  const sufijo = Date.now();
  let adminToken: string;
  let adminId: number;
  let torneoId: number;
  const idsArbitros: number[] = [];
  const idsCanchas: number[] = [];
  const idsEquipos: number[] = [];
  const idsPartidos: number[] = [];
  let participacionLocalId: number;
  let participacionVisitanteId: number;

  beforeAll(async () => {
    const em = orm.em.fork();

    const admin = em.create(AdminTorneo, {
      nombre: 'Test', apellido: 'ArbCancha', email: `admin-arbcancha-${sufijo}@example.com`,
      contraseña: 'no-se-usa', telefono: '0000000000',
    });
    await em.persistAndFlush(admin);
    adminId = admin.id!;
    adminToken = jwt.sign({ id: adminId, rol: 'admin' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });

    for (let i = 1; i <= 4; i++) {
      const arbitro = em.create(Arbitro, {
        nombre: `Arbitro${i}`, apellido: `Test${sufijo}`, nro_matricula: `MAT-${sufijo}-${i}`, email: `arbitro${i}-${sufijo}@example.com`,
      });
      const cancha = em.create(Cancha, {
        nombre: `Cancha${i}-${sufijo}`, direccion: 'Calle Falsa 123', tipoSuperficie: 'cesped', capacidad: 20,
      });
      await em.persistAndFlush([arbitro, cancha]);
      idsArbitros.push(arbitro.id!);
      idsCanchas.push(cancha.id!);
    }

    const equipoLocal = em.create(Equipo, { nombreEquipo: `Local ${sufijo}`, colorPrimario: '#111111', categoria: 'mayores' });
    const equipoVisitante = em.create(Equipo, { nombreEquipo: `Visitante ${sufijo}`, colorPrimario: '#222222', categoria: 'mayores' });
    await em.persistAndFlush([equipoLocal, equipoVisitante]);
    idsEquipos.push(equipoLocal.id!, equipoVisitante.id!);

    const torneo = em.create(Torneo, {
      nombreTorneo: `Torneo ArbCancha ${sufijo}`,
      fechaInicio: new Date('2025-01-01'),
      fechaFin: new Date('2025-06-01'),
      estado: 'en_curso',
      categoria: 'mayores',
      cantidadEquipos: 2,
      adminTorneo: em.getReference(AdminTorneo, adminId),
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
    participacionLocalId = participacionLocal.id!;
    participacionVisitanteId = participacionVisitante.id!;
  });

  afterAll(async () => {
    const em = orm.em.fork();
    if (idsPartidos.length) await em.nativeDelete(Partido, { id: { $in: idsPartidos } });
    await em.nativeDelete(TorneoArbitro, { torneo: torneoId });
    await em.nativeDelete(TorneoCancha, { torneo: torneoId });
    await em.nativeDelete(Participacion, { torneo: torneoId });
    await em.nativeDelete(Torneo, { id: torneoId });
    if (idsEquipos.length) await em.nativeDelete(Equipo, { id: { $in: idsEquipos } });
    await em.nativeDelete(Arbitro, { id: { $in: idsArbitros } });
    await em.nativeDelete(Cancha, { id: { $in: idsCanchas } });
    await em.nativeDelete(AdminTorneo, { id: adminId });
    await orm.close(true);
  });

  it('PUT /torneo/:id/arbitros rechaza un set de 2 (por debajo del mínimo de 3)', async () => {
    const res = await request(app)
      .put(`/api/torneo/${torneoId}/arbitros`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ arbitroIds: [idsArbitros[0], idsArbitros[1]] });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('3');
  });

  it('PUT /torneo/:id/arbitros acepta un set de 4 sin reasignar nada (todavía no hay partidos)', async () => {
    const res = await request(app)
      .put(`/api/torneo/${torneoId}/arbitros`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ arbitroIds: idsArbitros });

    expect(res.status).toBe(200);
    expect(res.body.data.partidosReasignados).toHaveLength(0);
  });

  it('PUT /torneo/:id/canchas acepta un set de 4 sin reasignar nada', async () => {
    const res = await request(app)
      .put(`/api/torneo/${torneoId}/canchas`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ canchaIds: idsCanchas });

    expect(res.status).toBe(200);
    expect(res.body.data.partidosReasignados).toHaveLength(0);
  });

  it('reasigna un partido "programado" al sacar su árbitro/cancha, y no toca uno "finalizado"', async () => {
    const em = orm.em.fork();
    const arbitroASacar = idsArbitros[3]; // el 4to, se saca en el próximo PUT
    const canchaASacar = idsCanchas[3];

    const partidoProgramado = em.create(Partido, {
      torneo: torneoId,
      local: participacionLocalId,
      visitante: participacionVisitanteId,
      fecha_partido: new Date('2025-02-01'),
      hora_partido: '15:00',
      estado_partido: 'programado',
      jornada: 1,
      goles_local: 0,
      goles_visitante: 0,
      walkover: false,
      cancha: canchaASacar,
      arbitro: arbitroASacar,
    });
    const partidoFinalizado = em.create(Partido, {
      torneo: torneoId,
      local: participacionLocalId,
      visitante: participacionVisitanteId,
      fecha_partido: new Date('2025-01-15'),
      hora_partido: '15:00',
      estado_partido: 'finalizado',
      jornada: 2,
      goles_local: 2,
      goles_visitante: 1,
      walkover: false,
      cancha: canchaASacar,
      arbitro: arbitroASacar,
    });
    await em.persistAndFlush([partidoProgramado, partidoFinalizado]);
    idsPartidos.push(partidoProgramado.id!, partidoFinalizado.id!);

    const idsArbitrosRestantes = idsArbitros.slice(0, 3);
    const idsCanchasRestantes = idsCanchas.slice(0, 3);

    const resArbitros = await request(app)
      .put(`/api/torneo/${torneoId}/arbitros`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ arbitroIds: idsArbitrosRestantes });
    expect(resArbitros.status).toBe(200);
    expect(resArbitros.body.data.partidosReasignados).toHaveLength(1);
    const reasignacionArbitro = resArbitros.body.data.partidosReasignados[0];
    expect(reasignacionArbitro.partidoId).toBe(partidoProgramado.id);
    expect(reasignacionArbitro.arbitroAnteriorId).toBe(arbitroASacar);
    expect(idsArbitrosRestantes).toContain(reasignacionArbitro.arbitroNuevoId);
    expect(reasignacionArbitro.arbitroNuevoId).not.toBe(arbitroASacar);

    const resCanchas = await request(app)
      .put(`/api/torneo/${torneoId}/canchas`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ canchaIds: idsCanchasRestantes });
    expect(resCanchas.status).toBe(200);
    expect(resCanchas.body.data.partidosReasignados).toHaveLength(1);
    const reasignacionCancha = resCanchas.body.data.partidosReasignados[0];
    expect(reasignacionCancha.canchaAnteriorId).toBe(canchaASacar);
    expect(idsCanchasRestantes).toContain(reasignacionCancha.canchaNuevaId);
    expect(reasignacionCancha.canchaNuevaId).not.toBe(canchaASacar);

    const emVerif = orm.em.fork();
    const progActualizado = await emVerif.findOneOrFail(Partido, { id: partidoProgramado.id }, { populate: ['arbitro', 'cancha'] });
    expect(idsArbitrosRestantes).toContain(progActualizado.arbitro.id);
    expect(idsCanchasRestantes).toContain(progActualizado.cancha.id);

    const finActualizado = await emVerif.findOneOrFail(Partido, { id: partidoFinalizado.id }, { populate: ['arbitro', 'cancha'] });
    expect(finActualizado.arbitro.id).toBe(arbitroASacar);
    expect(finActualizado.cancha.id).toBe(canchaASacar);
  });

  it('no permite bajar de 3 a 2 una vez en el mínimo', async () => {
    const res = await request(app)
      .put(`/api/torneo/${torneoId}/arbitros`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ arbitroIds: idsArbitros.slice(0, 2) });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('3');
  });
});
