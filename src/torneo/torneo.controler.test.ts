import { describe, it, expect } from 'vitest';
import { generarRondas, elegirReemplazoMenosCargado, calcularCantidadJornadas, validarDuracionMinima } from './torneo.controler.js';
import type { Participacion } from '../participacion/participacion.entity.js';

/** Helper: arma participaciones "de mentira" (solo con id, que es lo único
 * que generarRondas() necesita) sin tener que instanciar la entidad real. */
function participacionesFake(cantidad: number): Participacion[] {
  return Array.from({ length: cantidad }, (_, i) => ({ id: i + 1 }) as Participacion);
}

describe('generarRondas (round-robin del fixture)', () => {
  it('con 4 equipos y formato "ida" genera 3 jornadas de 2 partidos cada una', () => {
    const rondas = generarRondas(participacionesFake(4), 'ida');

    expect(rondas).toHaveLength(3);
    rondas.forEach((jornada) => expect(jornada).toHaveLength(2));
  });

  it('ningún equipo juega contra sí mismo, y cada par de equipos se enfrenta exactamente una vez en "ida"', () => {
    const equipos = participacionesFake(4);
    const rondas = generarRondas(equipos, 'ida');

    const paresVistos = new Set<string>();
    for (const jornada of rondas) {
      for (const [local, visitante] of jornada) {
        expect(local.id).not.toBe(visitante.id);

        const clave = [local.id, visitante.id].sort().join('-');
        expect(paresVistos.has(clave)).toBe(false);
        paresVistos.add(clave);
      }
    }

    // Con 4 equipos hay C(4,2) = 6 pares posibles, y "ida" los cubre todos una vez.
    expect(paresVistos.size).toBe(6);
  });

  it('con cantidad impar de equipos, cada jornada tiene un "bye" (un equipo libre)', () => {
    const rondas = generarRondas(participacionesFake(3), 'ida');

    // 3 equipos -> se agrega 1 bye -> total par (4) -> 3 jornadas de a 1 partido
    // (el cuarto "equipo" es el bye, que generarRondas descarta del par).
    expect(rondas).toHaveLength(3);
    rondas.forEach((jornada) => expect(jornada).toHaveLength(1));
  });

  it('"idayvuelta" duplica la cantidad de jornadas de "ida", con local/visitante invertidos en la vuelta', () => {
    const equipos = participacionesFake(4);
    const rondasIda = generarRondas(equipos, 'ida');
    const rondasIdaYVuelta = generarRondas(equipos, 'idayvuelta');

    expect(rondasIdaYVuelta).toHaveLength(rondasIda.length * 2);

    // La primera jornada de la "vuelta" (mitad de vuelta del array) es la
    // primera jornada de "ida" con local y visitante invertidos.
    const primeraJornadaIda = rondasIda[0];
    const primeraJornadaVuelta = rondasIdaYVuelta[rondasIda.length];

    primeraJornadaIda.forEach(([local, visitante], i) => {
      expect(primeraJornadaVuelta[i][0].id).toBe(visitante.id);
      expect(primeraJornadaVuelta[i][1].id).toBe(local.id);
    });
  });
});

describe('calcularCantidadJornadas (reutiliza generarRondas, no reimplementa el cálculo)', () => {
  it('2 equipos "ida" -> 1 jornada', () => {
    expect(calcularCantidadJornadas(2, 'ida')).toBe(1);
  });

  it('4 equipos "ida" -> 3 jornadas', () => {
    expect(calcularCantidadJornadas(4, 'ida')).toBe(3);
  });

  it('cantidad impar (3 equipos, con bye) da la misma cantidad de jornadas que la cantidad par siguiente (4)', () => {
    expect(calcularCantidadJornadas(3, 'ida')).toBe(calcularCantidadJornadas(4, 'ida'));
    expect(calcularCantidadJornadas(3, 'ida')).toBe(3);
  });

  it('8 equipos "ida" -> 7 jornadas', () => {
    expect(calcularCantidadJornadas(8, 'ida')).toBe(7);
  });

  it('"idayvuelta" duplica la cantidad de jornadas de "ida"', () => {
    expect(calcularCantidadJornadas(8, 'idayvuelta')).toBe(14);
  });

  it('menos de 2 equipos -> 0 jornadas', () => {
    expect(calcularCantidadJornadas(0, 'ida')).toBe(0);
  });
});

describe('validarDuracionMinima (Regla 3: (jornadas - 1) × 4 días entre jornadas)', () => {
  it('8 equipos "ida" (7 jornadas, mínimo 24 días) con exactamente 24 días de duración: no rechaza', () => {
    const error = validarDuracionMinima(new Date('2025-01-01'), new Date('2025-01-25'), 8, 'ida');
    expect(error).toBeNull();
  });

  it('8 equipos "ida" con 20 días de duración (menos que el mínimo de 24): rechaza con los números reales', () => {
    const error = validarDuracionMinima(new Date('2025-01-01'), new Date('2025-01-21'), 8, 'ida');
    expect(error).not.toBeNull();
    expect(error).toContain('7 jornada(s)');
    expect(error).toContain('8 equipos');
    expect(error).toContain('24 día(s)');
    expect(error).toContain('20 día(s)');
  });

  it('2 equipos (1 jornada, mínimo 0 días) con duración 0: no rechaza — no hace falta separación entre jornadas', () => {
    const error = validarDuracionMinima(new Date('2025-01-01'), new Date('2025-01-01'), 2, 'ida');
    expect(error).toBeNull();
  });

  it('mismo cupo, pero "idayvuelta" exige el doble de días que "ida"', () => {
    const errorIda = validarDuracionMinima(new Date('2025-01-01'), new Date('2025-01-25'), 8, 'ida');
    const errorIdaYVuelta = validarDuracionMinima(new Date('2025-01-01'), new Date('2025-01-25'), 8, 'idayvuelta');
    expect(errorIda).toBeNull(); // 24 días alcanzan para "ida"
    expect(errorIdaYVuelta).not.toBeNull(); // pero no para "idayvuelta" (requiere 52)
    expect(errorIdaYVuelta).toContain('52 día(s)');
  });
});

describe('elegirReemplazoMenosCargado (reasignación al sacar un árbitro/cancha de un torneo)', () => {
  it('elige el candidato con menor carga', () => {
    const carga = new Map([[10, 3], [20, 1], [30, 2]]);
    expect(elegirReemplazoMenosCargado([10, 20, 30], carga)).toBe(20);
  });

  it('en caso de empate, elige el primero del array', () => {
    const carga = new Map([[10, 2], [20, 2], [30, 2]]);
    expect(elegirReemplazoMenosCargado([10, 20, 30], carga)).toBe(10);
  });

  it('trata como carga 0 a un candidato sin entrada en el mapa', () => {
    const carga = new Map([[10, 1]]);
    expect(elegirReemplazoMenosCargado([10, 20], carga)).toBe(20);
  });

  it('con un solo candidato, lo devuelve siempre', () => {
    const carga = new Map([[10, 5]]);
    expect(elegirReemplazoMenosCargado([10], carga)).toBe(10);
  });
});
