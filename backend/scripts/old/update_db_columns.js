require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "hospedaje",
    port: Number(process.env.DB_PORT || 3307)
  });

  try {
    const connection = await pool.getConnection();
    
    try { await connection.query("ALTER TABLE clientes ADD COLUMN Pais VARCHAR(100) DEFAULT 'Colombia'"); console.log("Added Pais to clientes"); } catch(e) { console.log(e.message); }
    try { await connection.query("ALTER TABLE clientes ADD COLUMN Departamento VARCHAR(100) NULL"); console.log("Added Departamento to clientes"); } catch(e) { console.log(e.message); }
    
    try { await connection.query("ALTER TABLE usuarios ADD COLUMN Pais VARCHAR(100) DEFAULT 'Colombia'"); console.log("Added Pais to usuarios"); } catch(e) { console.log(e.message); }
    try { await connection.query("ALTER TABLE usuarios ADD COLUMN Departamento VARCHAR(100) NULL"); console.log("Added Departamento to usuarios"); } catch(e) { console.log(e.message); }

    connection.release();
    console.log("DB Update complete.");
  } catch(e) {
    console.error(e);
  }
  process.exit();
}
run();
