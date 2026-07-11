// Script de datos de prueba: 30 equipos (repartidos entre 4 categorías) con
// 20 jugadores cada uno. Idempotente por nombre de equipo: si un equipo de
// esta lista ya existe, se saltea entero (no duplica ni pisa datos).
//
// Correr con: npx tsc -p tsconfig.json && node dist/scripts/seed.js
// (el proyecto no ejecuta TS directo en runtime en ningún otro lado — todo
// pasa por dist/ — así que el seed sigue el mismo circuito que el resto).
import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import type { Equipo } from '../equipo/equipo.entity.js';
import type { Jugador } from '../jugador/jugador.entity.js';
import { orm } from '../shared/db/orm.js';

// fork(): fuera de un request HTTP no hay RequestContext, y MikroORM no deja
// usar el EntityManager global directamente en ese caso.
const em = orm.em.fork();

// Equipo/Jugador se importan recién en runtime, DESPUÉS de que orm.js termine
// de inicializar (MikroORM ya descubrió y evaluó todas las entidades en ese
// momento). Importarlas como valores arriba, en el top-level, dispara el mismo
// crash circular ("Cannot access 'Equipo' before initialization") que ya
// apareció con Invitacion — acá, porque seed.ts es un entry point nuevo con un
// orden de carga de módulos distinto al de app.ts.
let EquipoRef: typeof Equipo;
let JugadorRef: typeof Jugador;

// La categoría "sub19" pedida originalmente no existe en el sistema
// (equipo.controler.ts solo admite sub15/sub17/mayores/veteranos/femenino);
// se reemplazó por "sub17", la más cercana. Se ciclan estas 4 sobre los 30 equipos.
const CATEGORIAS = ['veteranos', 'sub17', 'sub15', 'femenino'];

const NOMBRES_EQUIPOS = [
  'Club Atlético Los Pinos', 'Deportivo San Cayetano', 'Club Social y Deportivo El Progreso',
  'Atlético Villa Esperanza', 'Deportivo 25 de Mayo', 'Club Sportivo Belgrano Sur',
  'Atlético Nueva Italia', 'Deportivo Juventud Alsina', 'Club Atlético San Isidro Labrador',
  'Deportivo Unión Vecinal', 'Club Social Force Junior', 'Atlético Los Álamos',
  'Deportivo Villa del Parque', 'Club Sportivo La Esperanza', 'Atlético Malvinas Argentinas',
  'Deportivo San Roque', 'Club Atlético Central Norte', 'Deportivo Villa Elisa',
  'Atlético 9 de Julio', 'Club Sportivo Rivadavia Sur', 'Deportivo Los Tilos',
  'Atlético San Benito', 'Club Social Independencia', 'Deportivo El Mirador',
  'Atlético Villa Flores', 'Club Sportivo Alto Verde', 'Deportivo San Vicente',
  'Atlético Costa Azul', 'Club Atlético Las Rosas', 'Deportivo Villa Nueva',
];

// Pares de colores (primario/secundario) para los escudos, ciclados por índice de equipo.
const COLORES = [
  ['#1F5233', '#FFFFFF'], ['#8F1611', '#F5F1E6'], ['#0B3D91', '#FFD700'],
  ['#2E2E2E', '#D98E04'], ['#6B0F1A', '#FFFFFF'], ['#003049', '#FCBF49'],
  ['#3A5A40', '#DAD7CD'], ['#5F0F40', '#E36414'], ['#1B4332', '#95D5B2'],
  ['#7B2D26', '#EAE0D5'],
];

const NOMBRES_MASCULINOS = [
  'Juan', 'Carlos', 'Martín', 'Diego', 'Facundo', 'Nicolás', 'Lucas', 'Franco', 'Gonzalo', 'Matías',
  'Rodrigo', 'Emanuel', 'Federico', 'Agustín', 'Bruno', 'Ezequiel', 'Ignacio', 'Joaquín', 'Leandro',
  'Maximiliano', 'Pablo', 'Santiago', 'Sebastián', 'Tomás', 'Alejandro', 'Cristian', 'Damián',
  'Esteban', 'Fernando', 'Gabriel', 'Hernán', 'Iván', 'Jorge', 'Leonardo', 'Marcelo', 'Nahuel',
  'Oscar', 'Patricio', 'Ricardo', 'Guillermo',
];

const NOMBRES_FEMENINOS = [
  'Ana', 'Camila', 'Daniela', 'Elena', 'Florencia', 'Gabriela', 'Helena', 'Ivana', 'Julia', 'Karina',
  'Laura', 'Mariana', 'Natalia', 'Ornella', 'Paula', 'Rocío', 'Sabrina', 'Tamara', 'Valentina',
  'Yamila', 'Antonella', 'Brenda', 'Carla', 'Delfina', 'Estefanía', 'Fiorella', 'Guadalupe',
  'Micaela', 'Milagros', 'Priscila',
];

const APELLIDOS = [
  'González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Pérez', 'García', 'Sánchez', 'Romero',
  'Sosa', 'Torres', 'Álvarez', 'Ruiz', 'Ramírez', 'Flores', 'Acosta', 'Benítez', 'Medina', 'Herrera',
  'Aguirre', 'Silva', 'Ortiz', 'Molina', 'Suárez', 'Rojas', 'Núñez', 'Giménez', 'Ibáñez', 'Godoy',
  'Villalba', 'Cabrera', 'Bravo', 'Domínguez', 'Vega', 'Castro', 'Peralta', 'Vargas', 'Correa',
  'Maldonado', 'Ledesma',
];

// 2 arqueros / 7 defensores / 7 mediocampistas / 4 delanteros = 20
// (el pedido original decía 2/6/6/4 = 18; se completaron los 2 que faltaban
// sumando 1 defensor y 1 mediocampista, decidido con el usuario).
const POSICIONES: string[] = [
  ...Array(2).fill('Arquero'),
  ...Array(7).fill('Defensor'),
  ...Array(7).fill('Mediocampista'),
  ...Array(4).fill('Delantero'),
];

const MAPA_ACENTOS: Record<string, string> = {
  á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ñ: 'n', ü: 'u',
  Á: 'a', É: 'e', Í: 'i', Ó: 'o', Ú: 'u', Ñ: 'n', Ü: 'u',
};

function normalizar(texto: string): string {
  return texto
    .split('')
    .map((c) => MAPA_ACENTOS[c] ?? c)
    .join('')
    .toLowerCase()
    .replace(/[^a-z]/g, ''); // saca espacios y cualquier otro caracter no-ascii
}

// Todas las combinaciones posibles nombre×apellido, en orden — se consumen
// secuencialmente para garantizar que ningún jugador se repita.
function generarCombos(nombres: string[]): { nombre: string; apellido: string }[] {
  const combos: { nombre: string; apellido: string }[] = [];
  for (const apellido of APELLIDOS) {
    for (const nombre of nombres) {
      combos.push({ nombre, apellido });
    }
  }
  return combos;
}

const combosMasculinos = generarCombos(NOMBRES_MASCULINOS);
const combosFemeninos = generarCombos(NOMBRES_FEMENINOS);
let idxCombosM = 0;
let idxCombosF = 0;

function siguienteNombre(esFemenino: boolean): { nombre: string; apellido: string } {
  if (esFemenino) {
    const combo = combosFemeninos[idxCombosF % combosFemeninos.length];
    idxCombosF++;
    return combo;
  }
  const combo = combosMasculinos[idxCombosM % combosMasculinos.length];
  idxCombosM++;
  return combo;
}

const dnisUsados = new Set<string>();
function generarDni(): string {
  let dni: string;
  do {
    dni = String(30000000 + Math.floor(Math.random() * 15000000));
  } while (dnisUsados.has(dni));
  dnisUsados.add(dni);
  return dni;
}

function fechaNacimientoPara(categoria: string): string {
  const anioActual = new Date().getFullYear();
  let edadMin: number, edadMax: number;

  if (categoria === 'sub15') { edadMin = 13; edadMax = 15; }
  else if (categoria === 'sub17') { edadMin = 16; edadMax = 17; }
  else if (categoria === 'veteranos') { edadMin = 35; edadMax = 50; }
  else { edadMin = 18; edadMax = 35; } // femenino

  const edad = edadMin + Math.floor(Math.random() * (edadMax - edadMin + 1));
  const anioNacimiento = anioActual - edad;
  const mes = 1 + Math.floor(Math.random() * 12);
  const dia = 1 + Math.floor(Math.random() * 28);
  return `${anioNacimiento}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

const emailsUsados = new Set<string>();
function emailUnico(nombreNormalizado: string): string {
  let email = `${nombreNormalizado}@gmail.com`;
  let sufijo = 1;
  while (emailsUsados.has(email)) {
    email = `${nombreNormalizado}${sufijo}@gmail.com`;
    sufijo++;
  }
  emailsUsados.add(email);
  return email;
}

async function main() {
  // Import diferido a runtime (ver comentario junto a EquipoRef/JugadorRef).
  EquipoRef = (await import('../equipo/equipo.entity.js')).Equipo;
  JugadorRef = (await import('../jugador/jugador.entity.js')).Jugador;

  let equiposCreados = 0;
  let jugadoresCreados = 0;
  let equiposSalteados = 0;

  for (let i = 0; i < NOMBRES_EQUIPOS.length; i++) {
    const nombreEquipo = NOMBRES_EQUIPOS[i];
    const categoria = CATEGORIAS[i % CATEGORIAS.length];

    const yaExiste = await em.findOne(EquipoRef, { nombreEquipo });
    if (yaExiste) {
      console.log(`— "${nombreEquipo}" ya existe, salteado.`);
      equiposSalteados++;
      continue;
    }

    const [colorPrimario, colorSecundario] = COLORES[i % COLORES.length];
    const equipo = em.create(EquipoRef, {
      nombreEquipo,
      colorPrimario,
      colorSecundario,
      categoria,
      descripcion: `Plantel de ${nombreEquipo}, categoría ${categoria}.`,
    });
    await em.persistAndFlush(equipo);
    equiposCreados++;

    const esFemenino = categoria === 'femenino';
    const jugadoresEquipo: Jugador[] = [];

    for (let j = 0; j < POSICIONES.length; j++) {
      const { nombre, apellido } = siguienteNombre(esFemenino);
      const nombreNormalizado = normalizar(`${nombre}${apellido}`);
      const email = emailUnico(nombreNormalizado);
      const contraseña = await bcrypt.hash(`${nombreNormalizado}123`, 10);

      const jugador = em.create(JugadorRef, {
        nombre,
        apellido,
        dni: generarDni(),
        email,
        fechaNacimiento: fechaNacimientoPara(categoria),
        contraseña,
        posicion: POSICIONES[j],
        esCapitan: j === 0,
        equipo,
      });
      jugadoresEquipo.push(jugador);
    }

    await em.persistAndFlush(jugadoresEquipo);
    jugadoresCreados += jugadoresEquipo.length;

    console.log(`✓ ${nombreEquipo} (${categoria}) — 20 jugadores creados.`);
  }

  console.log('\n--- Resumen ---');
  console.log(`Equipos creados: ${equiposCreados}`);
  console.log(`Equipos ya existentes (salteados): ${equiposSalteados}`);
  console.log(`Jugadores creados: ${jugadoresCreados}`);

  await orm.close(true);
}

main().catch(async (err) => {
  console.error('Error en el seed:', err);
  await orm.close(true);
  process.exit(1);
});
