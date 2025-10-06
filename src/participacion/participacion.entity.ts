import { Entity, Property, ManyToOne, OneToMany, Collection, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Equipo, Torneo, Partido } from '../shared/db/entities.js';
import e from 'express';

@Entity()
@Unique({ properties: ['torneo', 'equipo'] })
export class Participacion extends BaseEntity {

  @ManyToOne(() => Equipo)
  equipo!: Equipo;

  @ManyToOne(() => Torneo)
  torneo!: Torneo;

  @Property()
  fecha_inscripcion!: Date;

  @OneToMany(() => Partido, partido => partido.local)
  partidosLocal = new Collection<Partido>(this);

  @OneToMany(() => Partido, partido => partido.visitante)
  partidosVisitante = new Collection<Partido>(this);

}
