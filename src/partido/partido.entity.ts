import { Entity, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Participacion } from '../participacion/participacion.entity.js';
import { Arbitro } from '../arbitro/arbitro.entity.js';
import { Cancha } from '../cancha/cancha.entity.js';
import { Torneo } from '../torneo/torneo.entity.js';


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

  @Property({ nullable: false })
  goles_local!: number;

  @Property({ nullable: false })
  goles_visitante!: number;

  @ManyToOne({entity: () => Torneo})
  torneo!: Torneo;

  @ManyToOne(() => Cancha)
  cancha!: Cancha;

  @ManyToOne(() => Arbitro)
  arbitro!: Arbitro;

  @ManyToOne(() => Participacion, { inversedBy: 'partidosLocal' })
  local!: Participacion;

  @ManyToOne(() => Participacion, { inversedBy: 'partidosVisitante' })
  visitante!: Participacion;
}

