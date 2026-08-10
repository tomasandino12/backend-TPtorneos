/** Cupo máximo de jugadores por plantel de equipo.
 * Usado tanto al aceptar una invitación (invitacion.controler.ts) como al
 * dar de alta un jugador directamente con equipo asignado (jugador.controler.ts)
 * — debe ser el mismo valor en los dos lugares. */
export const MAX_JUGADORES_PLANTEL = 26;

/** Plantel mínimo para que un equipo siga participando de un torneo en_curso.
 * Si el plantel cae por debajo de este número (por expulsión o por salida
 * voluntaria de un jugador), el equipo se da de baja automáticamente de sus
 * participaciones activas — ver equipo.controler.ts, procesarBajaAutomaticaSiCorresponde. */
export const MIN_JUGADORES_PLANTEL_TORNEO = 15;
