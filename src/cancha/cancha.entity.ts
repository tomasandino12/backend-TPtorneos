import { Entity, Property, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Partido } from '../shared/db/entities.js';

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

  // 'activa' | 'mantenimiento' | 'inactiva'
  @Property({ nullable: false, default: 'activa' })
  estado!: string;

  @Property({ nullable: false, default: 0 })
  precioPorHora!: number;

  @Property({ nullable: false, default: false })
  iluminacion!: boolean;

  @OneToMany(() => Partido, partido => partido.cancha)
  partidos = new Collection<Partido>(this);
}
