import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { sanitizeRespuestaInput } from './invitacion.controler.js';

function fakeReqRes(body: Record<string, unknown>) {
  const req = { body } as Request;
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const res = { status } as unknown as Response;
  const next = vi.fn();
  return { req, res, next, status, json };
}

describe('sanitizeRespuestaInput', () => {
  it.each(['aceptada', 'rechazada'])('acepta estado "%s" y llama a next()', (estado) => {
    const { req, res, next, status } = fakeReqRes({ estado });

    sanitizeRespuestaInput(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(status).not.toHaveBeenCalled();
    expect((req.body as any).sanitizedInput).toEqual({ estado });
  });

  it('rechaza con 400 un estado que no sea "aceptada" ni "rechazada"', () => {
    const { req, res, next, status, json } = fakeReqRes({ estado: 'pendiente' });

    sanitizeRespuestaInput(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("'aceptada' o 'rechazada'") })
    );
  });

  it('rechaza con 400 cuando falta el campo estado', () => {
    const { req, res, next, status } = fakeReqRes({});

    sanitizeRespuestaInput(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(400);
  });
});
