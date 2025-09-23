import { Entity, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Cancha } from '../cancha/cancha.entity.js';

@Entity()
export class Partido extends BaseEntity {

  @Property({ nullable: false })
  fecha_partido!: Date;

  @Property({ nullable: false })
  hora_partido!: string;

  @Property({ nullable: false })
  estado_partido!: string;

  @Property({ nullable: false })
  goles_local!: number;

  @Property({ nullable: false })
  goles_visitante!: number;

  @ManyToOne(() => Cancha)
  cancha!: Cancha;
}

