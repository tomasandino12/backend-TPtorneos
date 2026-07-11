import { Entity, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
// import type + entidad como string — ver arbitro.entity.ts para el patrón.
import type { Jugador } from '../jugador/jugador.entity.js';
import type { Equipo } from '../equipo/equipo.entity.js';

// estado: 'pendiente' | 'aceptada' | 'rechazada'
@Entity()
export class Invitacion extends BaseEntity {

  @ManyToOne('Jugador')
  jugador!: Jugador;

  @ManyToOne('Equipo')
  equipo!: Equipo;

  @ManyToOne('Jugador')
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
