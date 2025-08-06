import mysql from 'mysql2/promise';
export const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3307', 10),
    user: process.env.DB_USER || 'dsw',
    password: process.env.DB_PASSWORD || 'dsw',
    database: process.env.DB_NAME || 'gestordetorneos',
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
});
//# sourceMappingURL=conn.mysql.js.map