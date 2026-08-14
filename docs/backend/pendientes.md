# Pendientes

Lo que quedó frágil, incompleto o inconsistente, encontrado leyendo el código real de punta a punta — no una lista de "cosas que estaría lindo agregar", sino puntos concretos que alguien que trabaje sobre este backend debería conocer.

## Resueltos en la sesión de "cierre de huecos de ownership"

Los siguientes 6 ítems estaban documentados acá y se corrigieron en una sesión dedicada específicamente a auditar el patrón "identificar al actor por JWT, nunca por un parámetro de URL/body" (ver `glosario.md`) contra todos los endpoints que lo tenían pendiente:

- **`transferirCapitania` no verificaba que `:id` fuera el usuario logueado** — ahora exige `saliente.id === req.user?.id` antes de cualquier otra validación.
- **`PUT`/`PATCH /jugadores/:id` y `DELETE /jugadores/:id` sin verificación de dueño** — ambas ahora exigen `req.user?.id === id`; un jugador solo puede editar o borrar su propio perfil.
- **`POST /equipos` confiaba en `idJugador` del body** para asignar el capitán inicial — ahora se resuelve siempre por `req.user?.id` (el campo `idJugador` se eliminó del body); si quien crea el equipo es un admin, no se asigna ningún capitán automáticamente.
- **`DELETE /equipos/:id` sin restricción** — ahora exige ser capitán del equipo o admin, mismo chequeo que ya usaban `update`/`uploadEscudo` en el mismo archivo.
- **Ningún endpoint de `/torneo` validaba dueño** — `add` ahora fuerza `adminTorneo = req.user.id` (ignora cualquier valor que mande el body) y exige `rol === 'admin'`; `update`, `remove`, `setArbitros`, `setCanchas` y `generarFixture` ahora verifican que el admin autenticado sea efectivamente el dueño de ese torneo puntual (`torneo.adminTorneo?.id === req.user?.id`), con un helper compartido (`verificarAdminDueño`) para no repetir el chequeo 5 veces.
- **`GET /adminTorneo/fix-passwords` era una ruta pública que mutaba datos** — se eliminó por completo (ruta, controlador, y su entrada en `PUBLIC_PATHS`), en vez de protegerla: se confirmó contra la base real que los 3 `AdminTorneo` existentes ya tienen contraseña hasheada y que `add()` hashea toda contraseña nueva desde el alta, así que no queda ningún caso que la necesite.

Los 20 casos de esta corrección (positivos y negativos) se probaron en vivo contra la base real, no solo se asumieron.

## 1. `Equipo.descripcion` y `Jugador.descripcion` siguen en `varchar(255)`

**Dónde**: `src/equipo/equipo.entity.ts` y `src/jugador/jugador.entity.ts`, campo `descripcion?: string` en ambas, sin `type` especificado en el `@Property()`.

**Por qué queda pendiente**: es el mismo bug que se corrigió en `Formacion.notas` (ver `decisiones.md`) — MikroORM, sin un `type` explícito, genera `varchar(255)` por default. Se descubrió al investigar ese bug puntual, pero corregirlo acá quedó fuera de alcance porque la tarea era específicamente sobre `Formacion.notas`. Si algún flujo llega a necesitar una descripción de equipo o de jugador más larga que 255 caracteres, va a fallar exactamente igual (`Data too long for column`).

## 2. `GET /invitaciones/jugador/:idJugador` y `GET /invitaciones/equipo/:idEquipo` sin verificación de dueño

**Dónde**: funciones `findByJugador`/`findByEquipo` en `invitacion.controler.ts`.

**Por qué es frágil**: a diferencia de `add`/`responder`/`marcarVista` del mismo archivo (que sí son JWT-driven), estos dos `GET` confían en el id de la URL sin cruzarlo contra `req.user?.id` — cualquier jugador autenticado puede ver las invitaciones de cualquier otro jugador o equipo. No se corrigió en la sesión de ownership porque el alcance de esa tarea estaba acotado a `/torneo`, `fix-passwords`, `transferirCapitania`, y `update`/`remove` de jugador/equipo — este par de endpoints no estaba en esa lista.

## 3. `Jugador.posicion` no tiene validación server-side de valores permitidos

**Dónde**: `jugador.entity.ts` (`posicion!: string`, texto libre) y `jugador.controler.ts` (`add`/`update` no restringen su valor).

**Por qué es frágil**: `POST`/`PUT /formaciones` depende de que `posicion` sea exactamente uno de `'Arquero'`, `'Defensor'`, `'Mediocampista'`, `'Delantero'` (comparación case-insensitive, ver `categoriaDeJugador` en `formacion.controler.ts`) para poder ubicar a cada jugador en una categoría. Si un jugador se crea o edita con `posicion: "Portero"` o con un typo, `PUT /formaciones` lo va a rechazar con `"tiene una posición no reconocida"` recién en el momento de armar la formación — no antes, al cargar el jugador. Sería más claro para quien carga jugadores que la validación de los 4 valores válidos exista también en `sanitizeJugadorInput`/`update`, no solo en el consumidor final.

## 4. Inconsistencias menores de convención de nombres

**Dónde**: varios archivos.

- **Rutas en singular vs. plural**: la mayoría de los recursos se monta en plural (`/jugadores`, `/equipos`, `/canchas`, `/arbitros`, `/invitaciones`, `/notificaciones`, `/formaciones`), pero `/torneo` y `/participacion` están en singular — ver `src/routes.ts`.
- **`snake_case` mezclado con `camelCase`** en la misma entidad: `Participacion.fecha_inscripcion` (el resto de sus campos son `camelCase`), `Partido.fecha_partido`/`hora_partido`/`estado_partido`/`goles_local`/`goles_visitante`, `Arbitro.nro_matricula`. El resto de las entidades del proyecto (`Jugador`, `Equipo`, `Torneo`, `Formacion`, etc.) usa `camelCase` de forma consistente.

**Por qué queda pendiente**: ninguna de las dos cosas rompe funcionalidad — son inconsistencias de estilo que alguien nuevo en el proyecto nota al leer varios módulos seguidos, y que unificar implicaría tocar rutas/columnas ya en uso (con el costo de coordinar el cambio con el frontend), no un ajuste de una línea.

## 5. ~~No hay tests automatizados~~ — resuelto

**Actualizado**: ya no es así. Hoy hay 8 archivos `*.test.ts` con 30 casos (`it`) en total — 3 unitarios puros (middlewares de sanitización y funciones puras como `generarRondas`/`elegirReemplazoMenosCargado`) y 5 de integración real, con Supertest contra la `app` de Express y una base de datos de test separada (`gestordetorneos_test`, configurada en `.env.test`). Corren con `pnpm test`. Se deja el ítem tachado en vez de borrarlo para que quede visible que la afirmación original ya no aplica.

## 6. ~~Credenciales de base de datos hardcodeadas en `orm.ts`~~ — resuelto

**Actualizado**: ya no es así. `src/shared/db/orm.ts` lee `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`/`DB_SSL` de `process.env`, con fallback a los valores de desarrollo local (`dsw`/`dsw`/`localhost:3306`/`gestordetorneos`) solo si esas variables no están seteadas — agregado para poder conectar a una base en la nube (Aiven, que exige `DB_SSL=true`) sin tocar código. Se deja el ítem tachado por el mismo motivo que el de arriba.

## 7. `JWT_SECRET` tiene un valor de reserva hardcodeado en el código

**Dónde**: se repite literalmente en cada lugar que firma o verifica un token — `auth.middleware.ts`, `jugador.controler.ts` (login, registro), `adminTorneo.controler.ts` (login) — todos con `process.env.JWT_SECRET || 'clave-segura-del-gestor-torneos-2024'`.

**Por qué queda pendiente**: si `.env` no está configurado, el proyecto arranca igual y funciona (conveniente para una entrega académica sin fricción de setup), pero firma y verifica todos los tokens con una clave conocida y pública (está en el propio código fuente del repo). Cualquiera que lea el código podría fabricar un JWT válido para cualquier usuario sin necesitar la base ni ninguna contraseña, si el proyecto llegara a correr en algún entorno sin `JWT_SECRET` seteada de verdad.

## 8. ~~CRUD de `Partido` sin protección de rol~~ — resuelto

**Actualizado (14/08)**: `POST /`, `PUT`/`PATCH /:id` y `DELETE /:id` de `src/partido/partido.routes.ts` ahora exigen `requireRole('admin')` en la ruta, más el mismo chequeo de ownership que ya usaban `actualizarResultado`/`actualizarProgramacion` (admin dueño del torneo del partido) directo en el controlador. Cubierto por `src/partido/partido.autorizacion.integration.test.ts` (rechaza jugador, rechaza admin de otro torneo, permite al dueño). Se deja el ítem tachado por el mismo motivo que los de arriba.

## 9. `participacion.controler.ts` sin ownership por torneo

**Dónde**: `update`/`remove` en `src/participacion/participacion.controler.ts`, montadas con `requireRole('admin')` en `participacion.routes.ts`.

**Por qué es frágil**: exigen rol `admin` genérico pero no verifican que sea el admin dueño del torneo de esa participación puntual — cualquier `AdminTorneo` puede editar o borrar la inscripción de un equipo en el torneo de otro admin. Mismo patrón que ya resuelve `torneo.controler.ts` con `verificarAdminDueño`, todavía no aplicado acá.

## 10. `POST /jugadores` no valida género ni categoría al asignar equipo en el alta

**Dónde**: `add()` en `src/jugador/jugador.controler.ts` (líneas ~194-243).

**Por qué es frágil**: cuando el body trae `equipo` seteado, `add()` sí valida cupo máximo de plantel y capitán único, pero a diferencia de los otros 3 lugares que tocan esta misma regla (`register()`, `update()` de jugador, y `responder()` de invitación), **no** valida `genero` contra `GENEROS_VALIDOS` ni corre `validarJugadorParaCategoria` (`shared/categorias.ts`) contra la categoría del equipo. Se puede dar de alta un jugador con género inválido o ausente y asignarlo directo a un equipo de una categoría que no le corresponde por género/edad, salteando una regla que en el resto del sistema se respeta de forma consistente. Encontrado en la auditoría del 13/08 al pull que agregó `genero`/`shared/categorias.ts` — no es un bug introducido a propósito, es un lugar que quedó afuera cuando se agregó la regla en los demás.
