import 'dotenv/config';
import { MikroORM } from '@mikro-orm/core';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';

// import 'dotenv/config' repetido acá (además de app.ts) a propósito: cualquier
// entry point que importe este módulo (ej. scripts/seed.ts, que no carga dotenv)
// necesita tener process.env poblado antes del MikroORM.init() de más abajo.
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '3306';
const DB_USER = process.env.DB_USER || 'dsw';
const DB_PASSWORD = process.env.DB_PASSWORD || 'dsw';
const DB_NAME = process.env.DB_NAME || 'gestordetorneos';

// DB_SSL=true habilita TLS en la conexión (necesario para MySQL en la nube,
// ej. Aiven, que exige ssl-mode=REQUIRED) — rejectUnauthorized:false cifra la
// conexión sin validar el certificado del servidor contra una CA local.
// En desarrollo local (sin DB_SSL o en 'false') no se agrega, igual que antes.
const DB_SSL = process.env.DB_SSL === 'true';

export const orm = await MikroORM.init({
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],
  dbName: DB_NAME,
  type: 'mysql',
  clientUrl: `mysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
  driverOptions: DB_SSL
    ? { connection: { ssl: { rejectUnauthorized: false } } }
    : {},
  highlighter: new SqlHighlighter(),
  debug: true,
  schemaGenerator: {            // ⚠️ solo en dev
    disableForeignKeys: true,
    createForeignKeyConstraints: true,
    ignoreSchema: [],
  },
});

export const syncSchema = async () => {
  const generator = orm.getSchemaGenerator();

  // ⚠️ Esto borra y vuelve a crear el esquema completo
  /*
  await generator.dropSchema();
  await generator.createSchema();
  */

  // Esto solo actualiza el esquema sin borrar datos
  await generator.updateSchema();
};




/* import mysql from 'mysql2/promise'

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3307', 10),
  user: process.env.DB_USER || 'dsw',
  password: process.env.DB_PASSWORD || 'dsw',
  database: process.env.DB_NAME || 'gestordetorneos',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
  idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
})  */