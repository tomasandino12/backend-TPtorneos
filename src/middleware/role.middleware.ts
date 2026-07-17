import { Request, Response, NextFunction } from 'express';

export function requireRole(...rolesPermitidos: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.rol || !rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ message: 'No tenés permiso para realizar esta acción' });
    }
    next();
  };
}
