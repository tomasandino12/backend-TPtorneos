# Evidencia de ejecución de tests — Backend

Salida real de `pnpm test` (Vitest), corrida el 14/08/2026 contra la base de test aislada (`gestordetorneos_test`, ver `README.md`). Sin editar — se filtraron únicamente las líneas de log de queries SQL de MikroORM (ruidosas por el modo `debug: true` de desarrollo) y los códigos de color de la terminal, para que se lea como texto plano.

Detalle de qué cubre cada archivo, y si es unitario o de integración, en el propio código fuente de cada test (`src/**/*.test.ts`).

```
> gestor-torneos-backend@1.0.0 test
> vitest run

 RUN  v2.1.9 C:/Users/Mateo/GestorTorneos/backend

[dotenv@17.2.3] injecting env (11) from .env.test

 ✓ src/torneo/torneo.arbitrosCanchas.integration.test.ts (5 tests) 292ms
 ✓ src/torneo/torneo.integration.test.ts (2 tests) 230ms
 ✓ src/torneo/torneo.duracionMinima.integration.test.ts (3 tests) 215ms
 ✓ src/participacion/participacion.integration.test.ts (2 tests) 146ms
 ✓ src/torneo/torneo.controler.test.ts (8 tests) 5ms
 ✓ src/jugador/jugador.integration.test.ts (3 tests) 265ms
 ✓ src/equipo/equipo.controler.test.ts (3 tests) 6ms
 ✓ src/invitacion/invitacion.controler.test.ts (4 tests) 6ms

 Test Files  8 passed (8)
      Tests  30 passed (30)
   Start at  00:18:26
   Duration  12.39s (transform 354ms, setup 83ms, collect 8.89s, tests 1.16s, environment 1ms, prepare 696ms)
```

**8 archivos, 30 tests, 100% en verde.** 5 de los 8 archivos son tests de integración reales (Supertest contra la app de Express completa + MySQL real, sin mockear nada): `torneo.arbitrosCanchas`, `torneo`, `torneo.duracionMinima`, `participacion`, `jugador`. Los otros 3 son unitarios sobre funciones puras y middlewares: `torneo.controler` (`generarRondas`, `elegirReemplazoMenosCargado`), `equipo.controler`, `invitacion.controler`.
