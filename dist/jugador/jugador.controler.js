import { orm } from '../shared/db/orm.js';
import { Jugador } from './jugador.entity.js';
import { Equipo } from '../equipo/equipo.entity.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
const em = orm.em;
/** 🔹 Sanitiza y normaliza el body */
function sanitizeJugadorInput(req, res, next) {
    req.body.sanitizedInput = {
        nombre: req.body.nombre,
        apellido: req.body.apellido,
        dni: req.body.dni,
        email: req.body.email,
        fechaNacimiento: req.body.fechaNacimiento,
        posicion: req.body.posicion,
        contraseña: req.body.contraseña,
        equipo: req.body.equipo ?? null,
        esCapitan: req.body.esCapitan ?? false,
    };
    Object.keys(req.body.sanitizedInput).forEach((k) => {
        if (req.body.sanitizedInput[k] === undefined)
            delete req.body.sanitizedInput[k];
    });
    next();
}
/** 🔹 GET /jugadores */
async function findAll(req, res) {
    try {
        const jugadores = await em.find(Jugador, {}, { populate: ["equipo"] });
        const jugadoresSeguros = jugadores.map(({ contraseña, ...resto }) => resto);
        res.status(200).json({ message: "found all jugadores", data: jugadoresSeguros });
    }
    catch (error) {
        console.error("Error en findAll:", error);
        res.status(500).json({ message: error.message });
    }
}
/** 🔹 GET /jugadores/:id */
async function findOne(req, res) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id))
            return res.status(400).json({ message: "id inválido" });
        const jugador = await em.findOne(Jugador, { id }, { populate: ["equipo"] });
        if (!jugador)
            return res.status(404).json({ message: "Jugador no encontrado" });
        const { contraseña, ...jugadorSinPassword } = jugador;
        res.status(200).json({ message: "found jugador", data: jugadorSinPassword });
    }
    catch (error) {
        console.error("Error en findOne:", error);
        res.status(500).json({ message: error.message });
    }
}
/** 🔹 GET /jugadores/by-email?email=... */
async function findByEmail(req, res) {
    try {
        const email = req.query.email;
        if (!email)
            return res.status(400).json({ message: "Email requerido" });
        const jugador = await em.findOne(Jugador, { email }, { populate: ["equipo"] });
        if (!jugador)
            return res.status(404).json({ message: "Jugador no encontrado" });
        const { contraseña, ...jugadorSinPassword } = jugador;
        res.status(200).json({ message: "found jugador", data: jugadorSinPassword });
    }
    catch (error) {
        console.error("Error en findByEmail:", error);
        res.status(500).json({ message: error.message });
    }
}
/** 🔹 GET /jugadores/sin-equipo */
async function getJugadoresSinEquipo(req, res) {
    try {
        const jugadores = await em.find(Jugador, { equipo: null });
        const jugadoresSeguros = jugadores.map(({ contraseña, ...resto }) => resto);
        res.status(200).json({ message: "found jugadores sin equipo", data: jugadoresSeguros });
    }
    catch (err) {
        console.error("❌ Error al obtener jugadores sin equipo:", err);
        res.status(500).json({ message: "Error al obtener jugadores sin equipo" });
    }
}
/** 🔹 POST /jugadores */
async function add(req, res) {
    try {
        const data = req.body.sanitizedInput;
        if (!data.nombre || !data.apellido || !data.dni || !data.email || !data.contraseña) {
            return res.status(400).json({ error: 'Faltan campos requeridos: nombre, apellido, dni, email, contraseña' });
        }
        const existente = await em.findOne(Jugador, { email: data.email });
        if (existente)
            return res.status(409).json({ error: 'Ya existe un jugador con ese email' });
        if (data.contraseña) {
            data.contraseña = await bcrypt.hash(data.contraseña, 10);
        }
        data.esCapitan = data.esCapitan ?? false;
        data.equipo = data.equipo ?? null;
        const jugador = em.create(Jugador, data);
        await em.flush();
        const { contraseña, ...jugadorSinPassword } = jugador;
        res.status(201).json({ message: 'jugador created', data: jugadorSinPassword });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}
/** 🔹 PUT /jugadores/:id */
async function update(req, res) {
    try {
        const id = Number(req.params.id);
        const { nombre, apellido, dni, email, fechaNacimiento, posicion, equipo, esCapitan } = req.body.sanitizedInput;
        // Pre-checks fuera de la transacción (solo lecturas, sin modificar nada)
        const jugador = await em.findOne(Jugador, { id }, { populate: ['equipo'] });
        if (!jugador)
            return res.status(404).json({ message: 'Jugador no encontrado' });
        if (equipo) {
            const equipoExiste = await em.findOne(Equipo, { id: Number(equipo) });
            if (!equipoExiste)
                return res.status(404).json({ message: 'Equipo no encontrado' });
        }
        // Validar capitán único: chequeamos el equipo destino (actual o nuevo)
        if (esCapitan === true) {
            const targetEquipoId = equipo ? Number(equipo) : jugador.equipo?.id;
            if (targetEquipoId) {
                const capitan = await em.findOne(Jugador, { equipo: targetEquipoId, esCapitan: true, id: { $ne: id } });
                if (capitan)
                    return res.status(400).json({ error: 'El equipo ya tiene un capitán' });
            }
        }
        // Toda la escritura en una sola transacción atómica.
        // em.transactional() hace flush y commit al final, o rollback si lanza un error.
        const result = await em.transactional(async (txEm) => {
            const j = await txEm.findOneOrFail(Jugador, { id }, { populate: ['equipo'] });
            let mensaje = 'Jugador actualizado correctamente';
            if (equipo === null && j.equipo) {
                // Caso: se quita al jugador del equipo
                const equipoAnterior = j.equipo;
                const eraCapitan = j.esCapitan;
                j.equipo = null;
                j.esCapitan = false;
                const otrosJugadores = await txEm.find(Jugador, { equipo: equipoAnterior, id: { $ne: j.id } }, { orderBy: { id: 'ASC' } });
                if (eraCapitan && otrosJugadores.length > 0) {
                    otrosJugadores[0].esCapitan = true;
                    mensaje = 'Nuevo capitán asignado automáticamente.';
                    console.log(`Nuevo capitán asignado: ${otrosJugadores[0].nombre}`);
                }
                else if (otrosJugadores.length === 0) {
                    txEm.remove(equipoAnterior);
                    mensaje = 'Equipo eliminado porque se quedó sin jugadores.';
                    console.log('Equipo eliminado porque se quedó sin jugadores');
                }
            }
            else if (equipo) {
                // Caso: se asigna un nuevo equipo
                // Fix #3: si ya tiene un equipo DISTINTO, desvincularlo primero
                if (j.equipo && j.equipo.id !== Number(equipo)) {
                    const equipoAnterior = j.equipo;
                    const eraCapitan = j.esCapitan;
                    j.esCapitan = false;
                    j.equipo = null;
                    const otrosJugadores = await txEm.find(Jugador, { equipo: equipoAnterior, id: { $ne: j.id } }, { orderBy: { id: 'ASC' } });
                    if (eraCapitan && otrosJugadores.length > 0) {
                        otrosJugadores[0].esCapitan = true;
                    }
                    else if (otrosJugadores.length === 0) {
                        txEm.remove(equipoAnterior);
                    }
                }
                const equipoEntidad = await txEm.findOneOrFail(Equipo, { id: Number(equipo) });
                j.equipo = equipoEntidad;
            }
            if (nombre)
                j.nombre = nombre;
            if (apellido)
                j.apellido = apellido;
            if (dni)
                j.dni = dni;
            if (email)
                j.email = email;
            if (fechaNacimiento)
                j.fechaNacimiento = fechaNacimiento;
            if (posicion)
                j.posicion = posicion;
            if (esCapitan !== undefined)
                j.esCapitan = esCapitan;
            const { contraseña, ...jugadorSinPassword } = j;
            return { message: mensaje, data: jugadorSinPassword };
        });
        return res.json(result);
    }
    catch (error) {
        console.error('Error en update jugador:', error);
        res.status(500).json({ message: 'Error al actualizar jugador' });
    }
}
/** 🔹 DELETE /jugadores/:id */
async function remove(req, res) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id))
            return res.status(400).json({ message: 'id inválido' });
        const ref = em.getReference(Jugador, id);
        await em.removeAndFlush(ref);
        res.status(200).json({ message: 'jugador deleted' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}
/** 🔹 POST /jugadores/login */
async function login(req, res) {
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
        const token = jwt.sign({
            id: jugador.id,
            nombre: jugador.nombre,
            email: jugador.email,
        }, process.env.JWT_SECRET || 'clave-segura-del-gestor-torneos-2024', { expiresIn: '2h' });
        res.json({ token });
    }
    catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
}
/** 🔹 POST /jugadores/registro */
async function register(req, res) {
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
            equipo: null,
            esCapitan: false,
        });
        await em.persistAndFlush(nuevoJugador);
        const token = jwt.sign({ id: nuevoJugador.id }, process.env.JWT_SECRET || 'clave-segura-del-gestor-torneos-2024', { expiresIn: "2h" });
        res.status(201).json({ token, id: nuevoJugador.id });
    }
    catch (error) {
        console.error("Error en registro:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
}
export { sanitizeJugadorInput, findAll, findOne, findByEmail, getJugadoresSinEquipo, add, update, remove, register, login, };
//# sourceMappingURL=jugador.controler.js.map