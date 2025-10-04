import { Entity, Property, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Partido } from '../shared/db/entities.js';

@Entity()
export class Arbitro extends BaseEntity {

  @Property({ nullable: false })
  nombre!: string;

  @Property({ nullable: false })
  apellido!: string;

  @Property({ nullable: false })
  nro_matricula!: string;

  @Property({ nullable: false })
  email!: string;

  @OneToMany(() => Partido, partido => partido.arbitro)
  partidos = new Collection<Partido>(this);
}
