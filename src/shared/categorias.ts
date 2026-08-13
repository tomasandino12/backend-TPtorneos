/** Fuente única de las categorías de Equipo/Torneo del sistema — antes vivía
 * duplicada como un array literal en equipo.controler.ts, torneo.controler.ts
 * y (parcialmente, le faltaba 'mayores') scripts/seed.ts, además de repetida
 * en comentarios de equipo.entity.ts/torneo.entity.ts. Cualquier lugar que
 * necesite la lista de categorías válidas, o las reglas de género/edad para
 * integrar un equipo de una categoría dada, importa de acá — no copiar. */

export type Genero = 'femenino' | 'masculino';

export interface ReglaCategoria {
  value: string;
  label: string;
  /** Género exigido para integrar un equipo de esta categoría, o null si no hay restricción. */
  genero: Genero | null;
  /** Edad mínima exigida (inclusive), o null si no hay piso. */
  edadMin: number | null;
  /** Edad máxima exigida (inclusive), o null si no hay techo. */
  edadMax: number | null;
}

export const CATEGORIAS: ReglaCategoria[] = [
  { value: 'sub15', label: 'Sub-15', genero: 'masculino', edadMin: null, edadMax: 15 },
  { value: 'sub17', label: 'Sub-17', genero: 'masculino', edadMin: null, edadMax: 17 },
  { value: 'mayores', label: 'Mayores', genero: 'masculino', edadMin: 18, edadMax: null },
  { value: 'veteranos', label: 'Veteranos', genero: 'masculino', edadMin: 35, edadMax: null },
  { value: 'femenino', label: 'Femenino', genero: 'femenino', edadMin: null, edadMax: null },
];

export const CATEGORIAS_VALIDAS: string[] = CATEGORIAS.map((c) => c.value);

export function obtenerReglaCategoria(categoria: string): ReglaCategoria | undefined {
  return CATEGORIAS.find((c) => c.value === categoria);
}

/** Edad en años cumplidos a hoy, a partir de una fecha de nacimiento (string
 * "YYYY-MM-DD" o Date) — mismo cálculo en todos los lugares que la necesiten. */
export function calcularEdad(fechaNacimiento: string | Date): number {
  const fn = new Date(fechaNacimiento);
  const hoy = new Date();
  let edad = hoy.getFullYear() - fn.getFullYear();
  const mesDiff = hoy.getMonth() - fn.getMonth();
  if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < fn.getDate())) edad--;
  return edad;
}

/** Devuelve un mensaje de error si el jugador NO cumple género/edad para la
 * categoría dada, o null si cumple (o si la categoría no existe — no es
 * responsabilidad de esta función rechazar una categoría inválida). Un
 * jugador con `genero` null/undefined (dato viejo, todavía no completado)
 * nunca cumple una categoría que exige género. */
export function validarJugadorParaCategoria(
  jugador: { genero?: string | null; fechaNacimiento: string | Date },
  categoria: string
): string | null {
  const regla = obtenerReglaCategoria(categoria);
  if (!regla) return null;

  const requisitos: string[] = [];
  if (regla.genero) requisitos.push(regla.genero);
  if (regla.edadMax != null) requisitos.push(`hasta ${regla.edadMax} años`);
  if (regla.edadMin != null) requisitos.push(`desde ${regla.edadMin} años`);
  const mensaje = `Este equipo es de categoría ${regla.label} (${requisitos.join(', ')}) y el jugador no cumple los requisitos.`;

  if (regla.genero && jugador.genero !== regla.genero) return mensaje;

  const edad = calcularEdad(jugador.fechaNacimiento);
  if (regla.edadMax != null && edad > regla.edadMax) return mensaje;
  if (regla.edadMin != null && edad < regla.edadMin) return mensaje;

  return null;
}
