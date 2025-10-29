import { Entity, Property, OneToMany, Collection, PrimaryKey } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Jugador, Participacion } from '../shared/db/entities.js';

@Entity()
export class Equipo extends BaseEntity {

  @Property({ nullable: false })
  nombreEquipo!: string;

  @Property({ nullable: false })
  colorCamiseta!: string;

  @OneToMany(() => Jugador, jugador => jugador.equipo)
  jugadores = new Collection<Jugador>(this);

  @OneToMany(() => Participacion, participacion => participacion.equipo)
  participaciones = new Collection<Participacion>(this);

}
