import { Entity, Property, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Partido } from '../partido/partido.entity.js';

@Entity()
export class Cancha extends BaseEntity {

  @Property({nullable:false})
  nombre!: string;

  @Property({nullable:false})
  direccion!: string;

  @Property({nullable:false})
  tipoSuperficie!: string;

  @Property({nullable:false})
  capacidad!: number;

  @OneToMany(() => Partido, p => p.cancha)
  partidos = new Collection<Partido>(this);
}
