import { Entity, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Cancha } from '../cancha/cancha.entity.js';

@Entity()
export class Partido extends BaseEntity {

  @Property()
  fecha_partido!: Date;

  @Property()
  hora_partido!: string;          

  @Property()
  estado_partido!: string;        

  @Property()
  goles_local!: number;

  @Property()
  goles_visitante!: number;

  @ManyToOne(() => Cancha)
  cancha!: Cancha;
}
