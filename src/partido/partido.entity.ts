import { Entity, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
// import type + entidad como string — ver arbitro.entity.ts para el patrón.
import type { Participacion } from '../participacion/participacion.entity.js';
import type { Arbitro } from '../arbitro/arbitro.entity.js';
import type { Cancha } from '../cancha/cancha.entity.js';
import type { Torneo } from '../torneo/torneo.entity.js';


@Entity()
export class Partido extends BaseEntity {

  @Property({ nullable: false })
  fecha_partido!: Date;

  @Property({ nullable: false })
  hora_partido!: string;

  @Property({ nullable: false })
  estado_partido!: string;

  @Property({ nullable: false })
  jornada!: number;

  @Property({ nullable: true })
  goles_local!: number;

  @Property({ nullable: true })
  goles_visitante!: number;

  // true si el resultado no se jugó de verdad — lo forzó la baja automática
  // de un equipo (3-0 al rival, o 0-0 si los dos equipos están de baja).
  @Property({ nullable: false, default: false })
  walkover!: boolean;

  @ManyToOne('Torneo')
  torneo!: Torneo;

  @ManyToOne('Cancha')
  cancha!: Cancha;

  @ManyToOne('Arbitro')
  arbitro!: Arbitro;

  @ManyToOne('Participacion', { inversedBy: 'partidosLocal' })
  local!: Participacion;

  @ManyToOne('Participacion', { inversedBy: 'partidosVisitante' })
  visitante!: Participacion;
}
