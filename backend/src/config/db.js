// src/config/db.js
const mysql = require("mysql2/promise");
require("dotenv").config();

// Configuración base de la base de datos
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Condición para activar SSL en la nube (ej. TiDB)
if (process.env.DB_SSL === 'true') {
    dbConfig.ssl = {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    };
}

const pool = mysql.createPool(dbConfig);

// Wrap the query method to log queries
const originalQuery = pool.query;
pool.query = function (...args) {
  console.log('[DB QUERY]:', args[0], args[1]);
  return originalQuery.apply(this, args);
};

module.exports = pool;