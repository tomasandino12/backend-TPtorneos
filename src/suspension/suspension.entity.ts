import { Entity, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
// import type + entidad como string — ver arbitro.entity.ts para el patrón.
import type { Jugador } from '../jugador/jugador.entity.js';
import type { Torneo } from '../torneo/torneo.entity.js';

@Entity()
export class Suspension extends BaseEntity {

  @ManyToOne('Jugador')
  jugador!: Jugador;

  @ManyToOne('Torneo')
  torneo!: Torneo;

  @Property()
  motivo!: string;

  @Property()
  fecha!: Date;

  @Property({ nullable: false, default: true })
  activa!: boolean;

  @Property({ nullable: true })
  fechaLevantamiento?: Date;

}
