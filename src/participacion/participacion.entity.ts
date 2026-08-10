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

  // 'activo' | 'dado_de_baja' — se pasa a 'dado_de_baja' automáticamente si
  // el plantel del equipo cae por debajo del mínimo mientras el torneo está
  // en_curso (ver equipo.controler.ts, procesarBajaAutomaticaSiCorresponde).
  @Property({ nullable: false, default: 'activo' })
  estado_participacion!: string;

  @OneToMany('Partido', 'local')
  partidosLocal = new Collection<Partido>(this);

  @OneToMany('Partido', 'visitante')
  partidosVisitante = new Collection<Partido>(this);

}
