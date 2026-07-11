import { Entity, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
// import type + entidad como string — ver arbitro.entity.ts para el patrón.
import type { Jugador } from '../jugador/jugador.entity.js';
import type { Torneo } from '../torneo/torneo.entity.js';

// tipo: 'suspension' | 'habilitacion'
@Entity()
export class Notificacion extends BaseEntity {

  @ManyToOne('Jugador')
  jugador!: Jugador;

  @Property()
  tipo!: string;

  @Property()
  mensaje!: string;

  @ManyToOne('Torneo', { nullable: true })
  torneo?: Torneo;

  @Property({ nullable: false, default: false })
  leida!: boolean;

  @Property()
  fecha!: Date;

}
