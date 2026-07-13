# Bitácora de decisiones

Resumen de **por qué** se decidió cada cosa en el backend, no de **qué** se hizo técnicamente (eso está en `entidades.md` y `endpoints.md`). Ordenado por feature/sesión de trabajo, no cronológicamente al detalle.

## Identificar al actor por JWT, nunca por un parámetro de URL

Se estableció como criterio a partir de `PATCH /jugadores/:id/expulsar`: el reemplazo seguro de "sacar a alguien de un equipo", que antes solo se podía hacer con `PUT /jugadores/:id` mandando `equipo: null` — sin ninguna validación de que quien llamaba fuera capitán de ese equipo, sin motivo, sin notificación.

La decisión concreta fue que el capitán que ejecuta la acción se identifica **siempre** leyendo `req.user?.id` (puesto por el middleware de JWT), nunca confiando en un dato que manda el cliente. La razón: si el backend confiara en, por ejemplo, un `capitanId` en el body, cualquiera podría mandar ese request a mano con un id ajeno y hacerse pasar por otro capitán.

Al construir `GET`/`PUT /formaciones` después, se llevó el mismo criterio un paso más allá: **directamente no se agregó un parámetro `equipoId`** a esas rutas (aunque la especificación original lo sugería como `/equipos/:equipoId/jugadores/:jugadorId/expulsar` para el primer caso, y algo similar para formaciones). En los dos casos, el equipo relevante se resuelve completo a partir del jugador autenticado — no porque un chequeo en tiempo de ejecución lo bloquee, sino porque la ruta de ataque ("mandar el equipo de otro") no existe como posibilidad: no hay ningún campo para intentarlo. Es una garantía estructural en vez de una validación, ver `glosario.md` para el detalle técnico completo con los ejemplos (`expulsar`, `formaciones`, y `transferirCapitania`, que en su momento no seguía este patrón — ver más abajo la sesión que cerró ese hueco junto con otros cinco).

## Auditoría y cierre de huecos de ownership (`/torneo`, `fix-passwords`, `transferirCapitania`, `update`/`remove` de jugador y equipo)

`docs/backend/pendientes.md`, escrito leyendo el código real, había señalado varios endpoints que no seguían el patrón de arriba. Se priorizó por severidad y se auditó cada uno contra el código real antes de tocar nada (no se asumió que todos tenían el mismo hueco):

- **`/torneo` (alta prioridad)**: ningún endpoint de escritura (`add`, `update`, `remove`, `setArbitros`, `setCanchas`, `generarFixture`) verificaba que el `AdminTorneo` autenticado fuera el dueño del torneo — de hecho `add` ni siquiera forzaba que el torneo quedara a nombre de quien lo creaba, tomaba `adminTorneo` del body. Se agregó un helper compartido (`verificarAdminDueño`) que exige `req.user?.rol === 'admin'` y `torneo.adminTorneo?.id === req.user?.id`, reusado en las 5 funciones de escritura; `add` ahora fuerza `adminTorneo: req.user.id` ignorando lo que venga en el body. Se decidió no tocar los `GET` (`findAll`, `findOne`, `getArbitros`, `getCanchas`) — la lectura de torneos ajenos no es un problema de autorización en este dominio (es información pública dentro de la app, igual que `GET /equipos/:id` de cualquier equipo), solo la escritura lo es.
- **`fix-passwords` (alta prioridad)**: antes de decidir cómo protegerlo, se investigó si todavía hacía falta — se consultó la base real y los 3 `AdminTorneo` existentes ya tenían contraseña hasheada, y `add()` de `AdminTorneo` hashea toda contraseña nueva desde el alta. No quedaba ningún caso pendiente de migrar. Se decidió **eliminar el endpoint por completo** (ruta, función, y su entrada en `PUBLIC_PATHS`) en vez de protegerlo y convertirlo a `POST` — no tenía sentido mantener viva una herramienta de migración de uso único que ya cumplió su propósito.
- **`transferirCapitania`**: tenía un hueco real (confirmado, no asumido) — no comparaba `:id` contra `req.user?.id`. Se agregó ese chequeo como primera validación, antes incluso de comprobar que `:id` sea capitán.
- **`update`/`remove` de jugador**: tenían un hueco real — cualquier autenticado podía editar/borrar el perfil de cualquier otro jugador. Se agregó `req.user?.id === id` a ambas. Se decidió no agregar un bypass de admin (como sí tiene `equipo.controler.ts`) porque no se encontró ningún flujo existente donde un admin necesite editar el perfil de un jugador.
- **`add`/`remove` de equipo**: `add` tenía un hueco real (`idJugador` del body, sin cruzar contra `req.user?.id`, para asignar el capitán inicial) — se eliminó `idJugador` del body por completo y ahora se usa siempre `req.user?.id`; si quien crea el equipo es un admin, no se asigna capitán (mismo comportamiento que ya tenía el código cuando el `idJugador` no correspondía a ningún jugador real). `remove` no tenía ningún chequeo — se le agregó exactamente el mismo patrón que ya usaban `update`/`uploadEscudo` en el mismo archivo (capitán del equipo o admin).

Los 20 casos (6 correcciones × positivo/negativo, más algunos casos adicionales) se probaron en vivo contra la base real antes de dar la tarea por cerrada — incluyendo el caso de que transferir la capitanía a un tercero deja a ese tercero, y no al capitán original, con el poder de borrar el equipo (verificado explícitamente, no asumido).

## Diseño de `/formaciones`: una por equipo, sin `equipoId`, categoría derivada de `posicion`

Tres decisiones de diseño tomadas juntas al construir la persistencia de la alineación de un equipo:

- **Una `Formacion` por equipo, no una por partido**: se actualiza (`PUT`) en vez de crearse de nuevo cada vez, con `@Unique` sobre la relación a `Equipo` para que sea imposible tener dos formaciones activas para el mismo equipo a nivel de base de datos, no solo por convención de código.
- **`categoria` de cada titular se deriva de `Jugador.posicion`, no la manda el frontend en el body**: si el frontend pudiera declarar la categoría de un jugador de forma independiente de su posición real, un capitán podría mandar a un delantero como si fuera arquero para completar artificialmente los cupos de una formación que en la realidad no cumple.
- **Los suplentes no se persisten** — se calculan al leer (`plantel completo del equipo` menos los `titulares` de la `Formacion`), porque son información 100% derivada: guardarlos por separado sería duplicar datos que ya se pueden calcular, con el riesgo de que se desincronicen si alguien edita el plantel sin actualizar la formación.

## Generalización del sistema de notificaciones

Al construir la notificación de "formación actualizada" (que tiene que avisarle a los 11+ jugadores del plantel completo, no a uno solo), se investigó si ya existía algo reusable — el proyecto ya tenía notificaciones de suspensión/habilitación. Se encontró la entidad `Notificacion` y un `notificacion.controler.ts`/`notificacion.routes.ts` completos, pero **el router nunca estaba montado en `routes.ts`**: existía código, compilaba, pero era inalcanzable por HTTP. Ver `glosario.md` para el detalle completo de ese hallazgo.

Se decidió no reescribir el sistema desde cero, sino:
1. Montar el router faltante (`apiRouter.use('/notificaciones', notificacionRouter)`).
2. Generalizar el endpoint de lectura, que antes tomaba un `idJugador` de la URL (sin validar que fuera el usuario logueado) y solo devolvía notificaciones no leídas — ahora usa `req.user.id` (mismo criterio JWT-driven de arriba) y devuelve todas, de cualquier `tipo`, con su estado `leida`.
3. Agregarle a `PATCH /:id/leida` una verificación de dueño que no tenía (cualquiera podía marcar como leída la notificación de cualquier otro con solo cambiar el id).
4. Reusar exactamente el mismo patrón de creación (`em.create(Notificacion, {...})`) para el tipo nuevo `formacion_actualizada`, en vez de inventar una tabla o mecanismo paralelo.

## El bug de `Formacion.notas` (`varchar(255)` por default) y por qué no se copió el "precedente" de `descripcion`

Al reportarse el error `Data too long for column 'notas'` guardando una nota de estrategia real (~400 caracteres), la corrección propuesta originalmente sugería "revisar cómo maneja texto largo `Equipo.descripcion`, que ya resuelve esto, y replicar ese criterio". Investigando el código (y la base real, no solo la entidad) se encontró que **`Equipo.descripcion` y `Jugador.descripcion` tienen exactamente el mismo problema** — son `varchar(255)` porque tampoco especifican un `type` en su `@Property()`. No era un precedente a seguir: era el mismo bug, en otro lado, todavía sin descubrir.

La corrección real fue declarar el tipo explícitamente en la entidad:

```ts
@Property({ type: 'text', nullable: true })
notas?: string;
```

que le pide a MikroORM una columna `TEXT` de MySQL (hasta 65.535 caracteres) en vez de dejar que caiga en el default de `varchar(255)`. No se agregó ningún límite artificial de longitud en el backend — la especificación pedía explícitamente no inventar un tope si el proyecto no tenía ya un criterio para eso, y no lo tenía. Queda documentado en `pendientes.md` que `descripcion` en `Equipo`/`Jugador` sigue con el mismo problema sin corregir, porque estaba fuera del alcance de esa tarea puntual (que era específicamente sobre `Formacion.notas`).

## Migración progresiva de contraseñas de `AdminTorneo` (texto plano → bcrypt)

`AdminTorneo.login()` no asume que toda contraseña guardada ya está hasheada — detecta el prefijo `$2` (característico de bcrypt) y, si no lo tiene, compara en texto plano y recién ahí la hashea, guardándola hasheada para la próxima vez. Es una decisión de migración incremental: en vez de correr un script que rehashee todas las contraseñas viejas de una sola vez (lo cual además sería imposible sin conocerlas en texto plano, si ya estuvieran parcialmente hasheadas de forma inconsistente), cada cuenta se "auto-migra" la próxima vez que su dueño hace login. El endpoint `GET /adminTorneo/fix-passwords` cubre el caso de las cuentas que nunca vuelven a loguearse — pero quedó como una ruta pública que modifica datos con un verbo `GET`, un problema de diseño documentado en `pendientes.md`, no resuelto porque excedía el alcance de las tareas donde se detectó.

## `em.transactional` + `throw Object.assign(new Error(...), { status })` como patrón estándar para operaciones de varios pasos

Cuando una operación necesita varias validaciones intercaladas con lecturas/escrituras a la base, y tiene que ser todo-o-nada (por ejemplo, `PUT /formaciones`: validar capitán, contar plantel, validar cupos, borrar titulares viejos, crear los nuevos, notificar a todos), el patrón que se estableció (arrancando en `transferirCapitania`, confirmado y reusado en `expulsar`, `responder` de invitaciones, y `guardar` de formaciones) es: envolver todo en `em.transactional(async (txEm) => {...})`, señalar cada validación fallida lanzando `Object.assign(new Error(mensaje), { status: codigoHttp })` en vez de responder directamente, y capturar eso en un único `catch` externo que arma la respuesta HTTP real (`res.status(e.status ?? 500).json({ message: e.message })`). Se prefirió este patrón, ya presente en el código antes de estas sesiones, en vez de inventar uno nuevo — mantiene la lógica de negocio (los `throw`) separada de la traducción a HTTP (el `catch`), sin necesitar una capa de manejo de errores más elaborada (ej. un middleware de errores de Express) que el resto del proyecto no usa.
