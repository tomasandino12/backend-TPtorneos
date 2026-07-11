import { Entity, ManyToOne, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Torneo } from '../torneo/torneo.entity.js';
import { Cancha } from '../cancha/cancha.entity.js';

@Entity()
@Unique({ properties: ['torneo', 'cancha'] })
export class TorneoCancha extends BaseEntity {

  @ManyToOne(() => Torneo)
  torneo!: Torneo;

  @ManyToOne(() => Cancha)
  cancha!: Cancha;

}
