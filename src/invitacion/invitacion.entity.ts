import { Entity, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Jugador, Equipo } from '../shared/db/entities.js';

// estado: 'pendiente' | 'aceptada' | 'rechazada'
@Entity()
export class Invitacion extends BaseEntity {

  @ManyToOne(() => Jugador)
  jugador!: Jugador;

  @ManyToOne(() => Equipo)
  equipo!: Equipo;

  @ManyToOne(() => Jugador)
  capitanEmisor!: Jugador;

  @Property({ nullable: false, default: 'pendiente' })
  estado!: string;

  @Property()
  fechaEnvio!: Date;

  @Property({ nullable: true })
  fechaRespuesta?: Date;

  @Property({ default: false })
  vistaPorCapitan!: boolean;

}
