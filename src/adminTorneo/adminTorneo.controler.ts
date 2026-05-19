import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { AdminTorneo } from './adminTorneo.entity.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
    const adminsSeguros = admins.map(({ contraseña, ...resto }) => resto);
    res.status(200).json({ message: 'found all adminTorneos', data: adminsSeguros });
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
    const { contraseña, ...adminSinPassword } = admin;
    res.status(200).json({ message: 'found adminTorneo', data: adminSinPassword });
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
    const data = req.body.sanitizedInput;

    // Hashea la contraseña antes de guardar
    if (data.contraseña) {
      data.contraseña = await bcrypt.hash(data.contraseña, 10);
    }

    const adminTorneo = em.create(AdminTorneo, data);
    await em.flush();
    const { contraseña, ...adminSinPassword } = adminTorneo;
    res.status(201).json({ message: 'admin created', data: adminSinPassword });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** PUT /adminTorneo/:id */
async function update(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id))
      return res.status(400).json({ message: "id inválido" });

    const adminToUpdate = await em.findOneOrFail(AdminTorneo, { id });

    // Clonamos los datos sanitizados
    const data = { ...req.body.sanitizedInput };

    // 🔒 Si viene una contraseña nueva, la codificamos antes de asignarla
    if (data.contraseña) {
      data.contraseña = await bcrypt.hash(data.contraseña, 10);
    }

    em.assign(adminToUpdate, data);
    await em.flush();

    const { contraseña, ...adminSinPassword } = adminToUpdate;
    res.status(200).json({ message: "adminTorneo updated", data: adminSinPassword });
  } catch (error: any) {
    if (error.name === "NotFoundError") {
      return res
        .status(404)
        .json({ message: "AdminTorneo no encontrado" });
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

/** POST /adminTorneo/login */
async function login(req: Request, res: Response) {
  const email: string = req.body.email;
  const password: string = req.body.contraseña ?? req.body.contrasena;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email y contraseña requeridos' });
  }

  try {
    const admin = await em.findOne(AdminTorneo, { email });

    if (!admin) {
      console.error(`[Admin login] No se encontró admin con email: ${email}`);
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Detecta si el hash es bcrypt ($2a$ / $2b$) o texto plano (migración)
    let passwordValida = false;
    if (admin.contraseña.startsWith('$2')) {
      passwordValida = await bcrypt.compare(password, admin.contraseña);
    } else {
      // Contraseña en texto plano (sin hashear aún)
      passwordValida = password === admin.contraseña;
      if (passwordValida) {
        // La hashea automáticamente al primer login exitoso
        admin.contraseña = await bcrypt.hash(password, 10);
        await em.flush();
        console.log(`[Admin login] Contraseña de ${email} hasheada automáticamente`);
      }
    }

    if (!passwordValida) {
      console.error(`[Admin login] Contraseña incorrecta para: ${email}`);
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: admin.id, nombre: admin.nombre, email: admin.email, rol: 'admin' },
      process.env.JWT_SECRET || 'clave-segura-del-gestor-torneos-2024',
      { expiresIn: '8h' }
    );

    const { contraseña, ...adminSinPassword } = admin;
    res.json({ token, admin: adminSinPassword });
  } catch (error: any) {
    console.error('[Admin login] Error:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
}

/** GET /adminTorneo/fix-passwords — uso único para hashear contraseñas en texto plano */
async function fixPasswords(_req: Request, res: Response) {
  try {
    const admins = await em.find(AdminTorneo, {});
    let actualizados = 0;

    for (const admin of admins) {
      if (!admin.contraseña.startsWith('$2')) {
        admin.contraseña = await bcrypt.hash(admin.contraseña, 10);
        actualizados++;
      }
    }

    await em.flush();
    res.json({ message: `Contraseñas hasheadas: ${actualizados} de ${admins.length}` });
  } catch (error: any) {
    console.error('[fix-passwords] Error:', error);
    res.status(500).json({ message: error.message });
  }
}

export { sanitizeAdminTorneoInput, findAll, findOne, add, update, remove, login, fixPasswords };
