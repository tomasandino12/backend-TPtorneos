import { Entity, ManyToOne, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
// import type + entidad como string — ver arbitro.entity.ts para el patrón.
import type { Torneo } from '../torneo/torneo.entity.js';
import type { Arbitro } from '../arbitro/arbitro.entity.js';

@Entity()
@Unique({ properties: ['torneo', 'arbitro'] })
export class TorneoArbitro extends BaseEntity {

  @ManyToOne('Torneo')
  torneo!: Torneo;

  @ManyToOne('Arbitro')
  arbitro!: Arbitro;

}
