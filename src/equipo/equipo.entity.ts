import { Entity, Property, OneToMany, ManyToMany } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Jugador } from '../jugador/jugador.entity.js';
// import { Torneo } from '../torneo/torneo.entity.js';    hasta la creacion de la crud torneo dejarlo comentado

@Entity()
export class Equipo extends BaseEntity {

  @Property({ nullable: false })
  nombreEquipo!: string;

  @Property({ nullable: false })
  colorCamiseta!: string;

  @OneToMany(() => Jugador, jugador => jugador.equipo)
  jugadores = new Array<Jugador>();

  //@ManyToMany(() => Torneo, torneo => torneo.equipos)
  //torneos = new Array<Torneo>();
}
