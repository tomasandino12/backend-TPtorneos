# Documentación — Backend Gestor de Torneos

Punto de entrada a toda la documentación del backend. Ver también la documentación del [frontend](https://github.com/tomasandino12/frontend-TPtorneos/blob/master/docs/README.md), en su propio repositorio.

## Índice

- **[`backend/README.md`](./backend/README.md)** — arquitectura completa: stack, capas, entidades y cómo se conecta con el frontend. Punto de partida recomendado para entender el código.
- [`bitacora-avance.md`](./bitacora-avance.md) — registro de avance del proyecto por hitos, reconstruido a partir del historial real de commits de los dos repositorios.
- [`backend/entidades.md`](./backend/entidades.md) — cada entidad del dominio, sus campos reales y sus relaciones.
- [`backend/endpoints.md`](./backend/endpoints.md) — recorrido por cada grupo de rutas: método, autenticación requerida, body, respuesta y errores.
- [`backend/glosario.md`](./backend/glosario.md) — conceptos técnicos no triviales del proyecto (MikroORM, JWT, transacciones, `syncSchema`), explicados con ejemplos reales de este código.
- [`backend/decisiones.md`](./backend/decisiones.md) — por qué se tomó cada decisión de arquitectura relevante.
- [`backend/pendientes.md`](./backend/pendientes.md) — lo que queda frágil o sin resolver, con el motivo concreto.
- [`backend/bitacora.md`](./backend/bitacora.md) — notas informales de los primeros días de desarrollo (aprendizaje de MikroORM).

## Instalación y ejecución

Ver [`README.md`](../README.md) en la raíz del repositorio.

## Deploy

Backend en Render, base de datos en Aiven. Frontend: [frontend-gestortorneos.vercel.app](https://frontend-gestortorneos.vercel.app/).

Credenciales de prueba (admin y jugador), ver [`README.md`](../README.md#credenciales-de-prueba) en la raíz del repositorio.
