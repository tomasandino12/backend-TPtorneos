// Carga de datos de prueba para Aiven (producción): 16 equipos de categoría
// "mayores" con 20 jugadores cada uno (2 arqueros / 7 defensores /
// 7 mediocampistas / 4 delanteros = 320 jugadores).
//
// A diferencia de scripts/seed.ts (que apunta a la base configurada en .env),
// este script exige que DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME/DB_SSL
// vengan seteados como variables de entorno en el momento de ejecutarlo — no
// lee ni modifica ningún .env del proyecto. Ver instrucciones de uso al pie.
//
// Modos:
//   --preview        Genera los datos en memoria (hashea contraseñas de verdad)
//                     y los imprime por consola. NO se conecta a ninguna base.
//   --confirm-aiven   Requisito explícito para insertar de verdad. Sin este
//                     flag (o en --preview) no se toca Aiven aunque las
//                     credenciales estén seteadas — es un freno a propósito
//                     para no escribir en producción por accidente.
//
// Correr con:
//   npx tsc -p tsconfig.json && node dist/scripts/seedAivenMayores.js --preview
//   npx tsc -p tsconfig.json && node dist/scripts/seedAivenMayores.js --confirm-aiven
import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import type { Equipo } from '../equipo/equipo.entity.js';
import type { Jugador } from '../jugador/jugador.entity.js';

const PREVIEW = process.argv.includes('--preview');
const CONFIRMADO = process.argv.includes('--confirm-aiven');

const CATEGORIA = 'mayores';
const MARCA_DATOS_PRUEBA = '[DATOS DE PRUEBA]';

const NOMBRES_EQUIPOS: { nombre: string; colorPrimario: string; colorSecundario: string }[] = [
  { nombre: 'Atlético Defensores del Sur', colorPrimario: '#0B3D91', colorSecundario: '#FFFFFF' },
  { nombre: 'Club Social Estrella Roja', colorPrimario: '#B3121F', colorSecundario: '#F5F1E6' },
  { nombre: 'Deportivo Talleres del Oeste', colorPrimario: '#1F5233', colorSecundario: '#D9A566' },
  { nombre: 'Unión Vecinal La Cañada', colorPrimario: '#6B0F1A', colorSecundario: '#FFD700' },
  { nombre: 'Club Atlético Puerto Nuevo', colorPrimario: '#003049', colorSecundario: '#FCBF49' },
  { nombre: 'Deportivo San Martín Norte', colorPrimario: '#2E2E2E', colorSecundario: '#FFFFFF' },
  { nombre: 'Atlético Ferroviario Central', colorPrimario: '#5F0F40', colorSecundario: '#E36414' },
  { nombre: 'Club Sportivo Belgrano Este', colorPrimario: '#0B3D91', colorSecundario: '#FCBF49' },
  { nombre: 'Deportivo Villa Constitución', colorPrimario: '#3A5A40', colorSecundario: '#DAD7CD' },
  { nombre: 'Atlético Los Naranjos', colorPrimario: '#D98E04', colorSecundario: '#2E2E2E' },
  { nombre: 'Club Social Rivadavia Norte', colorPrimario: '#1B4332', colorSecundario: '#95D5B2' },
  { nombre: 'Deportivo Costanera', colorPrimario: '#7B2D26', colorSecundario: '#EAE0D5' },
  { nombre: 'Atlético Juventud Unida Sur', colorPrimario: '#8F1611', colorSecundario: '#FFFFFF' },
  { nombre: 'Club Sportivo El Trébol', colorPrimario: '#1F5233', colorSecundario: '#FFD700' },
  { nombre: 'Deportivo Guadalupe', colorPrimario: '#003049', colorSecundario: '#FFFFFF' },
  { nombre: 'Atlético San Cristóbal', colorPrimario: '#6B0F1A', colorSecundario: '#DAD7CD' },
];

// 2 arqueros / 7 defensores / 7 mediocampistas / 4 delanteros = 20, fijo para
// los 16 equipos.
const POSICIONES: string[] = [
  ...Array(2).fill('Arquero'),
  ...Array(7).fill('Defensor'),
  ...Array(7).fill('Mediocampista'),
  ...Array(4).fill('Delantero'),
];

const NOMBRES_MASCULINOS = [
  'Juan', 'Carlos', 'Martín', 'Diego', 'Facundo', 'Nicolás', 'Lucas', 'Franco', 'Gonzalo', 'Matías',
  'Rodrigo', 'Emanuel', 'Federico', 'Agustín', 'Bruno', 'Ezequiel', 'Ignacio', 'Joaquín', 'Leandro',
  'Maximiliano', 'Pablo', 'Santiago', 'Sebastián', 'Tomás', 'Alejandro', 'Cristian', 'Damián',
  'Esteban', 'Fernando', 'Gabriel', 'Hernán', 'Iván', 'Jorge', 'Leonardo', 'Marcelo', 'Nahuel',
  'Oscar', 'Patricio', 'Ricardo', 'Guillermo',
];

const APELLIDOS = [
  'González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Pérez', 'García', 'Sánchez', 'Romero',
  'Sosa', 'Torres', 'Álvarez', 'Ruiz', 'Ramírez', 'Flores', 'Acosta', 'Benítez', 'Medina', 'Herrera',
  'Aguirre', 'Silva', 'Ortiz', 'Molina', 'Suárez', 'Rojas', 'Núñez', 'Giménez', 'Ibáñez', 'Godoy',
  'Villalba', 'Cabrera', 'Bravo', 'Domínguez', 'Vega', 'Castro', 'Peralta', 'Vargas', 'Correa',
  'Maldonado', 'Ledesma',
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
    .replace(/[^a-z]/g, '');
}

// Todas las combinaciones nombre×apellido posibles (40×39 = 1560), mezcladas
// una sola vez con una semilla fija y consumidas secuencialmente — garantiza
// que ninguno de los 320 jugadores repita nombre+apellido (el email depende
// de esa combinación) y que cada equipo tenga una mezcla realista de
// apellidos en vez de bloques (sin mezclar, como NOMBRES_MASCULINOS tiene
// 40 entradas y cada equipo consume 20, los primeros dos equipos quedarían
// con el mismo apellido para los 20 jugadores).
function generarCombos(): { nombre: string; apellido: string }[] {
  const combos: { nombre: string; apellido: string }[] = [];
  for (const apellido of APELLIDOS) {
    for (const nombre of NOMBRES_MASCULINOS) {
      combos.push({ nombre, apellido });
    }
  }
  // Fisher-Yates con semilla fija (LCG simple) — mezcla determinística: la
  // muestra que se le muestra al usuario antes de correr contra Aiven es
  // exactamente la misma mezcla que se va a insertar.
  let seed = 42;
  const random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = combos.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [combos[i], combos[j]] = [combos[j], combos[i]];
  }
  return combos;
}
const COMBOS = generarCombos();

function fechaNacimientoEntreEdades(edadMin: number, edadMax: number): string {
  const anioActual = new Date().getFullYear();
  const edad = edadMin + Math.floor(Math.random() * (edadMax - edadMin + 1));
  const anioNacimiento = anioActual - edad;
  const mes = 1 + Math.floor(Math.random() * 12);
  const dia = 1 + Math.floor(Math.random() * 28);
  return `${anioNacimiento}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function generarDniUnico(usados: Set<string>): string {
  let dni: string;
  do {
    dni = String(20000000 + Math.floor(Math.random() * 28000000));
  } while (usados.has(dni));
  usados.add(dni);
  return dni;
}

function emailUnico(base: string, usados: Set<string>): string {
  let email = `${base}@gmail.com`;
  let sufijo = 2;
  while (usados.has(email)) {
    email = `${base}${sufijo}@gmail.com`;
    sufijo++;
  }
  usados.add(email);
  return email;
}

function nombreEquipoUnico(nombre: string, usados: Set<string>): string {
  const normalizado = (s: string) => s.trim().toLowerCase();
  if (!usados.has(normalizado(nombre))) {
    usados.add(normalizado(nombre));
    return nombre;
  }
  let candidato = nombre;
  let sufijo = 2;
  while (usados.has(normalizado(candidato))) {
    candidato = `${nombre} (${sufijo})`;
    sufijo++;
  }
  usados.add(normalizado(candidato));
  return candidato;
}

interface JugadorPayload {
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  contraseñaPlana: string;
  contraseñaHash: string;
  fechaNacimiento: string;
  posicion: string;
  genero: 'masculino';
  esCapitan: boolean;
}

interface EquipoPayload {
  nombreEquipo: string;
  colorPrimario: string;
  colorSecundario: string;
  categoria: string;
  descripcion: string;
  jugadores: JugadorPayload[];
}

/** Genera los 16 equipos × 20 jugadores en memoria. `existentes` permite
 * evitar colisiones contra lo que ya haya en la base destino (vacío en modo
 * --preview, poblado desde Aiven en la corrida real). */
async function generarDatos(existentes: {
  dnis: Set<string>;
  emails: Set<string>;
  nombresEquiposMayores: Set<string>;
}): Promise<EquipoPayload[]> {
  let idxCombo = 0;
  const equipos: EquipoPayload[] = [];

  for (const base of NOMBRES_EQUIPOS) {
    const nombreEquipo = nombreEquipoUnico(base.nombre, existentes.nombresEquiposMayores);

    const jugadores: JugadorPayload[] = [];
    for (let j = 0; j < POSICIONES.length; j++) {
      if (idxCombo >= COMBOS.length) {
        throw new Error('Se agotaron las combinaciones de nombre+apellido disponibles.');
      }
      const { nombre, apellido } = COMBOS[idxCombo++];
      const base_ = normalizar(`${nombre}${apellido}`);
      const email = emailUnico(base_, existentes.emails);
      const dni = generarDniUnico(existentes.dnis);
      const contraseñaPlana = `${base_}123`;
      const contraseñaHash = await bcrypt.hash(contraseñaPlana, 10);

      jugadores.push({
        nombre,
        apellido,
        dni,
        email,
        contraseñaPlana,
        contraseñaHash,
        fechaNacimiento: fechaNacimientoEntreEdades(18, 39),
        posicion: POSICIONES[j],
        genero: 'masculino',
        esCapitan: false,
      });
    }
    // Primer arquero del equipo = capitán (confirmado con el usuario).
    jugadores[0].esCapitan = true;

    equipos.push({
      nombreEquipo,
      colorPrimario: base.colorPrimario,
      colorSecundario: base.colorSecundario,
      categoria: CATEGORIA,
      descripcion: `${MARCA_DATOS_PRUEBA} Plantel de ${nombreEquipo}, categoría mayores.`,
      jugadores,
    });
  }

  return equipos;
}

function imprimirMuestra(equipos: EquipoPayload[]) {
  console.log(`\n=== MUESTRA (${PREVIEW ? 'preview, sin tocar ninguna base' : 'previa a insertar'}) ===\n`);
  for (const eq of equipos.slice(0, 2)) {
    console.log(`Equipo: ${eq.nombreEquipo}`);
    console.log(`  categoria: ${eq.categoria} | colorPrimario: ${eq.colorPrimario} | colorSecundario: ${eq.colorSecundario}`);
    console.log(`  descripcion: ${eq.descripcion}`);
    console.log(`  jugadores (${eq.jugadores.length}):`);
    eq.jugadores.forEach((j, i) => {
      console.log(
        `   ${String(i + 1).padStart(2, '0')}. ${j.nombre} ${j.apellido} | ${j.posicion.padEnd(13)} | ` +
        `dni ${j.dni} | ${j.email} | nac. ${j.fechaNacimiento} | genero ${j.genero} | ` +
        `esCapitan ${j.esCapitan} | pass. plana "${j.contraseñaPlana}" | hash ${j.contraseñaHash}`
      );
    });
    console.log('');
  }
  const conteo = { Arquero: 0, Defensor: 0, Mediocampista: 0, Delantero: 0 } as Record<string, number>;
  equipos[0].jugadores.forEach((j) => conteo[j.posicion]++);
  console.log(`Distribución de posiciones por equipo (equipo #1 de muestra): ${JSON.stringify(conteo)}`);
  console.log(`\nTotal equipos generados: ${equipos.length} | Total jugadores generados: ${equipos.reduce((a, e) => a + e.jugadores.length, 0)}`);
}

async function correrPreview() {
  const equipos = await generarDatos({ dnis: new Set(), emails: new Set(), nombresEquiposMayores: new Set() });
  imprimirMuestra(equipos);
  console.log('\n(Preview generado 100% en memoria — no se abrió ninguna conexión a base de datos.)');
}

async function correrInsercionReal() {
  const requeridas = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const faltantes = requeridas.filter((v) => !process.env[v]);
  if (faltantes.length > 0) {
    console.error(`Faltan variables de entorno: ${faltantes.join(', ')}. No se conecta a ninguna base.`);
    process.exit(1);
  }
  if (!CONFIRMADO) {
    console.error('Falta el flag --confirm-aiven. No se escribe nada sin ese flag explícito.');
    process.exit(1);
  }

  console.log(`Conectando a DB_HOST=${process.env.DB_HOST} DB_PORT=${process.env.DB_PORT} DB_NAME=${process.env.DB_NAME} DB_SSL=${process.env.DB_SSL}...`);

  const { orm } = await import('../shared/db/orm.js');
  const em = orm.em.fork();

  try {
    const EquipoRef = (await import('../equipo/equipo.entity.js')).Equipo;
    const JugadorRef = (await import('../jugador/jugador.entity.js')).Jugador;

    console.log('Leyendo dni/email existentes y equipos "mayores" existentes...');
    const jugadoresExistentes = await em.find(JugadorRef, {}, { fields: ['dni', 'email'] });
    const equiposMayoresExistentes = await em.find(EquipoRef, { categoria: CATEGORIA }, { fields: ['nombreEquipo'] });

    const dnisExistentes = new Set(jugadoresExistentes.map((j) => j.dni));
    const emailsExistentes = new Set(jugadoresExistentes.map((j) => j.email));
    const nombresEquiposMayores = new Set(
      equiposMayoresExistentes.map((e) => e.nombreEquipo.trim().toLowerCase())
    );

    console.log(`  ${dnisExistentes.size} dni existentes, ${emailsExistentes.size} email existentes, ${nombresEquiposMayores.size} equipos "mayores" existentes.`);

    const equipos = await generarDatos({
      dnis: dnisExistentes,
      emails: emailsExistentes,
      nombresEquiposMayores,
    });

    imprimirMuestra(equipos);

    const equipoIds: number[] = [];
    const jugadorIds: number[] = [];

    for (const eqPayload of equipos) {
      const equipo = em.create(EquipoRef, {
        nombreEquipo: eqPayload.nombreEquipo,
        colorPrimario: eqPayload.colorPrimario,
        colorSecundario: eqPayload.colorSecundario,
        categoria: eqPayload.categoria,
        descripcion: eqPayload.descripcion,
      });
      await em.persistAndFlush(equipo);
      equipoIds.push(equipo.id!);

      const jugadores: Jugador[] = eqPayload.jugadores.map((j) =>
        em.create(JugadorRef, {
          nombre: j.nombre,
          apellido: j.apellido,
          dni: j.dni,
          email: j.email,
          contraseña: j.contraseñaHash,
          fechaNacimiento: j.fechaNacimiento,
          posicion: j.posicion,
          genero: j.genero,
          esCapitan: j.esCapitan,
          equipo,
        })
      );
      await em.persistAndFlush(jugadores);
      jugadores.forEach((j) => jugadorIds.push(j.id!));

      console.log(`✓ ${eqPayload.nombreEquipo} — 20 jugadores insertados.`);
    }

    console.log(`\nInsertados ${equipoIds.length} equipos y ${jugadorIds.length} jugadores. Corriendo verificación...`);
    await verificar(em, EquipoRef, JugadorRef, equipoIds, jugadorIds);
  } finally {
    await orm.close(true);
  }
}

async function verificar(
  em: any,
  EquipoRef: typeof Equipo,
  JugadorRef: typeof Jugador,
  equipoIds: number[],
  jugadorIds: number[]
) {
  let ok = true;
  const fail = (msg: string) => { ok = false; console.error(`❌ ${msg}`); };
  const pass = (msg: string) => console.log(`✅ ${msg}`);

  // 1) 16 equipos nuevos de categoría mayores + 320 jugadores asociados a ellos
  const equiposDb = await em.find(EquipoRef, { id: { $in: equipoIds } });
  if (equiposDb.length === 16 && equiposDb.every((e: Equipo) => e.categoria === 'mayores')) {
    pass(`16 equipos nuevos confirmados, todos categoria='mayores'.`);
  } else {
    fail(`Se esperaban 16 equipos categoria='mayores', se encontraron ${equiposDb.length} (categorias: ${[...new Set(equiposDb.map((e: Equipo) => e.categoria))]}).`);
  }

  const jugadoresDb = await em.find(JugadorRef, { id: { $in: jugadorIds } }, { populate: ['equipo'] });
  const equipoIdsSet = new Set(equipoIds);
  const todosAsociados = jugadoresDb.every((j: Jugador) => j.equipo && equipoIdsSet.has(j.equipo.id!));
  if (jugadoresDb.length === 320 && todosAsociados) {
    pass(`320 jugadores nuevos confirmados, todos asociados a los 16 equipos nuevos.`);
  } else {
    fail(`Se esperaban 320 jugadores asociados a los equipos nuevos, se encontraron ${jugadoresDb.length} (asociados correctamente: ${jugadoresDb.filter((j: Jugador) => j.equipo && equipoIdsSet.has(j.equipo.id!)).length}).`);
  }

  // 2) sin emails ni dnis duplicados en TODA la tabla (existentes + nuevos)
  const todos = await em.find(JugadorRef, {}, { fields: ['id', 'dni', 'email'] });
  const porDni = new Map<string, number[]>();
  const porEmail = new Map<string, number[]>();
  for (const j of todos as { id: number; dni: string; email: string }[]) {
    porDni.set(j.dni, [...(porDni.get(j.dni) ?? []), j.id]);
    porEmail.set(j.email, [...(porEmail.get(j.email) ?? []), j.id]);
  }
  const dnisDuplicados = [...porDni.entries()].filter(([, ids]) => ids.length > 1);
  const emailsDuplicados = [...porEmail.entries()].filter(([, ids]) => ids.length > 1);
  if (dnisDuplicados.length === 0) {
    pass('Sin DNIs duplicados en toda la tabla jugador.');
  } else {
    fail(`DNIs duplicados encontrados: ${dnisDuplicados.map(([dni, ids]) => `${dni} (ids ${ids.join(',')})`).join('; ')}`);
  }
  if (emailsDuplicados.length === 0) {
    pass('Sin emails duplicados en toda la tabla jugador.');
  } else {
    fail(`Emails duplicados encontrados: ${emailsDuplicados.map(([email, ids]) => `${email} (ids ${ids.join(',')})`).join('; ')}`);
  }

  // 3) cada equipo con exactamente 2/7/7/4
  for (const equipoId of equipoIds) {
    const [arqueros, defensores, mediocampistas, delanteros, total] = await Promise.all([
      em.count(JugadorRef, { equipo: equipoId, posicion: 'Arquero' }),
      em.count(JugadorRef, { equipo: equipoId, posicion: 'Defensor' }),
      em.count(JugadorRef, { equipo: equipoId, posicion: 'Mediocampista' }),
      em.count(JugadorRef, { equipo: equipoId, posicion: 'Delantero' }),
      em.count(JugadorRef, { equipo: equipoId }),
    ]);
    const correcto = arqueros === 2 && defensores === 7 && mediocampistas === 7 && delanteros === 4 && total === 20;
    if (!correcto) {
      fail(`Equipo id ${equipoId}: distribución incorrecta (arq ${arqueros}, def ${defensores}, med ${mediocampistas}, del ${delanteros}, total ${total}).`);
    }
  }
  if (ok) pass('Los 16 equipos tienen exactamente 2 arqueros / 7 defensores / 7 mediocampistas / 4 delanteros.');

  console.log(ok ? '\n✅ Verificación completa: todo OK.' : '\n❌ Verificación completa: hay problemas, revisar arriba.');
}

async function main() {
  if (PREVIEW) {
    await correrPreview();
    return;
  }
  await correrInsercionReal();
}

main().catch(async (err) => {
  console.error('Error en seedAivenMayores:', err);
  process.exit(1);
});
