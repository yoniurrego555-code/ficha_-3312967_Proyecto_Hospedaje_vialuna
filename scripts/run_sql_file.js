require('dotenv').config();
const fs = require('fs');
const mysql = require('mysql2/promise');

(async () => {
  try {
    const sql = fs.readFileSync(__dirname + '/../sql/add_imagenes_habitacion.sql', 'utf8');
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT) || 3306,
      multipleStatements: true
    });

    console.log('Ejecutando SQL file...');
    await pool.query(sql);
    console.log('SQL ejecutado correctamente.');
    await pool.end();
  } catch (err) {
    console.error('ERROR al ejecutar SQL file:', err.message);
    process.exit(1);
  }
})();
