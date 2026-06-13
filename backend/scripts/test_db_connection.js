require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT) || 3306,
      connectionLimit: 5
    });

    console.log('Intentando conectar a MySQL en', process.env.DB_HOST + ':' + process.env.DB_PORT);
    const [rows] = await pool.query('SELECT 1 as ok');
    console.log('Conectado, resultado:', rows);
    await pool.end();
  } catch (err) {
    console.error('ERROR CONEXIÓN MySQL:', err);
    process.exit(1);
  }
})();
