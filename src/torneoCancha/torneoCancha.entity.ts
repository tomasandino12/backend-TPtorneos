import { Entity, ManyToOne, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
// import type + entidad como string en el decorador: evita que este archivo
// necesite Torneo/Cancha como VALOR en tiempo de carga de módulos — ver
// arbitro.entity.ts para la explicación completa del ciclo que esto evita.
import type { Torneo } from '../torneo/torneo.entity.js';
import type { Cancha } from '../cancha/cancha.entity.js';

@Entity()
@Unique({ properties: ['torneo', 'cancha'] })
export class TorneoCancha extends BaseEntity {

  @ManyToOne('Torneo')
  torneo!: Torneo;

  @ManyToOne('Cancha')
  cancha!: Cancha;

}
