import { Entity, Property, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
// import type + entidad como string en todas — ver arbitro.entity.ts para
// la explicación completa del ciclo que esto evita.
import type { Jugador } from '../jugador/jugador.entity.js';
import type { Participacion } from '../participacion/participacion.entity.js';

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

  @Property({ nullable: true })
  descripcion?: string;

  @Property({ nullable: true })
  escudoUrl?: string;

  @OneToMany('Jugador', 'equipo')
  jugadores = new Collection<Jugador>(this);

  @OneToMany('Participacion', 'equipo')
  participaciones = new Collection<Participacion>(this);

}
