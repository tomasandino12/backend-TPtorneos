import { Entity, Property, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
// import type + entidad como string en todas — ver arbitro.entity.ts para
// la explicación completa del ciclo que esto evita.
import type { AdminTorneo } from '../adminTorneo/adminTorneo.entity.js';
import type { Partido } from '../partido/partido.entity.js';
import type { Participacion } from '../participacion/participacion.entity.js';


// Estado: 'borrador' (recién creado, sin abrir inscripciones) | 'inscripcion'
// (equipos se pueden agregar) | 'en_curso' (fixture generado, partidos en
// juego) | 'finalizado' (todos los partidos con resultado)
// Categoria: 'sub15' | 'sub17' | 'mayores' | 'veteranos' | 'femenino'
// Formato: 'ida' | 'idayvuelta'
@Entity()
export class Torneo extends BaseEntity {
    @Property({ nullable: false })
    nombreTorneo!: string;

    @Property({ nullable: false })
    fechaInicio!: Date;

    @Property({ nullable: false })
    fechaFin!: Date;

    @Property({ nullable: false })
    estado!: string;

    @Property({ nullable: false, default: 'ida' })
    formato!: string;

    @Property({ nullable: false, default: 0 })
    cantidadEquipos!: number;

    @Property({ nullable: false, default: 'veteranos' })
    categoria!: string;

    @ManyToOne('AdminTorneo')
    adminTorneo!: AdminTorneo;

    @OneToMany('Partido', 'torneo')
    partidos = new Collection<Partido>(this);

    @OneToMany('Participacion', 'torneo')
    participaciones = new Collection<Participacion>(this);
}