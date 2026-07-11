import { Entity, Property, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
// import type: Partido tiene un @ManyToOne directo (no nullable) hacia
// Arbitro, así que importar la clase como valor acá arma un ciclo que
// crashea según el orden de carga (ver adminTorneo.entity.ts para el mismo
// patrón). Con 'Partido' como string en el decorador no hace falta el valor.
import type { Partido } from '../partido/partido.entity.js';

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

  @OneToMany('Partido', 'arbitro')
  partidos = new Collection<Partido>(this);
}
