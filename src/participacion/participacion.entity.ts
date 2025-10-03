import { Entity, Property, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { Equipo } from '../equipo/equipo.entity.js';
import { Torneo } from '../torneo/torneo.entity.js';
import { Partido } from '../partido/partido.entity.js';

@Entity()
export class Participacion {

  @ManyToOne(() => Equipo, { primary: true })
  equipo!: Equipo;

  @ManyToOne(() => Torneo, { primary: true })
  torneo!: Torneo;

  @Property()
  fecha_inscripcion!: Date;

  @OneToMany(() => Partido, partido => partido.local)
  partidosLocal = new Collection<Partido>(this);

  @OneToMany(() => Partido, partido => partido.visitante)
  partidosVisitante = new Collection<Partido>(this);

}
