import { Entity, Property, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
// import type (no valor en runtime): Torneo importa AdminTorneo de forma
// directa (no nullable) para su propia relación, así que si este archivo
// también importara Torneo como VALOR se arma un ciclo circular real que
// crashea según el orden en que cada entry point cargue los módulos (pasó acá
// con el propio discovery de MikroORM al correr scripts/seed.ts). Usando
// 'Torneo' como string en el decorador de abajo, este archivo nunca necesita
// la clase Torneo en tiempo de ejecución — solo el tipo, que se borra al compilar.
import type { Torneo } from '../torneo/torneo.entity.js';

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

    @OneToMany('Torneo', 'adminTorneo')
    torneos = new Collection<Torneo>(this);
}