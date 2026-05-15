const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'c:/Users/yoniu/OneDrive/Escritorio/Proyecto_Hospedaje_vialuna/backend/.env' });

async function checkRooms() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  const [rows] = await connection.execute('SELECT * FROM habitacion');
  console.log(JSON.stringify(rows, null, 2));
  await connection.end();
}

checkRooms().catch(console.error);
