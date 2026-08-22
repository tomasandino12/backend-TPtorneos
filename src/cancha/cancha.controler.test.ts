import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { sanitizeCanchaInput } from './cancha.controler.js';

function fakeReqRes(body: Record<string, unknown>) {
  const req = { body } as Request;
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const res = { status } as unknown as Response;
  const next = vi.fn();
  return { req, res, next, status, json };
}

describe('sanitizeCanchaInput', () => {
  it.each([
    [true, true],
    [false, false],
    ['true', true],
    ['false', false],
  ])('normaliza iluminacion=%o a %o y llama a next()', (valor, esperado) => {
    const { req, res, next, status } = fakeReqRes({ iluminacion: valor });

    sanitizeCanchaInput(req, res, next);

    expect((req.body as any).sanitizedInput.iluminacion).toBe(esperado);
    expect(next).toHaveBeenCalledOnce();
    expect(status).not.toHaveBeenCalled();
  });

  it('no incluye la key iluminacion en sanitizedInput cuando el campo está ausente, y llama a next()', () => {
    const { req, res, next, status } = fakeReqRes({ nombre: 'Cancha 1' });

    sanitizeCanchaInput(req, res, next);

    expect((req.body as any).sanitizedInput).not.toHaveProperty('iluminacion');
    expect(next).toHaveBeenCalledOnce();
    expect(status).not.toHaveBeenCalled();
  });

  it.each(['yes', 1, 0, 'TRUE', null, {}])(
    'rechaza con 400 iluminacion=%o y no llama a next()',
    (valor) => {
      const { req, res, next, status, json } = fakeReqRes({ iluminacion: valor });

      sanitizeCanchaInput(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ message: 'iluminacion debe ser un booleano' });
    }
  );

  it('normaliza iluminacion="true" junto con estado="activa" y deja ambos bien en sanitizedInput', () => {
    const { req, res, next, status } = fakeReqRes({ iluminacion: 'true', estado: 'activa' });

    sanitizeCanchaInput(req, res, next);

    const sanitized = (req.body as any).sanitizedInput;
    expect(sanitized.iluminacion).toBe(true);
    expect(sanitized.estado).toBe('activa');
    expect(next).toHaveBeenCalledOnce();
    expect(status).not.toHaveBeenCalled();
  });
});
