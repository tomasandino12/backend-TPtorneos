import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
// import type + entidad como string en el decorador — ver arbitro.entity.ts
// para la explicación completa del ciclo que esto evita.
import type { Equipo } from '../equipo/equipo.entity.js';

@Entity()
export class Jugador extends BaseEntity {
  @Property({ nullable: false })
  nombre!: string;

  @Property({ nullable: false })
  apellido!: string;

  @Property({ nullable: false })
  dni!: string;

  @Property({ nullable: false })
  email!: string;

  @Property({ nullable: false })
  fechaNacimiento!: string;

  @Property({ nullable: false })
  contraseña!: string;

  @Property({ nullable: false })
  posicion!: string;

  // 'femenino' | 'masculino'. Nullable a propósito: los jugadores ya
  // existentes antes de este campo quedan en null (no se les asigna un valor
  // por defecto) y van a fallar cualquier validación de categoría hasta que
  // alguien complete el dato — ver shared/categorias.ts.
  @Property({ nullable: true })
  genero?: string;

  @Property({ nullable: true })
  descripcion?: string;

  @Property({ default: false })
  esCapitan!: boolean;

  @ManyToOne('Equipo', { nullable: true })
  equipo!: Equipo | null;

  @Property({ nullable: true })
  resetPasswordTokenHash?: string;

  @Property({ nullable: true })
  resetPasswordExpires?: Date;

}
