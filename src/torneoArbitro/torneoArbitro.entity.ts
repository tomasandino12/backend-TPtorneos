import { Entity, ManyToOne, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Torneo } from '../torneo/torneo.entity.js';
import { Arbitro } from '../arbitro/arbitro.entity.js';

@Entity()
@Unique({ properties: ['torneo', 'arbitro'] })
export class TorneoArbitro extends BaseEntity {

  @ManyToOne(() => Torneo)
  torneo!: Torneo;

  @ManyToOne(() => Arbitro)
  arbitro!: Arbitro;

}
