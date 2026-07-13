# Entidades

Cada entidad es una clase TypeScript con decoradores de MikroORM (`@Entity`, `@Property`, `@ManyToOne`, `@OneToMany`, `@Unique`) que describen una tabla de MySQL y sus relaciones. Todas extienden `BaseEntity` (`src/shared/db/baseEntity.entity.ts`), que solo aporta el campo `id` (`@PrimaryKey() id?: number`) — ninguna entidad redeclara su propia clave primaria.

Los campos marcados `?` en el código (`descripcion?: string`) son opcionales/nullable en la base. Los campos con `!` (`nombre!: string`) son obligatorios (`nullable: false`, explícito o por default de MikroORM).

## Mapa de relaciones

```
AdminTorneo ──< Torneo ──< Partido >── Cancha
                  │           │
                  │           ├── Arbitro
                  │           └─< Participacion >── Equipo ──< Jugador
                  │                    (local/visitante)         │
                  ├─< Participacion                              ├─< Formacion ──< FormacionTitular >── Jugador
                  ├─< TorneoArbitro >── Arbitro                  ├─< Invitacion (jugador, capitanEmisor) >── Equipo
                  └─< TorneoCancha >── Cancha                    ├─< Suspension >── Torneo
                                                                  └─< Notificacion >── Torneo (opcional)
```

Lectura de la notación: `A ──< B` significa "A tiene muchos B" (`@OneToMany`); `A >── B` significa "muchos A apuntan a un B" (`@ManyToOne`, del lado dueño de la relación). Un `Partido` es el nodo con más relaciones: apunta a `Torneo`, `Cancha`, `Arbitro`, y a **dos** `Participacion` distintas (`local` y `visitante`) — ver la entidad `Partido` más abajo para por qué es así.

## `Jugador`

Representa a una persona que juega al fútbol amateur y usa la app — se registra, opcionalmente pertenece a un equipo, y puede ser su capitán.

| Campo | Tipo | Notas |
|---|---|---|
| `nombre`, `apellido`, `dni`, `email` | `string` | Obligatorios. `email` es el usuario de login. |
| `fechaNacimiento` | `string` | Se guarda como texto (`'2003-09-25'`), no como `Date` — a diferencia de `fecha_partido`/`fechaInicio` en otras entidades, que sí son `Date`. |
| `contraseña` | `string` | Hasheada con bcrypt antes de guardar (`add`/`register` en `jugador.controler.ts`). |
| `posicion` | `string` | Texto libre en la entidad, pero en la práctica el proyecto solo usa 4 valores: `'Arquero'`, `'Defensor'`, `'Mediocampista'`, `'Delantero'` (ver `scripts/seed.ts` y la lógica de `/formaciones`, que depende de que sea exactamente uno de esos 4 para poder categorizar jugadores). No hay una validación server-side que lo restrinja a esos 4 valores en `add`/`update` de jugador — ver `pendientes.md`. |
| `descripcion` | `string?` | Texto libre, opcional. Columna `varchar(255)` — ver `pendientes.md`, mismo patrón que el bug que se corrigió en `Formacion.notas`. |
| `esCapitan` | `boolean` | Default `false`. Como mucho un jugador por equipo puede tener esto en `true` — no hay una restricción a nivel de base de datos para eso, se valida en código (`jugador.controler.ts`, función `update`, y en la creación de equipo). |
| `equipo` | `Equipo \| null` | `@ManyToOne('Equipo', { nullable: true })`. `null` significa "sin equipo". |
| `resetPasswordTokenHash`, `resetPasswordExpires` | `string?`, `Date?` | Soporte del flujo de "olvidé mi contraseña" (`forgotPassword`/`resetPassword`). |

## `Equipo`

Representa un equipo amateur — el agrupador de jugadores que participa en torneos.

| Campo | Tipo | Notas |
|---|---|---|
| `nombreEquipo`, `colorPrimario` | `string` | Obligatorios. |
| `colorSecundario` | `string?` | Opcional. |
| `categoria` | `string` | Default `'veteranos'`. Valores válidos (impuestos en `sanitizeEquipoInput`, no en la entidad): `sub15`, `sub17`, `mayores`, `veteranos`, `femenino`. |
| `descripcion` | `string?` | Igual que en `Jugador`: `varchar(255)`, sin tipo `text` — ver `pendientes.md`. |
| `escudoUrl` | `string?` | Ruta relativa al archivo subido (`/uploads/escudos/escudo-<id>-<timestamp>.jpg`), no la imagen en sí. |
| `jugadores` | `Collection<Jugador>` | `@OneToMany('Jugador', 'equipo')` — el plantel completo. El límite de 26 jugadores (`MAX_JUGADORES_PLANTEL`) está en `invitacion.controler.ts`, no en la entidad. |
| `participaciones` | `Collection<Participacion>` | Historial de inscripciones a torneos. |

## `Torneo`

Representa un torneo — su ciclo de vida completo, desde que un `AdminTorneo` lo crea hasta que termina.

| Campo | Tipo | Notas |
|---|---|---|
| `nombreTorneo` | `string` | Obligatorio. |
| `fechaInicio`, `fechaFin` | `Date` | A diferencia de `Jugador.fechaNacimiento`, acá sí son `Date` reales. |
| `estado` | `string` | Sin default en la entidad (`nullable: false` sin `default`). Valores válidos, impuestos en `sanitizeTorneoInput`: `borrador`, `inscripcion`, `en_curso`, `finalizado`. `generarFixture` fuerza el torneo a `en_curso` automáticamente al generar el fixture. |
| `formato` | `string` | Default `'ida'`. Otro valor usado en código: `'idayvuelta'` (ver `generarRondas` en `torneo.controler.ts`). |
| `cantidadEquipos` | `number` | Default `0`. Es un campo informativo — no se recalcula automáticamente contra `participaciones.length`. |
| `categoria` | `string` | Default `'veteranos'`, mismos 5 valores que `Equipo.categoria`. `participacion.controler.ts` exige que coincida con la categoría del equipo que se inscribe. |
| `adminTorneo` | `AdminTorneo` | `@ManyToOne`, obligatorio — todo torneo pertenece a un administrador. |
| `partidos` | `Collection<Partido>` | Fixture completo del torneo. |
| `participaciones` | `Collection<Participacion>` | Equipos inscriptos. |

## `Participacion`

Es la entidad intermedia entre `Equipo` y `Torneo` — representa "este equipo está inscripto en este torneo". `@Unique(['torneo', 'equipo'])`: un equipo no puede inscribirse dos veces al mismo torneo.

| Campo | Tipo | Notas |
|---|---|---|
| `equipo` | `Equipo` | `@ManyToOne`, obligatorio. |
| `torneo` | `Torneo` | `@ManyToOne`, obligatorio. |
| `fecha_inscripcion` | `Date` | Único campo de esta entidad con `snake_case` en vez de `camelCase` — inconsistencia menor de nombres entre entidades, ver `pendientes.md`. |
| `partidosLocal` | `Collection<Partido>` | `@OneToMany('Partido', 'local')` — partidos donde esta participación juega de local. |
| `partidosVisitante` | `Collection<Partido>` | `@OneToMany('Partido', 'visitante')` — partidos donde juega de visitante. |

Por qué existe esta entidad en vez de que `Partido` apunte directo a `Equipo`: un mismo equipo puede participar en más de un torneo a la vez (en teoría — `participacion.controler.ts` de hecho bloquea que un equipo tenga dos participaciones activas en torneos `en_curso` simultáneos, pero sí permite historial en torneos ya `finalizado`). Atar `Partido` a `Participacion` en vez de a `Equipo` directamente ata cada partido a "este equipo, en este torneo puntual", no a "este equipo" en abstracto.

## `Partido`

Representa un partido programado dentro del fixture de un torneo.

| Campo | Tipo | Notas |
|---|---|---|
| `fecha_partido` | `Date` | `snake_case`, como en `Participacion`. |
| `hora_partido` | `string` | Texto libre (ej. `"15:00"`), no un tipo `Time`. |
| `estado_partido` | `string` | Sin lista cerrada de valores en el código, pero en la práctica se usa `'programado'` (default al generar fixture) y `'finalizado'` (chequeado en `getEstadisticas`/`getEstadisticasTorneo` para decidir si el partido cuenta en la tabla de posiciones). |
| `jornada` | `number` | Número de fecha/ronda dentro del fixture (1, 2, 3...). |
| `goles_local`, `goles_visitante` | `number?` | Nullable en la entidad, pero `generarFixture` los inicializa en `0`, no en `null`. |
| `torneo`, `cancha`, `arbitro` | `Torneo`, `Cancha`, `Arbitro` | `@ManyToOne`, obligatorios. |
| `local`, `visitante` | `Participacion` | Dos `@ManyToOne` distintos hacia la misma entidad `Participacion`, cada uno con su propio `inversedBy` (`'partidosLocal'`/`'partidosVisitante'`) para que MikroORM sepa a cuál de las dos colecciones de `Participacion` corresponde cada lado. |

## `Cancha`

Representa una cancha física donde se juegan los partidos.

| Campo | Tipo | Notas |
|---|---|---|
| `nombre`, `direccion`, `tipoSuperficie` | `string` | Obligatorios. |
| `capacidad` | `number` | Obligatorio. |
| `estado` | `string` | Default `'activa'`. Valores válidos (en `cancha.controler.ts`): `activa`, `mantenimiento`, `inactiva`. |
| `precioPorHora` | `number` | Default `0`. |
| `iluminacion` | `boolean` | Default `false`. |
| `partidos` | `Collection<Partido>` | Partidos jugados en esta cancha. |

## `Arbitro`

Representa a un árbitro habilitado para dirigir partidos.

| Campo | Tipo | Notas |
|---|---|---|
| `nombre`, `apellido`, `nro_matricula`, `email` | `string` | Todos obligatorios. Sin autenticación propia — a diferencia de `Jugador`/`AdminTorneo`, `Arbitro` no tiene `contraseña` ni login: es un dato administrado por el admin de torneo, no un usuario que entra al sistema. |
| `partidos` | `Collection<Partido>` | Partidos que dirige. |

## `AdminTorneo`

Representa a quien organiza torneos — el otro tipo de usuario con login del sistema, además de `Jugador`.

| Campo | Tipo | Notas |
|---|---|---|
| `nombre`, `apellido`, `email`, `telefono` | `string` | Obligatorios. |
| `contraseña` | `string` | Hasheada con bcrypt — con una particularidad: `login()` en `adminTorneo.controler.ts` detecta si la contraseña guardada ya está hasheada (`$2...`) o sigue en texto plano, y en ese segundo caso la hashea recién en el primer login exitoso (migración progresiva, ver `decisiones.md`). |
| `torneos` | `Collection<Torneo>` | Torneos que organiza. |

## `Suspension`

Representa que un jugador fue suspendido de un torneo puntual (no de la plataforma en general).

| Campo | Tipo | Notas |
|---|---|---|
| `jugador` | `Jugador` | `@ManyToOne`, obligatorio. |
| `torneo` | `Torneo` | `@ManyToOne`, obligatorio — la suspensión es siempre relativa a un torneo, no global. |
| `motivo` | `string` | Obligatorio, texto libre. |
| `fecha` | `Date` | Cuándo se aplicó. |
| `activa` | `boolean` | Default `true`. Se pasa a `false` al levantar la suspensión (`habilitar`), no se borra el registro — queda como historial. |
| `fechaLevantamiento` | `Date?` | Se completa recién al levantar la suspensión. |

No hay un `suspension.routes.ts`/`suspension.controler.ts` propio — toda la lógica de crear/levantar una suspensión vive dentro de `jugador.controler.ts` (funciones `suspender`/`habilitar`/`suspensiones`, montadas en `jugadorRouter` bajo `/jugadores/:id/...`), no en su propio módulo de rutas.

## `Invitacion`

Representa que un capitán invitó a un jugador sin equipo a sumarse al suyo.

| Campo | Tipo | Notas |
|---|---|---|
| `jugador` | `Jugador` | El invitado. |
| `equipo` | `Equipo` | Al que se lo invita. |
| `capitanEmisor` | `Jugador` | Quién mandó la invitación — nótese que son **dos relaciones distintas hacia `Jugador`** en la misma entidad (el invitado y el capitán), cada una sin `inversedBy` explícito porque `Jugador` no tiene colecciones separadas para "invitaciones recibidas" vs. "invitaciones enviadas como capitán". |
| `estado` | `string` | Default `'pendiente'`. Valores válidos: `pendiente`, `aceptada`, `rechazada`. |
| `fechaEnvio` | `Date` | Obligatorio. |
| `fechaRespuesta` | `Date?` | Se completa al aceptar/rechazar. |
| `vistaPorCapitan` | `boolean` | Default `false` — permite que el capitán sepa si ya revisó la respuesta del jugador invitado (`PATCH /invitaciones/:id/vista`). |

## `Notificacion`

Representa un aviso puntual para un jugador — el mecanismo que reutilizan `expulsar`, `suspender`/`habilitar`, y `PUT /formaciones` para avisarle algo a uno o varios jugadores. Ver `glosario.md` para la historia completa de este sistema (incluye un bug real: el router existía pero no estaba montado).

| Campo | Tipo | Notas |
|---|---|---|
| `jugador` | `Jugador` | A quién le llega. `@ManyToOne`, obligatorio. |
| `tipo` | `string` | Sin lista cerrada en la entidad. Valores usados hoy en el código: `suspension`, `habilitacion` (`jugador.controler.ts`), `expulsion` (`jugador.controler.ts`), `formacion_actualizada` (`formacion.controler.ts`), `invitacion_recibida`, `invitacion_aceptada`, `invitacion_rechazada` (`invitacion.controler.ts`). |
| `mensaje` | `string` | Texto ya armado en el servidor (ej. `` `Fuiste suspendido del torneo "${torneo.nombreTorneo}". Motivo: ${motivo}` ``) — el frontend no arma el texto, solo lo muestra. |
| `torneo` | `Torneo?` | `@ManyToOne` opcional — se completa en notificaciones de suspensión/habilitación (que son relativas a un torneo), queda `null` en el resto de los tipos (ninguno de los demás es relativo a un torneo). |
| `leida` | `boolean` | Default `false`. |
| `fecha` | `Date` | Obligatorio. |

## `Formacion`

Representa la alineación activa de un equipo — **una por equipo**, no una por partido (se actualiza, no se crea de nuevo cada vez que el capitán la cambia).

| Campo | Tipo | Notas |
|---|---|---|
| `equipo` | `Equipo` | `@ManyToOne('Equipo', { unique: true })` — la restricción `unique` es justamente lo que garantiza "una formación por equipo" a nivel de base de datos, no solo por convención de código. |
| `esquema` | `string` | Uno de `'4-3-3'`, `'4-4-2'`, `'4-2-3-1'`, `'5-3-2'` (validado en `formacion.controler.ts`, constante `CUPOS_POR_ESQUEMA` — no hay un enum a nivel de MikroORM/MySQL, la restricción es 100% de aplicación). |
| `notas` | `string?` | `@Property({ type: 'text', nullable: true })` — **el único campo de texto largo explícito de todo el proyecto**. Nace con este tipo desde el principio, a diferencia de `Equipo.descripcion`/`Jugador.descripcion`, que quedaron en `varchar(255)` por omisión (ver `decisiones.md` y `pendientes.md`). |
| `fecha` | `Date` | Se actualiza en cada `PUT /formaciones` exitoso — es "última vez que se guardó", no "fecha de creación". |
| `titulares` | `Collection<FormacionTitular>` | El detalle de qué 11 jugadores están alineados y en qué slot. |

## `FormacionTitular`

Representa un jugador titular dentro de una formación, en un slot concreto — la pieza que permite redibujar siempre la misma cancha visualmente. `@Unique(['formacion', 'jugador'])`: un jugador no puede ocupar dos slots en la misma formación (red de seguridad a nivel de base, además de la validación de duplicados que ya hace el controlador).

| Campo | Tipo | Notas |
|---|---|---|
| `formacion` | `Formacion` | `@ManyToOne`, obligatorio. |
| `jugador` | `Jugador` | `@ManyToOne`, obligatorio. |
| `categoria` | `string` | `'arquero'` \| `'defensor'` \| `'mediocampista'` \| `'delantero'` — se deriva de `Jugador.posicion` en el momento de guardar (en minúsculas), no la manda el frontend: si el frontend pudiera mandar la categoría de un jugador de forma independiente de su `posicion` real, un capitán podría mentirla para forzar cupos que no corresponden. |
| `orden` | `number` | Índice del slot dentro de la categoría (0-based) — ej. el primer defensor cargado tiene `orden: 0`, el segundo `orden: 1`. Es lo mínimo necesario para que el frontend pueda redibujar cada jugador siempre en el mismo lugar de la cancha entre una carga de pantalla y la siguiente, sin necesitar coordenadas x/y persistidas. |

## `TorneoArbitro` / `TorneoCancha`

Dos entidades de relación muchos-a-muchos, cada una con `@Unique(['torneo', <arbitro|cancha>])`: representan qué árbitros/canchas están habilitados para un torneo puntual, antes de generar el fixture (`generarFixture` en `torneo.controler.ts` reparte los partidos entre los árbitros/canchas asignados, rotando en orden). No tienen su propio `*.controler.ts`/`*.routes.ts`: se gestionan a través de `torneo.controler.ts` (`getArbitros`/`setArbitros`/`getCanchas`/`setCanchas`, montados en `torneoRouter` bajo `/torneo/:id/arbitros` y `/torneo/:id/canchas`).

| Campo (ambas entidades) | Tipo | Notas |
|---|---|---|
| `torneo` | `Torneo` | `@ManyToOne`, obligatorio. |
| `arbitro` / `cancha` | `Arbitro` / `Cancha` | `@ManyToOne`, obligatorio. |

`setArbitros`/`setCanchas` reemplazan el set completo en cada llamada (`nativeDelete` de todas las filas del torneo, después inserta las nuevas) — no hay un endpoint para agregar/quitar una sola asociación a la vez.
