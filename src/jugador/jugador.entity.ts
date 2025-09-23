import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity';

@Entity()
export class Jugador extends BaseEntity {
  @PrimaryKey()
  id?: number;

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
  posicion!: string;
}
