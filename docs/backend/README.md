# Documentación del backend — Gestor de Torneos

Esta carpeta explica cómo está armado el backend: su stack, su arquitectura por capas, cada entidad, cada endpoint, y las decisiones que se tomaron en el camino. Está pensada para alguien que no vivió el desarrollo día a día y necesita entender el código para trabajar sobre él o para explicarlo — por ejemplo, en una defensa académica.

Mismo criterio que `docs/frontend/` del repo del frontend (carpeta hermana de esta): explicar el *por qué* antes que el *qué*, con ejemplos reales del código, sin inventar nada que no esté verificado leyendo los archivos fuente.

## Índice

- [`entidades.md`](./entidades.md) — cada entidad del dominio (`Jugador`, `Equipo`, `Torneo`, etc.), sus campos reales, y cómo se relacionan entre sí.
- [`endpoints.md`](./endpoints.md) — recorrido por cada grupo de rutas: método, autenticación requerida, body, respuesta y errores principales.
- [`glosario.md`](./glosario.md) — explicación en criollo de los conceptos técnicos no triviales (MikroORM, `syncSchema`, arquitectura por capas, JWT, transacciones, etc.), cada uno con el ejemplo real de este proyecto.
- [`decisiones.md`](./decisiones.md) — bitácora de por qué se tomó cada decisión de arquitectura relevante.
- [`pendientes.md`](./pendientes.md) — lo que queda frágil o sin resolver, con el motivo concreto.

## Visión general de la arquitectura

### Stack

- **Node.js** con **TypeScript** (`tsc`, sin `ts-node` en producción — se compila a `dist/` y se corre el JS compilado).
- **Express 5** como framework HTTP.
- **MikroORM 5** (`@mikro-orm/core` + `@mikro-orm/mysql`) como ORM — ver [`glosario.md`](./glosario.md) para qué es y qué resuelve.
- **MySQL** como base de datos.
- **JWT** (`jsonwebtoken`) para autenticación, **bcryptjs** para hashear contraseñas.
- **multer** para subida de archivos (escudos de equipo), **nodemailer** para el mail de recuperación de contraseña.
- Gestor de paquetes: **pnpm** (hay un `pnpm-lock.yaml` — no usar `npm install`, generaría un `package-lock.json` en paralelo y podría instalar versiones distintas).

### Arquitectura por capas

El proyecto sigue el mismo patrón en los ~14 módulos de dominio que tiene (`jugador`, `equipo`, `torneo`, `partido`, `cancha`, `arbitro`, `adminTorneo`, `participacion`, `invitacion`, `notificacion`, `formacion`, `suspension`, `torneoArbitro`, `torneoCancha`). Cada módulo vive en su propia carpeta bajo `src/`, con hasta tres archivos:

```
Request HTTP
     │
     ▼
┌─────────────────┐   src/routes.ts (apiRouter) monta cada
│   *.routes.ts    │   router de módulo bajo un prefijo
│  (rutas Express)  │   (ej. '/jugadores', '/equipos').
└────────┬─────────┘   Define QUÉ verbo+URL dispara QUÉ función.
         │
         ▼
┌─────────────────┐
│ *.controler.ts   │   Recibe el req/res de Express. Valida el
│  (controlador)   │   body, aplica las reglas de negocio y
└────────┬─────────┘   autorización, y llama al ORM directamente.
         │
         ▼
┌─────────────────┐
│  *.entity.ts     │   Clases con decoradores de MikroORM
│   (entidad)       │   (@Entity, @Property, @ManyToOne, etc.)
└─────────────────┘   que describen la tabla y sus relaciones.
```

Notar que **no hay una capa de "repositorio" separada como archivo propio** — cada controlador llama directamente a `orm.em` (el `EntityManager` de MikroORM, ver `glosario.md`) para leer y escribir. El propio `EntityManager`, en MikroORM, ya cumple buena parte del rol de un repositorio genérico (`em.find`, `em.findOne`, `em.create`, `em.persistAndFlush`, etc.), así que el proyecto no agregó una capa extra encima. Si en algún momento se investiga el código esperando encontrar una carpeta `repositorios/` o `*.repository.ts`, no existe: la capa de acceso a datos está en el propio `EntityManager` importado en cada controlador.

Responsabilidad de cada capa:

| Capa | Responsabilidad | Lo que NO debería hacer |
|---|---|---|
| `*.routes.ts` | Mapear verbo HTTP + URL a una función del controlador. Aplicar middlewares de sanitización antes de la función principal. | Lógica de negocio, acceso a la base. |
| `*.controler.ts` | Leer `req`, validar el body, aplicar las reglas de autorización y de negocio, hablar con MikroORM, armar la respuesta (`res.status(...).json(...)`). | Saber nada de rutas HTTP más allá de recibir `req`/`res`. |
| `*.entity.ts` | Describir campos y relaciones de la tabla vía decoradores. | Cualquier lógica — son clases de datos, sin métodos de negocio. |

### Cómo correr el proyecto localmente

```bash
pnpm install
pnpm build       # compila TypeScript a dist/
pnpm start:dev   # tsc-watch: recompila en cada cambio y relanza `node ./dist/app.js`
```

No hay un script `dev` a secas ni `start` simple — el único modo de desarrollo es `start:dev`.

### Variables de entorno

Copiar `.env.example` a `.env` y completar:

```
JWT_SECRET=...                  # clave para firmar/verificar los JWT
SMTP_HOST=smtp.gmail.com        # envío del mail de recuperación de contraseña
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...                   # "app password" de Google, no la contraseña normal de la cuenta
MAIL_FROM="Gestor de Torneos <...>"
FRONTEND_URL=http://localhost:5173   # usada para armar el link del mail de recuperación
```

Si `JWT_SECRET` no está definida, el código cae a un valor hardcodeado (`'clave-segura-del-gestor-torneos-2024'`, ver `auth.middleware.ts` y los `jwt.sign(...)` de cada login) — sirve para que el proyecto arranque sin configuración en una entrega académica, pero **no es una clave real de producción**.

### Conexión a MySQL y `syncSchema()`

La conexión está hardcodeada en `src/shared/db/orm.ts` (no usa variables de entorno para la base, a diferencia del resto de la configuración):

```ts
dbName: 'gestordetorneos',
type: 'mysql',
clientUrl: 'mysql://dsw:dsw@localhost:3306/gestordetorneos',
```

Esto asume una base MySQL local llamada `gestordetorneos`, usuario `dsw`, contraseña `dsw`, puerto `3306` — típicamente levantada con Docker en desarrollo (ver comentarios de instalación más abajo).

El proyecto **no usa migraciones manuales**. En cada arranque (`app.ts`), después de montar las rutas, se llama a:

```ts
await syncSchema();
```

que internamente corre `orm.getSchemaGenerator().updateSchema()` — MikroORM compara las entidades definidas en el código contra las tablas reales de MySQL, y aplica automáticamente los `ALTER TABLE`/`CREATE TABLE` necesarios para que coincidan. Ver [`glosario.md`](./glosario.md) para el trade-off completo de este enfoque (incluye un bug real que pasó por esto: la columna `notas` de `Formacion` nació en `varchar(255)` porque nadie especificó un tipo, y truncaba el texto).

### Cómo se conecta con el frontend

- Todas las rutas de dominio quedan montadas bajo el prefijo `/api` (`app.use('/api', authMiddleware, apiRouter)`, en `src/app.ts`), así que el frontend le pega, por ejemplo, a `http://localhost:3000/api/jugadores`.
- El middleware de autenticación (`src/middleware/auth.middleware.ts`) se aplica **globalmente** a todo `/api`, excepto una lista explícita de rutas públicas (login, registro, recuperación de contraseña — ver `PUBLIC_PATHS` en ese archivo). Cualquier otra ruta exige un header `Authorization: Bearer <token>` con un JWT válido.
- Hay **dos tipos de usuario con JWT distintos**: `Jugador` (login en `POST /jugadores/login`, el token solo lleva `{ id, nombre, email }`) y `AdminTorneo` (login en `POST /adminTorneo/login`, el token lleva además `rol: 'admin'`). El middleware no distingue entre ambos — simplemente verifica la firma y expone el payload en `req.user`; cada controlador decide qué hacer con `req.user.id` (y, cuando corresponde, `req.user.rol`) según de qué endpoint se trate.
- Los archivos subidos (escudos de equipo) se sirven aparte, fuera de `/api` y sin exigir token: `app.use('/uploads', express.static(...))`, en `http://localhost:3000/uploads/escudos/<archivo>.jpg`.

Ver [`glosario.md`](./glosario.md) para la explicación completa de JWT y del patrón "identificar al actor por el token, nunca por un parámetro de URL", que se repite en varios endpoints del proyecto.
