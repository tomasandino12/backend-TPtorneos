import { Entity, Property, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Partido, AdminTorneo, Participacion } from '../shared/db/entities.js';


// Estado: 'borrador' | 'en_curso' | 'finalizado'
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

    @ManyToOne(() => AdminTorneo)
    adminTorneo!: AdminTorneo;

    @OneToMany(() => Partido, partido => partido.torneo)
    partidos = new Collection<Partido>(this);

    @OneToMany(() => Participacion, participacion => participacion.torneo)
    participaciones = new Collection<Participacion>(this);
}