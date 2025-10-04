import { Entity, Property, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Partido, AdminTorneo, Participacion } from '../shared/db/entities.js';


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

    @ManyToOne(() => AdminTorneo)
    adminTorneo!: AdminTorneo;

    @OneToMany(() => Partido, partido => partido.torneo)
    partidos = new Collection<Partido>(this);

    @OneToMany(() => Participacion, participacion => participacion.torneo)
    participaciones = new Collection<Participacion>(this);
}