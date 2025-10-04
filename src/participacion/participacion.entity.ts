import { Entity, Property, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { Equipo, Torneo, Partido } from '../shared/db/entities.js';

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
