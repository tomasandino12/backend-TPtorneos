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
 * Test de integración: PUT/PATCH/DELETE /participaciones/:id y POST
 * /participacion exigían requireRole('admin') pero no que el admin fuera
 * dueño del torneo de la participación — cualquier admin podía tocar
 * participaciones de torneos ajenos conociendo el id (issue #2, IDOR
 * horizontal). Corregido con cargarParticipacionDeAdminDueño (update/remove)
 * y el mismo chequeo inline en add (hallazgo adicional, ver pendientes.md #9).
 */
describe('Ownership de Participacion — PUT/PATCH/DELETE/POST', () => {
  const sufijo = Date.now();
  let tokenDueño: string;
  let tokenOtroAdmin: string;
  let adminDueñoId: number;
  let adminOtroId: number;
  let torneoDueñoId: number;
  let torneoOtroId: number;
  let nombreTorneoOtro: string;
  const idsEquipos: number[] = [];

  // ids de las participaciones pre-sembradas, cada una bajo torneoDueño con
  // un equipo propio para no chocar con el UNIQUE(torneo, equipo)
  let participacionCompartidaId: number; // PUT/PATCH ajeno (403) y propio (200)
  let participacionParaBorrarId: number; // DELETE ajeno (403) y propio (200)
  let participacionParaCambioTorneoId: number; // PUT torneo distinto (400) y mismo torneo (200)

  beforeAll(async () => {
    const em = orm.em.fork();

    const adminDueño = em.create(AdminTorneo, {
      nombre: 'Dueño', apellido: `Participacion${sufijo}`, email: `admin-part-dueno-${sufijo}@example.com`,
      contraseña: 'no-se-usa', telefono: '0000000000',
    });
    const adminOtro = em.create(AdminTorneo, {
      nombre: 'Otro', apellido: `Participacion${sufijo}`, email: `admin-part-otro-${sufijo}@example.com`,
      contraseña: 'no-se-usa', telefono: '0000000000',
    });
    await em.persistAndFlush([adminDueño, adminOtro]);
    adminDueñoId = adminDueño.id!;
    adminOtroId = adminOtro.id!;
    tokenDueño = jwt.sign({ id: adminDueñoId, rol: 'admin' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
    tokenOtroAdmin = jwt.sign({ id: adminOtroId, rol: 'admin' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });

    nombreTorneoOtro = `Torneo Ajeno Participacion ${sufijo}`;
    const torneoDueño = em.create(Torneo, {
      nombreTorneo: `Torneo Dueño Participacion ${sufijo}`,
      fechaInicio: new Date('2025-01-01'),
      fechaFin: new Date('2026-01-01'),
      estado: 'inscripcion',
      categoria: 'mayores',
      cantidadEquipos: 20,
      adminTorneo: adminDueño,
    });
    const torneoOtro = em.create(Torneo, {
      nombreTorneo: nombreTorneoOtro,
      fechaInicio: new Date('2025-01-01'),
      fechaFin: new Date('2026-01-01'),
      estado: 'inscripcion',
      categoria: 'mayores',
      cantidadEquipos: 20,
      adminTorneo: adminOtro,
    });
    await em.persistAndFlush([torneoDueño, torneoOtro]);
    torneoDueñoId = torneoDueño.id!;
    torneoOtroId = torneoOtro.id!;

    const equipoCompartido = em.create(Equipo, { nombreEquipo: `Eq Compartido ${sufijo}`, colorPrimario: '#111', categoria: 'mayores' });
    const equipoParaBorrar = em.create(Equipo, { nombreEquipo: `Eq ParaBorrar ${sufijo}`, colorPrimario: '#222', categoria: 'mayores' });
    const equipoParaCambioTorneo = em.create(Equipo, { nombreEquipo: `Eq CambioTorneo ${sufijo}`, colorPrimario: '#333', categoria: 'mayores' });
    await em.persistAndFlush([equipoCompartido, equipoParaBorrar, equipoParaCambioTorneo]);
    idsEquipos.push(equipoCompartido.id!, equipoParaBorrar.id!, equipoParaCambioTorneo.id!);

    const participacionCompartida = em.create(Participacion, {
      equipo: equipoCompartido, torneo: torneoDueño, fecha_inscripcion: new Date(),
    });
    const participacionParaBorrar = em.create(Participacion, {
      equipo: equipoParaBorrar, torneo: torneoDueño, fecha_inscripcion: new Date(),
    });
    const participacionParaCambioTorneo = em.create(Participacion, {
      equipo: equipoParaCambioTorneo, torneo: torneoDueño, fecha_inscripcion: new Date(),
    });
    await em.persistAndFlush([participacionCompartida, participacionParaBorrar, participacionParaCambioTorneo]);
    participacionCompartidaId = participacionCompartida.id!;
    participacionParaBorrarId = participacionParaBorrar.id!;
    participacionParaCambioTorneoId = participacionParaCambioTorneo.id!;
  });

  afterAll(async () => {
    const em = orm.em.fork();
    await em.nativeDelete(Participacion, { torneo: { $in: [torneoDueñoId, torneoOtroId] } });
    await em.nativeDelete(Torneo, { id: { $in: [torneoDueñoId, torneoOtroId] } });
    if (idsEquipos.length) await em.nativeDelete(Equipo, { id: { $in: idsEquipos } });
    await em.nativeDelete(AdminTorneo, { id: { $in: [adminDueñoId, adminOtroId] } });
    await orm.close(true);
  });

  describe('PUT /participaciones/:id', () => {
    it('rechaza con 403 a un admin que no es dueño del torneo, sin revelar datos del torneo ajeno', async () => {
      const res = await request(app)
        .put(`/api/participacion/${participacionCompartidaId}`)
        .set('Authorization', `Bearer ${tokenOtroAdmin}`)
        .send({ fecha_inscripcion: new Date().toISOString() });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('No tenés permiso para administrar participaciones de este torneo');
      expect(res.body.message).not.toContain(nombreTorneoOtro);
      expect(JSON.stringify(res.body)).not.toContain('adminTorneo');
    });

    it('permite al admin dueño del torneo', async () => {
      const nuevaFecha = new Date('2025-05-05').toISOString();
      const res = await request(app)
        .put(`/api/participacion/${participacionCompartidaId}`)
        .set('Authorization', `Bearer ${tokenDueño}`)
        .send({ fecha_inscripcion: nuevaFecha });

      expect(res.status).toBe(200);
    });

    it('devuelve 404 con un id de participación inexistente', async () => {
      const res = await request(app)
        .put('/api/participacion/999999999')
        .set('Authorization', `Bearer ${tokenDueño}`)
        .send({ fecha_inscripcion: new Date().toISOString() });

      expect(res.status).toBe(404);
    });

    it('rechaza con 400 si el body intenta cambiar el torneo de la participación', async () => {
      const res = await request(app)
        .put(`/api/participacion/${participacionParaCambioTorneoId}`)
        .set('Authorization', `Bearer ${tokenDueño}`)
        .send({ torneo: torneoOtroId });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('No se puede cambiar el torneo de una participación');
    });

    it('NO rechaza si el body manda el mismo torneo que ya tiene', async () => {
      const res = await request(app)
        .put(`/api/participacion/${participacionParaCambioTorneoId}`)
        .set('Authorization', `Bearer ${tokenDueño}`)
        .send({ torneo: torneoDueñoId });

      expect(res.status).toBe(200);
    });
  });

  describe('PATCH /participaciones/:id', () => {
    it('rechaza con 403 a un admin que no es dueño del torneo', async () => {
      const res = await request(app)
        .patch(`/api/participacion/${participacionCompartidaId}`)
        .set('Authorization', `Bearer ${tokenOtroAdmin}`)
        .send({ fecha_inscripcion: new Date().toISOString() });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('No tenés permiso para administrar participaciones de este torneo');
    });

    it('permite al admin dueño del torneo', async () => {
      const res = await request(app)
        .patch(`/api/participacion/${participacionCompartidaId}`)
        .set('Authorization', `Bearer ${tokenDueño}`)
        .send({ fecha_inscripcion: new Date('2025-06-06').toISOString() });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /participaciones/:id', () => {
    it('rechaza con 403 a un admin que no es dueño del torneo (y no borra la fila)', async () => {
      const res = await request(app)
        .delete(`/api/participacion/${participacionParaBorrarId}`)
        .set('Authorization', `Bearer ${tokenOtroAdmin}`);

      expect(res.status).toBe(403);

      const sigueExistiendo = await request(app)
        .get(`/api/participacion/${participacionParaBorrarId}`)
        .set('Authorization', `Bearer ${tokenDueño}`);
      expect(sigueExistiendo.status).toBe(200);
    });

    it('permite al admin dueño del torneo', async () => {
      const res = await request(app)
        .delete(`/api/participacion/${participacionParaBorrarId}`)
        .set('Authorization', `Bearer ${tokenDueño}`);

      expect(res.status).toBe(200);
    });

    it('devuelve 404 con un id de participación inexistente', async () => {
      const res = await request(app)
        .delete('/api/participacion/999999999')
        .set('Authorization', `Bearer ${tokenDueño}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /participacion — ownership del torneo destino (hallazgo adicional, parte D)', () => {
    it('rechaza con 403 la inscripción de un equipo en un torneo ajeno', async () => {
      const emLocal = orm.em.fork();
      const equipo = emLocal.create(Equipo, { nombreEquipo: `Eq PostAjeno ${sufijo}`, colorPrimario: '#444', categoria: 'mayores' });
      await emLocal.persistAndFlush(equipo);
      idsEquipos.push(equipo.id!);

      const res = await request(app)
        .post('/api/participacion')
        .set('Authorization', `Bearer ${tokenOtroAdmin}`)
        .send({ equipo: equipo.id, torneo: torneoDueñoId, fecha_inscripcion: new Date().toISOString() });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('No tenés permiso para inscribir equipos en este torneo');
    });

    it('permite la inscripción de un equipo en un torneo propio', async () => {
      const emLocal = orm.em.fork();
      const equipo = emLocal.create(Equipo, { nombreEquipo: `Eq PostPropio ${sufijo}`, colorPrimario: '#555', categoria: 'mayores' });
      await emLocal.persistAndFlush(equipo);
      idsEquipos.push(equipo.id!);

      const res = await request(app)
        .post('/api/participacion')
        .set('Authorization', `Bearer ${tokenDueño}`)
        .send({ equipo: equipo.id, torneo: torneoDueñoId, fecha_inscripcion: new Date().toISOString() });

      expect(res.status).toBe(201);
    });
  });
});
