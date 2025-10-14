import { MikroORM } from '@mikro-orm/core';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';

export const orm = await MikroORM.init({
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],
  dbName: 'gestordetorneos',
  type: 'mysql',
  clientUrl: 'mysql://root:burgosmateo22@localhost:3306/gestordetorneos',
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