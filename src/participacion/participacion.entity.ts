import { Entity, Property, ManyToOne, OneToMany, Collection, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
// import type + entidad como string en todas — ver arbitro.entity.ts para
// la explicación completa del ciclo que esto evita.
import type { Equipo } from '../equipo/equipo.entity.js';
import type { Torneo } from '../torneo/torneo.entity.js';
import type { Partido } from '../partido/partido.entity.js';

@Entity()
@Unique({ properties: ['torneo', 'equipo'] })
export class Participacion extends BaseEntity {

  @ManyToOne('Equipo')
  equipo!: Equipo;

  @ManyToOne('Torneo')
  torneo!: Torneo;

  @Property()
  fecha_inscripcion!: Date;

  @OneToMany('Partido', 'local')
  partidosLocal = new Collection<Partido>(this);

  @OneToMany('Partido', 'visitante')
  partidosVisitante = new Collection<Partido>(this);

}
