import { Entity, Property, ManyToOne, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
// import type + entidad como string — ver arbitro.entity.ts para el patrón.
import type { Formacion } from './formacion.entity.js';
import type { Jugador } from '../jugador/jugador.entity.js';

// categoria: 'arquero' | 'defensor' | 'mediocampista' | 'delantero' (derivada de jugador.posicion)
// orden: índice del slot dentro de la categoría (0-based), para redibujar siempre en el mismo lugar de la cancha.
@Entity()
@Unique({ properties: ['formacion', 'jugador'] })
export class FormacionTitular extends BaseEntity {

  @ManyToOne('Formacion')
  formacion!: Formacion;

  @ManyToOne('Jugador')
  jugador!: Jugador;

  @Property()
  categoria!: string;

  @Property()
  orden!: number;

}
