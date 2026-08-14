# Bitácora de avance del proyecto

El equipo no llevó minutas de reuniones sincrónicas por escrito — el trabajo se coordinó mayormente de forma asincrónica, cada integrante avanzando sobre su parte y sincronizando por PR/pull. En vez de inventar reuniones que no existieron, este documento reconstruye el avance real del proyecto a partir del historial de commits de los dos repositorios (`backend-TPtorneos` y `frontend-TPtorneos`), agrupado por hitos. Es el mismo criterio que ya usa `docs/backend/decisiones.md` para las decisiones técnicas: solo lo que se puede verificar leyendo el repo, sin reconstrucciones que no estén respaldadas por un commit real.

Para lo que queda pendiente o abierto hoy — el "tracking" del estado actual — ver [`docs/backend/pendientes.md`](./backend/pendientes.md) y el equivalente del frontend, [`docs/frontend/pendientes.md`](https://github.com/tomasandino12/frontend-TPtorneos/blob/master/docs/frontend/pendientes.md); ambos se mantienen actualizados a medida que se resuelven o aparecen hallazgos nuevos.

## Hito 1 — Exploración inicial (abr–jun 2025)

Primeras páginas del frontend en HTML/CSS plano (index, fixture, inicio de sesión), sin framework todavía. En paralelo, primer CRUD de Jugador en el backend siguiendo los videos de la cátedra, con separación por capas (MVC).

## Hito 2 — Migración a React y adopción de MikroORM (jul–ago 2025)

El frontend pasa de HTML estático a React (`cambio total de estructura a react`, 04/09). El backend adopta MikroORM como ORM (antes se venía trabajando con SQL directo siguiendo los videos de la cátedra) y arma el CRUD de Canchas y Partidos como primera prueba de las relaciones 1..n del ORM.

## Hito 3 — CRUDs completos e integración inicial (sep–oct 2025)

Se completan los CRUD de las 7 entidades de negocio (Jugador, Cancha, Árbitro, Equipo, Torneo, Partido, AdminTorneo/Participación) en el backend. Login con JWT funcionando de punta a punta, contraseñas encriptadas con bcrypt. El frontend conecta el fixture al backend (con el atributo `jornada` recién agregado), arma el listado de "jugadores sin equipo" para el flujo de invitación de capitanes, y suma manejo de errores visible en varias pantallas (tabla de posiciones, estadísticas, registro).

## Hito 4 — Panel de administrador (mar–may 2026)

Arranca el segundo cuatrimestre. Se construye el panel de administrador: menú, listado y creación de torneos, conectado al backend. Del lado del backend, una auditoría de seguridad revisa validaciones, manejo de JWT y contraseñas.

## Hito 5 — Perfil, equipos, notificaciones y calidad (jul 2026)

Tanda grande de features sobre el negocio: descripción de jugador/equipo, escudo de equipo, recuperación de contraseña por mail, invitaciones y transferencia de capitanía, notificaciones, formaciones/convocatoria, login con Google. En paralelo arranca el trabajo de calidad: primera tanda de tests automatizados, mobile-first + guía de estilos Airbnb + modelos tipados en el frontend, y soporte de conexión a MySQL en la nube en el backend (preparación para el deploy en Render).

## Hito 6 — Reglas de negocio del torneo, mobile y cierre (ago 2026)

Últimos ajustes antes de la entrega: corrección del generador de fixture, mínimo de 3 árbitros/canchas por torneo con reasignación automática al remover uno, restricciones y reprogramación en la carga de resultados. El frontend suma el filtro por jornada y un rediseño mobile completo (navegación, notificaciones, tablas, autenticación), integrado vía pull request.

## Participación por integrante (según autoría de commits)

| | Backend | Frontend |
|---|---|---|
| Tomás Andino | 32 commits | 47 commits |
| Geronimo Negri Cacurri | 33 commits | 55 commits |
| Mateo Burgos | 9 commits | 6 commits |

El conteo de commits no captura el tamaño ni la complejidad de cada aporte por igual — se deja como dato bruto, no como medida de esfuerzo.
