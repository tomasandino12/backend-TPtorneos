import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { AdminTorneo } from './adminTorneo.entity.js';

const em = orm.em;

/** Sanitiza y normaliza el body */
function sanitizeAdminTorneoInput(req: Request, _res: Response, next: NextFunction) {
  req.body.sanitizedInput = {
    nombre: req.body.nombre,
    apellido: req.body.apellido,
    email: req.body.email,
    contraseña: req.body.contraseña ?? req.body.contrasena, // por si viene sin ñ
    telefono: req.body.telefono,
  };

  Object.keys(req.body.sanitizedInput).forEach((k) => {
    if (req.body.sanitizedInput[k] === undefined) delete req.body.sanitizedInput[k];
  });

  next();
}

/** GET /adminTorneo */
async function findAll(_req: Request, res: Response) {
  try {
    const admins = await em.find(AdminTorneo, {}, { populate: ['torneos'] });
    res.status(200).json({ message: 'found all adminTorneos', data: admins });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** GET /adminTorneo/:id */
async function findOne(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const admin = await em.findOneOrFail(AdminTorneo, { id }, { populate: ['torneos'] });
    res.status(200).json({ message: 'found adminTorneo', data: admin });
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      return res.status(404).json({ message: 'AdminTorneo no encontrado' });
    }
    res.status(500).json({ message: error.message });
  }
}

/** POST /adminTorneo */
async function add(req: Request, res: Response) {
  try {
    const admin = em.create(AdminTorneo, req.body.sanitizedInput);
    await em.flush();
    res.status(201).json({ message: 'adminTorneo created', data: admin });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** PUT /adminTorneo/:id */
async function update(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const adminToUpdate = await em.findOneOrFail(AdminTorneo, { id });
    em.assign(adminToUpdate, req.body.sanitizedInput);
    await em.flush();

    res.status(200).json({ message: 'adminTorneo updated', data: adminToUpdate });
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      return res.status(404).json({ message: 'AdminTorneo no encontrado' });
    }
    res.status(500).json({ message: error.message });
  }
}

/** DELETE /adminTorneo/:id */
async function remove(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const ref = em.getReference(AdminTorneo, id);
    await em.removeAndFlush(ref);
    res.status(200).json({ message: 'adminTorneo deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export { sanitizeAdminTorneoInput, findAll, findOne, add, update, remove };
