import { Entity, Property, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
// import type + entidad como string — ver arbitro.entity.ts para el patrón.
import type { Equipo } from '../equipo/equipo.entity.js';
import type { FormacionTitular } from './formacionTitular.entity.js';

// esquema: '4-3-3' | '4-4-2' | '4-2-3-1' | '5-3-2' — ver CUPOS_POR_ESQUEMA en formacion.controler.ts
@Entity()
export class Formacion extends BaseEntity {

  @ManyToOne('Equipo', { unique: true })
  equipo!: Equipo;

  @Property()
  esquema!: string;

  @Property({ nullable: true })
  notas?: string;

  @Property()
  fecha!: Date;

  @OneToMany('FormacionTitular', 'formacion')
  titulares = new Collection<FormacionTitular>(this);

}
