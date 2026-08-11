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

/** Mínimo de árbitros/canchas que debe tener asignado un torneo. Se permite
 * dejarlo en 0 (todavía no se empezó a asignar), pero nunca un valor
 * intermedio — evita que setArbitros/setCanchas (torneo.controler.ts) dejen
 * un torneo con muy pocas opciones para el round-robin de generarFixture o
 * para la reasignación automática cuando se saca un árbitro/cancha en uso. */
export const MIN_ARBITROS_TORNEO = 3;
export const MIN_CANCHAS_TORNEO = 3;
