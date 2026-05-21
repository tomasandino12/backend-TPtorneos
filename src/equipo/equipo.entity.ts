import { Entity, Property, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Jugador, Participacion } from '../shared/db/entities.js';

// Categoria: 'sub15' | 'sub17' | 'mayores' | 'veteranos' | 'femenino'
@Entity()
export class Equipo extends BaseEntity {

  @Property({ nullable: false })
  nombreEquipo!: string;

  @Property({ nullable: false })
  colorPrimario!: string;

  @Property({ nullable: true })
  colorSecundario?: string;

  @Property({ nullable: false, default: 'veteranos' })
  categoria!: string;

  @OneToMany(() => Jugador, jugador => jugador.equipo)
  jugadores = new Collection<Jugador>(this);

  @OneToMany(() => Participacion, participacion => participacion.equipo)
  participaciones = new Collection<Participacion>(this);

}
