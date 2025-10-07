import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { Jugador } from './jugador.entity.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const em = orm.em;

/** Sanitiza y normaliza el body */
function sanitizeJugadorInput(req: Request, res: Response, next: NextFunction) {
  req.body.sanitizedInput = {
    nombre: req.body.nombre,
    apellido: req.body.apellido,
    dni: req.body.dni,
    email: req.body.email,
    fechaNacimiento: req.body.fechaNacimiento,
    posicion: req.body.posicion,
    contraseña: req.body.contraseña,
    equipo: req.body.equipo, // FK (opcional)
  };

  // Elimina keys undefined
  Object.keys(req.body.sanitizedInput).forEach((k) => {
    if (req.body.sanitizedInput[k] === undefined) delete req.body.sanitizedInput[k];
  });

  next();
}

/** GET /jugadores */
async function findAll(req: Request, res: Response) {
  try {
    const jugadores = await em.find(Jugador, {});
    res.status(200).json({ message: 'found all jugadores', data: jugadores });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** GET /jugadores/:id */
async function findOne(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const jugador = await em.findOneOrFail(Jugador, { id });
    res.status(200).json({ message: 'found jugador', data: jugador });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** POST /jugadores */
async function add(req: Request, res: Response) {
  try {
    const data = req.body.sanitizedInput;

    if (data.contraseña) {
      data.contraseña = await bcrypt.hash(data.contraseña, 10);
    }

    const jugador = em.create(Jugador, data);
    await em.flush();
    res.status(201).json({ message: 'jugador created', data: jugador });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** PUT /jugadores/:id */
async function update(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id))
      return res.status(400).json({ message: "id inválido" });

    const jugadorToUpdate = await em.findOneOrFail(Jugador, { id });
    const data = { ...req.body.sanitizedInput };

    if (data.contraseña) {
      data.contraseña = await bcrypt.hash(data.contraseña, 10);
    }

    em.assign(jugadorToUpdate, data);
    await em.flush();

    res.status(200).json({ message: "jugador updated", data: jugadorToUpdate });
  } catch (error: any) {
    if (error.name === "NotFoundError") {
      return res.status(404).json({ message: "jugador no encontrado" });
    }
    res.status(500).json({ message: error.message });
  }
}

/** DELETE /jugadores/:id */
async function remove(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id inválido' });

    const ref = em.getReference(Jugador, id);
    await em.removeAndFlush(ref);
    res.status(200).json({ message: 'jugador deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/** POST /jugadores/login */
export async function login(req: Request, res: Response) {
  const { email, contraseña } = req.body;

  try {
    const jugador = await em.findOne(Jugador, { email });

    if (!jugador) {
      return res.status(401).json({ message: 'Jugador no encontrado' });
    }

    const contraseñaValida = await bcrypt.compare(contraseña, jugador.contraseña);

    if (!contraseñaValida) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      {
        id: jugador.id,
        nombre: jugador.nombre,
        email: jugador.email
      },
      process.env.JWT_SECRET || 'secreto-super-seguro',
      { expiresIn: '2h' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
}

/** POST /jugadores/registro */
async function register(req: Request, res: Response) {
  try {
    const datos = req.body.sanitizedInput;

    if (!datos.email || !datos.contraseña)
      return res.status(400).json({ message: "Email y contraseña requeridos" });

    const existeJugador = await em.findOne(Jugador, { email: datos.email });
    if (existeJugador)
      return res.status(409).json({ message: "Ya existe un jugador con ese email" });

    const hash = await bcrypt.hash(datos.contraseña, 10);

    const nuevoJugador = em.create(Jugador, {
      ...datos,
      contraseña: hash,
      equipo: null, // 👈 aseguramos que no falle
    });

    await em.persistAndFlush(nuevoJugador);

    const token = jwt.sign(
      { id: nuevoJugador.id },
      process.env.JWT_SECRET || "secreto123",
      { expiresIn: "2h" }
    );

    res.status(201).json({ token });
  } catch (error: any) {
    console.error("Error en registro:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
}

export {
  sanitizeJugadorInput,
  findAll,
  findOne,
  add,
  update,
  remove,
  register
};
