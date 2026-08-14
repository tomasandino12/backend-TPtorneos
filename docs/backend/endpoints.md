# Endpoints

Todas las rutas están montadas bajo el prefijo `/api` (ver `src/app.ts` y `src/routes.ts`). La columna **Auth** indica qué exige cada endpoint más allá del JWT válido genérico (que ya exige el middleware global para todo lo que no esté en `PUBLIC_PATHS` — ver `glosario.md`). Cuando dice "cualquier autenticado", significa que el código no verifica rol ni dueño más allá de tener un JWT válido — ver la nota de cada grupo y `pendientes.md` para los casos donde eso es más una omisión que una decisión.

Las respuestas de éxito, salvo que se aclare lo contrario, tienen la forma `{ message: string, data: ... }`. Los códigos de error no listados explícitamente devuelven `500` con `{ message: error.message }` (el catch genérico que repite casi todos los controladores).

## Jugadores — `/api/jugadores`

| Método | Ruta | Auth | Body | Éxito | Errores principales |
|---|---|---|---|---|---|
| POST | `/login` | pública | `{ email, contraseña }` | `200` `{ token }` (payload: `{ id, nombre, email }`) | `401` credenciales inválidas |
| POST | `/registro` | pública | `{ nombre, apellido, dni, email, fechaNacimiento, contraseña, posicion, genero, descripcion? }` | `201` `{ token, id }` | `400` faltan email/contraseña · `400` género inválido/faltante (`'femenino'`\|`'masculino'`, ver `shared/categorias.ts`) · `409` email en uso · `400` DNI en uso |
| POST | `/forgot-password` | pública | `{ email }` | `200` mensaje genérico (siempre, exista o no el email — evita filtrar qué emails están registrados) | — |
| POST | `/reset-password` | pública | `{ token, nuevaContraseña }` | `200` | `400` token inválido/expirado |
| GET | `/` | cualquier autenticado | — | `200` lista completa (sin `contraseña`) | — |
| GET | `/by-email?email=` | cualquier autenticado | — | `200` | `400` falta `email` · `404` no encontrado |
| GET | `/sin-equipo` | cualquier autenticado | — | `200` lista de jugadores con `equipo: null` | — |
| GET | `/por-admin/:adminId` | cualquier autenticado | — | `200` jugadores de equipos que participan en torneos de ese admin | — |
| GET | `/:id/suspensiones` | cualquier autenticado | — | `200` `{ suspensiones: [...], torneoActivo }` | `404` jugador no encontrado |
| GET | `/:id` | cualquier autenticado | — | `200` | `404` |
| POST | `/` | cualquier autenticado | `{ nombre, apellido, dni, email, fechaNacimiento, contraseña, posicion, genero?, equipo?, esCapitan? }` | `201` | `400` faltan campos · `409` email en uso |

**Hallazgo pendiente**: a diferencia de `register()`, `update()` y `responder()` de invitación, este `add()` **no** valida `genero` contra `GENEROS_VALIDOS` ni corre `validarJugadorParaCategoria` cuando `equipo` viene seteado en el body — se puede dar de alta un jugador con género inválido/ausente y asignarlo directo a un equipo de una categoría que no le corresponde. Ver `pendientes.md`.
| PATCH | `/:id/transferir-capitania` | JWT: `:id` debe ser el propio usuario logueado (además de ser capitán) | `{ idNuevoCapitan }` | `200` `{ idSaliente, idNuevoCapitan }` | `403` `:id` no coincide con `req.user.id` · `403` no es capitán · `404` nuevo capitán no existe · `400` mismo jugador / equipo distinto |
| PATCH | `/:id/expulsar` | JWT: capitán del equipo del jugador `:id` | `{ motivo }` (mín. 5 caracteres) | `200` `{ idJugador, idEquipo, motivo }` | `403` no-capitán · `404` jugador no encontrado · `403` capitán de otro equipo · `400` auto-expulsión · `400` motivo inválido |
| PATCH | `/:id/suspender` | JWT: admin dueño del torneo activo del equipo de `:id` | `{ motivo }` | `201` `Suspension` creada | `400` motivo vacío · `404` jugador no encontrado · `400` sin torneo activo · `403` admin de otro torneo · `409` ya suspendido |
| PATCH | `/:id/habilitar` | JWT: admin dueño del torneo de la suspensión | `{ idSuspension }` | `200` | `400` falta `idSuspension` · `404` suspensión no encontrada · `400` ya levantada · `403` admin de otro torneo |
| PUT / PATCH | `/:id` | JWT: `:id` debe ser el propio usuario logueado | cualquier subconjunto de campos de jugador, incluye `equipo`/`esCapitan` | `200` | `403` no es tu perfil · `404` jugador · `409` email en uso · `404` equipo · `400` el equipo ya tiene capitán |
| DELETE | `/:id` | JWT: `:id` debe ser el propio usuario logueado | — | `200` | `403` no es tu perfil |

**Nota de este grupo**: `expulsar`, `suspender`, `habilitar`, `transferirCapitania` y `update`/`remove` (`PUT`/`PATCH`/`DELETE /:id`) siguen todos el patrón "identificar al actor por JWT" (ver `glosario.md`) — los últimos tres se corrigieron en una sesión dedicada a cerrar exactamente este tipo de hueco (ver `decisiones.md`).

`update` (`PUT`/`PATCH /:id`) tiene además la lógica de "salir del equipo" (`equipo: null` en el body): reasigna automáticamente la capitanía al jugador más antiguo del equipo si el que sale era capitán, y borra el equipo si se queda sin nadie. Es el mecanismo que `expulsar` reemplazó para el caso puntual de "un capitán echa a alguien" (ver `decisiones.md`), pero sigue siendo el único camino para que un jugador se vaya de su equipo por decisión propia.

## Equipos — `/api/equipos`

| Método | Ruta | Auth | Body | Éxito | Errores principales |
|---|---|---|---|---|---|
| GET | `/` | cualquier autenticado | — | `200` lista con plantel resumido | — |
| GET | `/estadisticas/:torneoId` | cualquier autenticado | — | `200` tabla de posiciones del torneo (PJ/PG/PE/PP/DG/Pts, ordenada) | `400` `torneoId` inválido |
| GET | `/:id/estadisticas` | cualquier autenticado | — | `200` estadísticas de ese equipo en particular | `404` |
| GET | `/:id` | cualquier autenticado | — | `200` equipo con plantel (incluye `suspendido: boolean` por jugador) y participaciones | `404` |
| POST | `/` | JWT: quien crea el equipo queda como capitán inicial (si no es admin) | `{ nombreEquipo, colorPrimario, colorSecundario?, categoria, descripcion? }` | `201` | `409` ya existe un equipo con ese nombre en esa categoría · `400` ya pertenecés a un equipo · `409` el jugador no cumple género/edad de la categoría elegida (`validarJugadorParaCategoria`, ver `shared/categorias.ts`) |
| PUT / PATCH | `/:id` | JWT: capitán de este equipo, o admin (`req.user.rol === 'admin'`) | subconjunto de campos de equipo | `200` | `404` · `403` no es capitán de este equipo |
| POST | `/:id/escudo` | igual que `update` (capitán o admin) | `multipart/form-data`, campo `escudo` (solo `.jpg`, máx. 2 MB) | `200` `escudoUrl` actualizada | `404` · `403` · `400` falta el archivo |
| DELETE | `/:id` | JWT: capitán de este equipo, o admin | — | `204` | `404` · `403` no es capitán de este equipo |

**Nota**: los 5 endpoints de este grupo siguen el patrón JWT-driven con bypass de rol (`req.user?.rol !== 'admin'` primero, y recién ahí resuelve el capitán vía `req.user?.id`). `POST /` ya no acepta un `idJugador` en el body — el capitán inicial se resuelve siempre por `req.user?.id`; si quien crea el equipo es un admin, no se asigna ningún capitán automáticamente (corregido en la sesión de ownership, ver `decisiones.md`). **Actualizado**: `add()` ahora corre dentro de `em.transactional` (evita un `Equipo` huérfano si falla una validación posterior a la creación) y valida que el nombre del equipo no esté repetido dentro de la misma categoría, y que el género/edad del jugador que lo crea sea compatible con la categoría elegida (mismas reglas que usa `validarJugadorParaCategoria` para `sin-equipo`/`por-admin`, ver `shared/categorias.ts`).

## Torneos — `/api/torneo`

(Nota de nombre: este es el único router de recurso que está montado en singular — `/torneo`, no `/torneos` — mientras que el resto de recursos plurales usa plural. Inconsistencia menor de convención, ver `pendientes.md`.)

| Método | Ruta | Auth | Body | Éxito | Errores principales |
|---|---|---|---|---|---|
| GET | `/` | cualquier autenticado | — | `200` todos los torneos con admin/partidos/participaciones | — |
| GET | `/:id` | cualquier autenticado | — | `200` | `404` |
| POST | `/` | JWT: rol `admin` (el torneo queda a nombre de `req.user.id`, no del `adminTorneo` que mande el body) | `{ nombreTorneo, fechaInicio, fechaFin, estado, formato?, cantidadEquipos?, categoria? }` | `201` | `403` no es admin · `400` categoría/estado inválido |
| PUT / PATCH | `/:id` | JWT: admin dueño de este torneo | subconjunto de campos | `200` | `404` · `403` no sos admin / no sos el dueño |
| DELETE | `/:id` | JWT: admin dueño de este torneo | — | `204` | `404` · `403` |
| GET | `/:id/arbitros` | cualquier autenticado | — | `200` lista de `Arbitro` asignados | — |
| PUT | `/:id/arbitros` | JWT: admin dueño de este torneo | `{ arbitroIds: number[] }` | `200` reemplaza el set completo | `404` torneo · `403` |
| GET | `/:id/canchas` | cualquier autenticado | — | `200` lista de `Cancha` asignadas | — |
| PUT | `/:id/canchas` | JWT: admin dueño de este torneo | `{ canchaIds: number[] }` | `200` reemplaza el set completo, mínimo `MIN_CANCHAS_TORNEO` (3) o 0, reasigna automáticamente los partidos `programado` que tenían una cancha removida | `404` torneo · `403` · `400` menos de 3 y más de 0 · `400` vaciar el set con partidos `programado` pendientes |
| POST | `/:id/generar-fixture` | JWT: admin dueño de este torneo | `{ fechaBase, horaBase, diasEntreJornadas? }` (default 7) | `201` `{ totalPartidos, totalJornadas }`, y el torneo pasa a `estado: 'en_curso'` | `404` · `403` · `400` menos de 2 equipos inscriptos · `409` ya tiene fixture · `400` faltan `fechaBase`/`horaBase` · `400` menos de 3 árbitros/canchas asignados |
| POST | `/:id/fecha-fin/preview` | JWT: admin dueño de este torneo | `{ fechaFin }` | `200` `{ conflictos: ConflictoFecha[] }` — no muta nada, solo simula | `400` torneo no está `en_curso` · `400` fecha inválida |
| PATCH | `/:id/fecha-fin` | JWT: admin dueño de este torneo | `{ fechaFin, confirmarCascada? }` | `200` aplica la nueva fecha | `400` no está `en_curso` · `400` duración menor a la mínima (Regla 3) · `409` hay conflictos y falta `confirmarCascada: true` |

**Nota**: los endpoints que modifican datos (`add`, `update`, `remove`, `setArbitros`, `setCanchas`, `generarFixture`, `previewFechaFin`, `extenderFechaFin`) verifican que quien llama sea el `AdminTorneo` dueño de ese torneo puntual (`torneo.adminTorneo?.id === req.user?.id`, con un rol `admin` exigido de entrada) — corregido en la sesión de ownership junto con el resto de los huecos de este tipo (ver `decisiones.md`). Los `GET` siguen abiertos a cualquier autenticado, igual que el resto de los recursos de lectura del proyecto.

**Regla del mínimo de árbitros/canchas**: `setArbitros`/`setCanchas` exigen que el set nuevo sea 0 (todavía sin asignar) o `>= 3`, nunca un valor intermedio. Si el set nuevo saca un árbitro/cancha que tenía partidos `programado` asignados, esos partidos se reasignan automáticamente al que menos carga tenga entre los que quedan (`elegirReemplazoMenosCargado`, función pura exportada y testeada), dentro de la misma transacción que actualiza el set. Vaciar el set del todo (`[]`) está bloqueado si todavía quedan partidos `programado` sin árbitro/cancha a quién asignarles.

## Partidos — `/api/partidos`

| Método | Ruta | Auth | Body | Éxito | Errores principales |
|---|---|---|---|---|---|
| GET | `/` | cualquier autenticado | — | `200` (con cancha poblada) | — |
| GET | `/programados` | cualquier autenticado | — | `200` partidos con `estado_partido: 'programado'`, ordenados por fecha, con equipos poblados | — |
| GET | `/torneo/:id` | cualquier autenticado | — | `200` (`[]` si no hay partidos) | `400` id inválido |
| GET | `/:id` | cualquier autenticado | — | `200` | `404` |
| POST | `/` | cualquier autenticado | `{ fecha_partido, hora_partido, estado_partido, jornada, goles_local?, goles_visitante?, torneo, cancha, arbitro, local, visitante }` | `201` | `400` faltan campos requeridos · `400` local = visitante |
| PATCH | `/:id/resultado` | JWT: admin dueño del torneo | `{ goles_local, goles_visitante, confirmarReedicion? }` | `200` marca `estado_partido: 'finalizado'` | `403` no es el dueño · `409` ya tiene resultado y falta `confirmarReedicion: true` · `400` goles no son enteros ≥ 0 |
| PATCH | `/:id/programacion` | JWT: admin dueño del torneo | `{ fecha_partido, hora_partido }` | `200` reprograma fecha/hora | `403` no es el dueño · `400` torneo no `en_curso` · `400` partido ya `finalizado` o ya jugado · `400` nueva fecha en el pasado · `409` árbitro o cancha ya ocupados en ese horario |
| PUT / PATCH | `/:id` | cualquier autenticado | subconjunto | `200` | `404` |
| DELETE | `/:id` | cualquier autenticado | — | `204` | `404` |

**Nota de seguridad — hallazgo pendiente**: a diferencia de `/:id/resultado` y `/:id/programacion` (bien protegidos, con ownership del torneo), el CRUD base (`POST /`, `PUT`/`PATCH /:id`, `DELETE /:id`) no tiene `requireRole` ni chequeo de dueño — cualquier usuario autenticado, incluso un jugador sin ningún vínculo con el partido, puede crear, editar o borrar cualquier partido de cualquier torneo. Ver `pendientes.md`.

## Canchas — `/api/canchas`

CRUD estándar.

| Método | Ruta | Auth | Body | Éxito | Errores principales |
|---|---|---|---|---|---|
| GET | `/` | cualquier autenticado | — | `200` | — |
| GET | `/:id` | cualquier autenticado | — | `200` (con partidos poblados) | `404` |
| POST | `/` | JWT: rol `admin` | `{ nombre, direccion, tipoSuperficie, capacidad, estado?, precioPorHora?, iluminacion? }` | `201` | `400` estado inválido |
| PUT / PATCH | `/:id` | JWT: rol `admin` | subconjunto | `200` | `404` |
| DELETE | `/:id` | JWT: rol `admin` | — | `200` | — |

## Árbitros — `/api/arbitros`

CRUD estándar, sin reglas de negocio propias.

| Método | Ruta | Auth | Body | Éxito | Errores principales |
|---|---|---|---|---|---|
| GET | `/` | cualquier autenticado | — | `200` | — |
| GET | `/:id` | cualquier autenticado | — | `200` | `404` |
| POST | `/` | JWT: rol `admin` | `{ nombre, apellido, nro_matricula, email }` | `201` | — |
| PUT / PATCH | `/:id` | JWT: rol `admin` | subconjunto | `200` | `404` |
| DELETE | `/:id` | JWT: rol `admin` | — | `200` | — |

## Administradores de torneo — `/api/adminTorneo`

| Método | Ruta | Auth | Body | Éxito | Errores principales |
|---|---|---|---|---|---|
| POST | `/login` | pública | `{ email, contraseña }` | `200` `{ token, admin }` (payload del token incluye `rol: 'admin'`) | `400` faltan campos · `401` credenciales inválidas |
| GET | `/` | cualquier autenticado | — | `200` (sin `contraseña`) | — |
| GET | `/:id` | cualquier autenticado | — | `200` | `404` |
| POST | `/` | JWT: rol `admin` | `{ nombre, apellido, email, contraseña, telefono }` | `201` | — |
| PUT / PATCH | `/:id` | JWT: rol `admin` | subconjunto | `200` | `404` |
| DELETE | `/:id` | JWT: rol `admin` | — | `200` | — |

`GET /adminTorneo/fix-passwords` (herramienta de migración de contraseñas en texto plano a bcrypt) se eliminó del proyecto — ver `decisiones.md` para por qué ya no hacía falta.

## Participaciones — `/api/participacion`

(Nombre en singular, igual que `/torneo` — ver nota de convención arriba.)

| Método | Ruta | Auth | Body | Éxito | Errores principales |
|---|---|---|---|---|---|
| GET | `/` | cualquier autenticado | — | `200` (equipo/torneo poblados) | — |
| GET | `/:id` | cualquier autenticado | — | `200` | `404` |
| POST | `/` | JWT: rol `admin` | `{ equipo, torneo, fecha_inscripcion }` | `201` | `404` equipo/torneo · `400` categoría no coincide · `409` equipo ya en un torneo `en_curso` |
| PUT / PATCH | `/:id` | JWT: rol `admin` (sin verificar que sea el admin dueño de *ese* torneo puntual — ver nota abajo) | subconjunto | `200` | — |
| DELETE | `/:id` | JWT: rol `admin` (mismo hueco que arriba) | — | `200` | — |

**Nota de seguridad — hallazgo pendiente**: `update`/`remove` exigen rol `admin` genérico pero no verifican que sea el admin dueño del torneo de esa participación puntual (a diferencia de `torneo.controler.ts`, que sí usa `verificarAdminDueño` en todas sus escrituras) — cualquier `AdminTorneo` puede editar/borrar la inscripción de un equipo en el torneo de otro admin. Ver `pendientes.md`.

## Invitaciones — `/api/invitaciones`

| Método | Ruta | Auth | Body | Éxito | Errores principales |
|---|---|---|---|---|---|
| GET | `/jugador/:idJugador` | cualquier autenticado (**no verifica que `:idJugador` sea el usuario logueado**) | query opcional `?estado=` | `200` invitaciones de ese jugador | `400` id/estado inválido |
| GET | `/equipo/:idEquipo` | cualquier autenticado (**no verifica ser capitán de ese equipo**) | query opcional `?estado=a,b&vistaPorCapitan=` | `200` invitaciones recibidas por ese equipo | `400` |
| POST | `/` | JWT: capitán de un equipo | `{ idJugador }` | `201` | `403` no es capitán · `404` jugador · `400` ya tiene equipo / plantel lleno (26) · `409` ya existe invitación pendiente |
| PUT | `/:id` | JWT: el jugador invitado | `{ estado: 'aceptada' \| 'rechazada' }` | `200` | `403` no es el invitado · `400` ya respondida / ya tiene equipo / plantel lleno |
| PATCH | `/:id/vista` | JWT: el capitán que envió la invitación | — | `200` | `404` · `403` no es quien la envió |

**Nota**: `add`, `responder` y `marcarVista` sí son JWT-driven. `findByJugador`/`findByEquipo` (los dos `GET`) no verifican nada más allá de "estás logueado" — cualquier jugador autenticado puede consultar las invitaciones de cualquier otro jugador o equipo con solo cambiar el id en la URL. Ver `pendientes.md`.

## Notificaciones — `/api/notificaciones`

Router que existía en el código (`notificacion.routes.ts`) pero **no estaba montado** en `routes.ts` — era inalcanzable por HTTP hasta esta sesión de trabajo. Se generalizó de paso (antes solo devolvía no leídas, filtrando por un `idJugador` de la URL) — ver `decisiones.md` y `glosario.md` para la historia completa.

| Método | Ruta | Auth | Body | Éxito | Errores principales |
|---|---|---|---|---|---|
| GET | `/` | JWT: el jugador autenticado | — | `200` todas las notificaciones (cualquier `tipo`, leídas y no leídas) de `req.user.id`, ordenadas por fecha descendente | — |
| PATCH | `/:id/leida` | JWT: dueño de la notificación | — | `200` | `400` id inválido · `404` no encontrada · `403` no es el dueño |

## Formaciones — `/api/formaciones`

Sin `:equipoId` en ninguna ruta a propósito: el equipo siempre se resuelve a partir del jugador autenticado, nunca de un parámetro (ver `glosario.md`).

| Método | Ruta | Auth | Body | Éxito | Errores principales |
|---|---|---|---|---|---|
| GET | `/` | JWT: cualquier jugador con equipo | — | `200` `{ equipoId, esquema, notas, fecha, titulares: [{jugadorId,nombre,apellido,categoria,orden}], suplentes: [{jugadorId,nombre,apellido,posicion}] }`, o `data: null` si el equipo no tiene formación configurada | `403` sin equipo |
| PUT | `/` | JWT: capitán del equipo | `{ esquema: '4-3-3'\|'4-4-2'\|'4-2-3-1'\|'5-3-2', titulares: number[] (11 ids), notas?: string }` | `200` `{ equipoId, esquema, notas }` — además crea una `Notificacion` (`tipo: 'formacion_actualizada'`) para **todo el plantel**, con mensaje distinto si cada jugador quedó titular o suplente | `403` no-capitán · `400` plantel < 11 · `400` esquema inválido · `400` cantidad de titulares ≠ 11 o duplicados · `400` un titular no pertenece al equipo · `400` cupos por categoría no cumplidos |

## Suspensiones — `/api/suspensiones`

*Agregado en la sesión de gestión de sanciones desde el panel admin.* Crear (`suspender`) y levantar (`habilitar`) una suspensión sigue viviendo en `/api/jugadores/:id/suspender`/`/:id/habilitar` (ver sección Jugadores) — este router es solo para **gestionar** las suspensiones ya creadas.

| Método | Ruta | Auth | Body | Éxito | Errores principales |
|---|---|---|---|---|---|
| GET | `/` | JWT: rol `admin` | query opcional `?activa=true\|false&jugador=texto` (busca en nombre+apellido) | `200` suspensiones de los torneos del admin logueado, ordenadas por fecha descendente (`[]` si no organiza ningún torneo) | — |
| DELETE | `/:id` | JWT: admin dueño del torneo de la suspensión | — | `200` borrado definitivo | `400` id inválido · `404` no encontrada · `403` no es el dueño |
