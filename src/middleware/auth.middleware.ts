import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/** Forma del payload que se firma en jugador.controler.ts (login/googleLogin)
 * y adminTorneo.controler.ts (login). `rol` es opcional porque el JWT de
 * googleLogin para un jugador recién registrado no lo incluye (ver
 * jugador.controler.ts googleLogin). */
export interface AuthPayload {
  id: number;
  nombre?: string;
  email?: string;
  rol?: 'admin' | 'capitan' | 'jugador';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

// Rutas que no requieren token. req.path llega sin el prefijo /api.
const PUBLIC_PATHS: { method: string; path: string }[] = [
  { method: 'POST', path: '/jugadores/login' },
  { method: 'POST', path: '/jugadores/google-login' },
  { method: 'POST', path: '/jugadores/registro' },
  { method: 'POST', path: '/jugadores/forgot-password' },
  { method: 'POST', path: '/jugadores/reset-password' },
  { method: 'POST', path: '/adminTorneo/login' },
];

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const isPublic = PUBLIC_PATHS.some(
    (p) => p.method === req.method && req.path === p.path
  );
  if (isPublic) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'clave-segura-del-gestor-torneos-2024');
    req.user = payload as AuthPayload;
    next();
  } catch {
    res.status(401).json({ message: 'No autorizado' });
  }
}
