import { describe, it, expect } from 'vitest';
import { validarFechaNacimiento } from './jugador.controler.js';

describe('validarFechaNacimiento (registro de jugador)', () => {
  it('acepta una fecha de nacimiento realista', () => {
    expect(validarFechaNacimiento('2000-01-01')).toBeNull();
  });

  it('rechaza una fecha inválida', () => {
    expect(validarFechaNacimiento('no-es-una-fecha')).toMatch(/no es válida/);
  });

  it('rechaza una fecha futura', () => {
    const futuro = new Date();
    futuro.setFullYear(futuro.getFullYear() + 1);
    expect(validarFechaNacimiento(futuro.toISOString().slice(0, 10))).toMatch(/futura/);
  });

  it('rechaza una edad absurdamente alta (más de 100 años)', () => {
    expect(validarFechaNacimiento('1850-01-01')).toMatch(/rango razonable/);
  });

  it('rechaza una edad menor a 5 años', () => {
    const hoy = new Date();
    const haceUnAño = new Date(hoy.getFullYear() - 1, hoy.getMonth(), hoy.getDate());
    expect(validarFechaNacimiento(haceUnAño.toISOString().slice(0, 10))).toMatch(/rango razonable/);
  });
});
