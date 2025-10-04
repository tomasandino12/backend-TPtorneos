import { Entity, Property, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Torneo } from '../shared/db/entities.js';

@Entity()
export class AdminTorneo extends BaseEntity {
    @Property({ nullable: false })
    nombre!: string;

    @Property({ nullable: false })
    apellido!: string;

    @Property({ nullable: false })
    email!: string;

    @Property({ nullable: false })
    contraseña!: string;

    @Property({ nullable: false })
    telefono!: string;

    @OneToMany(() => Torneo, torneo => torneo.adminTorneo)
    torneos = new Collection<Torneo>(this);
}