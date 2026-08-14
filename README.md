# Gestor de Torneos — Backend

API REST para la gestión de torneos de fútbol amateur: jugadores, equipos, árbitros, canchas, torneos, fixtures y resultados. Backend del TP de Desarrollo de Software (UTN FRRo) — el frontend vive en un repositorio aparte, [`frontend-TPtorneos`](https://github.com/tomasandino12/frontend-TPtorneos).

Documentación completa del proyecto (arquitectura, entidades, endpoints, decisiones técnicas): **[`docs/README.md`](./docs/README.md)**.

## Stack

Node.js + TypeScript · Express 5 · MikroORM 5 (MySQL) · JWT + bcryptjs · Vitest + Supertest.

## Requisitos previos

- Node.js 18 o superior.
- pnpm (`corepack enable` o `npm install -g pnpm`). El proyecto usa `pnpm-lock.yaml` — no instalar con `npm install`, genera un lockfile paralelo y puede instalar versiones distintas.
- Una base de datos MySQL accesible (local con Docker, o en la nube — ver más abajo). No hace falta crear las tablas a mano: el proyecto las genera y actualiza solo al arrancar.

## Instalación

```bash
pnpm install
cp .env.example .env
```

Completar `.env` con los valores reales (ver la sección siguiente). Con una base MySQL local corriendo:

```bash
pnpm build       # compila TypeScript a dist/
pnpm start:dev   # levanta el servidor en modo desarrollo (recompila en cada cambio)
```

El servidor queda escuchando en `http://localhost:3000` (o el puerto que indique `PORT` en `.env`), con todas las rutas de dominio bajo el prefijo `/api` (por ejemplo, `http://localhost:3000/api/jugadores`).

No hay un script `dev` a secas ni `start` simple para desarrollo — el único modo de desarrollo es `pnpm start:dev`. `pnpm start` corre el build ya compilado (`node ./dist/app.js`), pensado para producción.

## Variables de entorno

Copiar `.env.example` a `.env` y completar:

| Variable | Para qué |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión a MySQL. En desarrollo local con Docker suele ser `localhost:3306`, usuario/contraseña `dsw`/`dsw`. |
| `DB_SSL` | `true` para bases en la nube que exigen TLS (ej. Aiven, que requiere `ssl-mode=REQUIRED`). `false` en local. |
| `JWT_SECRET` | Clave para firmar y verificar los JWT de sesión. Usar una cadena larga y aleatoria (`openssl rand -hex 32`). |
| `GOOGLE_CLIENT_ID` | Client ID de Google Cloud, para verificar el login con Google (`POST /jugadores/google-login`). No hace falta el Client Secret. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Envío del mail de recuperación de contraseña, vía Gmail SMTP (`SMTP_PASS` es un "App Password" de Google, no la contraseña normal de la cuenta). |
| `FRONTEND_URL` | URL del frontend, usada para armar el link del mail de recuperación de contraseña. |

Si `.env` no está configurado, el proyecto igual arranca (`DB_*` cae a valores de desarrollo local, `JWT_SECRET` a una clave hardcodeada) — pensado para no bloquear una entrega académica, pero **no usar esos fallbacks fuera de desarrollo local**.

Para correr los tests automatizados hace falta además un `.env.test` (ver más abajo).

## Base de datos

El proyecto no usa migraciones manuales: al arrancar (`app.ts`), MikroORM compara las entidades del código contra las tablas reales y aplica los `CREATE TABLE`/`ALTER TABLE` necesarios (`syncSchema()`, ver [`docs/backend/glosario.md`](./docs/backend/glosario.md)). No hace falta correr ningún script de setup de esquema.

## Tests

```bash
pnpm test         # corre toda la suite una vez (Vitest)
pnpm test:watch   # modo watch
```

Los tests de integración pegan contra una base de datos real y separada de la de desarrollo (`gestordetorneos_test`, configurada en `.env.test`, ya incluido en el repo sin secretos reales), para no ensuciar datos de desarrollo. Antes de correrlos por primera vez, crear esa base en MySQL:

```sql
CREATE DATABASE gestordetorneos_test;
GRANT ALL PRIVILEGES ON gestordetorneos_test.* TO 'dsw'@'localhost';
```

(ajustar el usuario si `.env.test` usa uno distinto).

## Deploy

Backend deployado en Render, conectado a una base MySQL en Aiven (variables `DB_SSL=true`). Frontend: [`frontend-gestortorneos.vercel.app`](https://frontend-gestortorneos.vercel.app/).

### Credenciales de prueba

Para evaluar la app deployada, sin necesidad de registrar una cuenta nueva:

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | `adrianperez@gmail.com` | `adrianperez123` |
| Jugador | `julianalvarez@gmail.com` | `julianalvarez123` |

Son cuentas de prueba — no representan personas reales.

## Estructura del proyecto

Arquitectura por capas (`*.routes.ts` → `*.controler.ts` → `*.entity.ts`), un módulo por entidad de dominio bajo `src/`. Detalle completo, con diagrama y la responsabilidad exacta de cada capa, en [`docs/backend/README.md`](./docs/backend/README.md).
