import { describe, it, expect } from 'vitest';
import { generarRondas } from './torneo.controler.js';
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
