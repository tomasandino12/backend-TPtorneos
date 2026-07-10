# Graph Report - .  (2026-06-13)

## Corpus Check
- Corpus is ~6,874 words - fits in a single context window. You may not need a graph.

## Summary
- 202 nodes · 484 edges · 17 communities (14 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Participation Data Layer|Participation Data Layer]]
- [[_COMMUNITY_Express App Dependencies|Express App Dependencies]]
- [[_COMMUNITY_Auth Middleware & ORM|Auth Middleware & ORM]]
- [[_COMMUNITY_TypeScript Configuration|TypeScript Configuration]]
- [[_COMMUNITY_Player Auth & Management|Player Auth & Management]]
- [[_COMMUNITY_Domain Entities|Domain Entities]]
- [[_COMMUNITY_Team Management|Team Management]]
- [[_COMMUNITY_Dev Tool Dependencies|Dev Tool Dependencies]]
- [[_COMMUNITY_Tournament Admin Module|Tournament Admin Module]]
- [[_COMMUNITY_Referee Module|Referee Module]]
- [[_COMMUNITY_FieldCourt Module|Field/Court Module]]
- [[_COMMUNITY_Match Management|Match Management]]
- [[_COMMUNITY_Tournament Module|Tournament Module]]
- [[_COMMUNITY_TS Setup Documentation|TS Setup Documentation]]
- [[_COMMUNITY_Root Package Config|Root Package Config]]
- [[_COMMUNITY_VSCode Debug Config|VSCode Debug Config]]

## God Nodes (most connected - your core abstractions)
1. `BaseEntity` - 20 edges
2. `Jugador` - 17 edges
3. `Equipo` - 15 edges
4. `MikroORM Instance (orm.ts)` - 15 edges
5. `compilerOptions` - 14 edges
6. `Partido` - 13 edges
7. `jugadorRouter` - 12 edges
8. `AdminTorneo` - 11 edges
9. `Arbitro` - 11 edges
10. `Cancha` - 11 edges

## Surprising Connections (you probably didn't know these)
- `MikroORM Migration Rationale` --rationale_for--> `MikroORM Instance (orm.ts)`  [INFERRED]
  README.md → src/shared/db/orm.ts
- `TypeScript ESM Module Configuration` --references--> `TypeScript Project Setup Guide`  [EXTRACTED]
  tsconfig.json → ts-setup-steps.md
- `add()` --semantically_similar_to--> `add()`  [INFERRED] [semantically similar]
  src/adminTorneo/adminTorneo.controler.ts → src/jugador/jugador.controler.ts
- `sanitizeCanchaInput()` --implements--> `Input Sanitization Middleware Pattern`  [INFERRED]
  src/cancha/cancha.controler.ts → src/adminTorneo/adminTorneo.controler.ts
- `sanitizeEquipoInput()` --implements--> `Input Sanitization Middleware Pattern`  [INFERRED]
  src/equipo/equipo.controler.ts → src/adminTorneo/adminTorneo.controler.ts

## Import Cycles
- 2-file cycle: `src/participacion/participacion.entity.ts -> src/shared/db/entities.ts -> src/participacion/participacion.entity.ts`
- 2-file cycle: `src/equipo/equipo.entity.ts -> src/shared/db/entities.ts -> src/equipo/equipo.entity.ts`
- 2-file cycle: `src/jugador/jugador.entity.ts -> src/shared/db/entities.ts -> src/jugador/jugador.entity.ts`
- 2-file cycle: `src/shared/db/entities.ts -> src/torneo/torneo.entity.ts -> src/shared/db/entities.ts`
- 3-file cycle: `src/participacion/participacion.entity.ts -> src/shared/db/entities.ts -> src/partido/partido.entity.ts -> src/participacion/participacion.entity.ts`
- 3-file cycle: `src/partido/partido.entity.ts -> src/torneo/torneo.entity.ts -> src/shared/db/entities.ts -> src/partido/partido.entity.ts`

## Hyperedges (group relationships)
- **CRUD Controller-Router-Entity Pattern across all domain modules** — admintorneo_admintorneo_controler_findall, admintorneo_admintorneo_routes_admintorneorouter, admintorneo_admintorneo_entity_admintorneo, arbitro_arbitro_controler_findall, arbitro_arbitro_routes_arbitrorouter, arbitro_arbitro_entity_arbitro, cancha_cancha_controler_findall, cancha_cancha_routes_cancharouter, cancha_cancha_entity_cancha, equipo_equipo_controler_findall, equipo_equipo_routes_equiporouter, equipo_equipo_entity_equipo, jugador_jugador_controler_findall, jugador_jugador_routes_jugadorrouter, jugador_jugador_entity_jugador [INFERRED 0.95]
- **JWT Auth Flow: login generates token, middleware verifies token on protected routes** — jugador_jugador_controler_login, jugador_jugador_controler_register, middleware_auth_middleware_authmiddleware, concept_jwt_auth, src_app_app [INFERRED 0.95]
- **Password Security: bcrypt hashing on create/update for users with credentials** — admintorneo_admintorneo_controler_add, admintorneo_admintorneo_controler_update, jugador_jugador_controler_add, jugador_jugador_controler_register, concept_password_hashing [INFERRED 0.95]
- **MVC Pattern: Torneo (Entity + Controller + Router)** — torneo_entity_torneo, torneo_controler_findall, torneo_routes_torneorouter [INFERRED 0.95]
- **MVC Pattern: Participacion (Entity + Controller + Router)** — participacion_entity_participacion, participacion_controler_findall, participacion_routes_participacionrouter [INFERRED 0.95]
- **API Router aggregates all domain routers** — src_routes_apirouter, participacion_routes_participacionrouter, partido_routes_partidorouter, torneo_routes_torneorouter [EXTRACTED 1.00]

## Communities (17 total, 3 thin omitted)

### Community 0 - "Participation Data Layer"
Cohesion: 0.11
Nodes (30): Shared Entities Barrel (entities.ts), MikroORM Instance (orm.ts), add (Participacion), findAll (Participacion), findOne (Participacion), remove (Participacion), sanitizeParticipacionInput, update (Participacion) (+22 more)

### Community 1 - "Express App Dependencies"
Cohesion: 0.08
Nodes (25): author, dependencies, bcryptjs, body-parser, cors, dotenv, express, jsonwebtoken (+17 more)

### Community 2 - "Auth Middleware & ORM"
Cohesion: 0.18
Nodes (12): syncSchema(), authMiddleware(), PUBLIC_PATHS, Request, add(), findAll(), findOne(), remove() (+4 more)

### Community 3 - "TypeScript Configuration"
Cohesion: 0.12
Nodes (16): compilerOptions, alwaysStrict, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, incremental, module (+8 more)

### Community 4 - "Player Auth & Management"
Cohesion: 0.42
Nodes (14): Automatic Captain Reassignment on Team Leave, JWT Authentication Pattern, add(), findAll(), findByEmail(), findOne(), getJugadoresSinEquipo(), login() (+6 more)

### Community 5 - "Domain Entities"
Cohesion: 0.56
Nodes (4): BaseEntity, Participacion, Partido, Torneo

### Community 6 - "Team Management"
Cohesion: 0.50
Nodes (11): add(), calcularEstadisticas(), findAll(), findOne(), getEstadisticas(), getEstadisticasTorneo(), remove(), sanitizeEquipoInput() (+3 more)

### Community 7 - "Dev Tool Dependencies"
Cohesion: 0.17
Nodes (12): devDependencies, ts-node, tsc-watch, @types/bcryptjs, @types/body-parser, @types/connect, @types/cors, @types/express (+4 more)

### Community 8 - "Tournament Admin Module"
Cohesion: 0.51
Nodes (9): add(), findAll(), findOne(), remove(), sanitizeAdminTorneoInput(), update(), AdminTorneo, adminTorneoRouter (+1 more)

### Community 9 - "Referee Module"
Cohesion: 0.49
Nodes (9): add(), findAll(), findOne(), remove(), sanitizeArbitroInput(), update(), Arbitro, arbitroRouter (+1 more)

### Community 10 - "Field/Court Module"
Cohesion: 0.58
Nodes (8): add(), findAll(), findOne(), remove(), sanitizeCanchaInput(), update(), Cancha, canchaRouter

### Community 11 - "Match Management"
Cohesion: 0.42
Nodes (8): add(), findAll(), findOne(), findProgramados(), getPartidosPorTorneo(), remove(), sanitizePartidoInput(), update()

### Community 12 - "Tournament Module"
Cohesion: 0.54
Nodes (6): add(), findAll(), findOne(), remove(), sanitizeTorneoInput(), update()

## Knowledge Gaps
- **54 isolated node(s):** `name`, `type`, `version`, `description`, `main` (+49 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MikroORM Instance (orm.ts)` connect `Participation Data Layer` to `Auth Middleware & ORM`, `Player Auth & Management`, `Team Management`, `Tournament Admin Module`, `Referee Module`, `Field/Court Module`, `Match Management`, `Tournament Module`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `BaseEntity` connect `Domain Entities` to `Participation Data Layer`, `Player Auth & Management`, `Team Management`, `Tournament Admin Module`, `Referee Module`, `Field/Court Module`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `partidoRouter` connect `Participation Data Layer` to `Auth Middleware & ORM`, `Match Management`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `MikroORM Instance (orm.ts)` (e.g. with `syncSchema()` and `MikroORM Migration Rationale`) actually correct?**
  _`MikroORM Instance (orm.ts)` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `type`, `version` to the rest of the system?**
  _57 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Participation Data Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.11182795698924732 - nodes in this community are weakly interconnected._
- **Should `Express App Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._