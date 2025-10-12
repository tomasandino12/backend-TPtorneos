import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Equipo } from '../shared/db/entities.js';

@Entity()
export class Jugador extends BaseEntity {
  @Property({ nullable: false })
  nombre!: string;

  @Property({ nullable: false })
  apellido!: string;

  @Property({ nullable: false })
  dni!: string;

  @Property({ nullable: false })
  email!: string;

  @Property({ nullable: false })
  fechaNacimiento!: string;

  @Property({ nullable: false })
  contraseña!: string;

  @Property({ nullable: false })
  posicion!: string;

  @Property({ default: false })
  esCapitan!: boolean;
 
  @ManyToOne(() => Equipo, { nullable: true })
  equipo!: Equipo | null;

}
