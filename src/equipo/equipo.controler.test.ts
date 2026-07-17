import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { sanitizeEquipoInput } from './equipo.controler.js';

/** Fabrica un req/res "de mentira" con lo mínimo que necesita el middleware
 * (body mutable + res.status().json() encadenable), sin levantar Express. */
function fakeReqRes(body: Record<string, unknown>) {
  const req = { body } as Request;
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const res = { status } as unknown as Response;
  const next = vi.fn();
  return { req, res, next, status, json };
}

describe('sanitizeEquipoInput', () => {
  it('arma sanitizedInput solo con los campos permitidos y llama a next() cuando la categoría es válida', () => {
    const { req, res, next, status } = fakeReqRes({
      nombreEquipo: 'Los Pibes FC',
      colorPrimario: '#000000',
      categoria: 'veteranos',
      campoNoPermitido: 'no debería llegar acá',
    });

    sanitizeEquipoInput(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(status).not.toHaveBeenCalled();
    expect((req.body as any).sanitizedInput).toEqual({
      nombreEquipo: 'Los Pibes FC',
      colorPrimario: '#000000',
      categoria: 'veteranos',
    });
  });

  it('descarta del sanitizedInput los campos opcionales que no vinieron en el body', () => {
    const { req, res, next } = fakeReqRes({ nombreEquipo: 'Solo Nombre FC' });

    sanitizeEquipoInput(req, res, next);

    const sanitized = (req.body as any).sanitizedInput;
    expect(sanitized).toEqual({ nombreEquipo: 'Solo Nombre FC' });
    expect(sanitized).not.toHaveProperty('colorSecundario');
    expect(sanitized).not.toHaveProperty('categoria');
    expect(next).toHaveBeenCalledOnce();
  });

  it('rechaza con 400 una categoría inválida y no llama a next()', () => {
    const { req, res, next, status, json } = fakeReqRes({
      nombreEquipo: 'Equipo Trucho FC',
      categoria: 'categoria-inventada',
    });

    sanitizeEquipoInput(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Categoría inválida') })
    );
  });
});
