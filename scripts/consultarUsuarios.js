require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const db = require("../src/config/db");

async function consultarUsuarios() {
  try {
    console.log("Consultando usuarios en la base de datos...");
    
    // Primero ver las columnas de la tabla usuarios
    const [columns] = await db.query("SHOW COLUMNS FROM usuarios");
    console.log("\n=== COLUMNAS DE TABLA USUARIOS ===");
    console.log(columns.map(c => c.Field));
    
    // Consultar tabla usuarios (administradores) con las columnas que existen
    const [usuarios] = await db.query("SELECT * FROM usuarios");
    console.log("\n=== TABLA USUARIOS (ADMINISTRADORES) ===");
    console.log(usuarios);
    
    // Consultar tabla clientes
    const [clientes] = await db.query("SELECT * FROM clientes LIMIT 10");
    console.log("\n=== TABLA CLIENTES (PRIMEROS 10) ===");
    console.log(clientes);
    
    // Consultar roles
    const [roles] = await db.query("SELECT * FROM roles");
    console.log("\n=== TABLA ROLES ===");
    console.log(roles);
    
    process.exit(0);
  } catch (error) {
    console.error("Error al consultar usuarios:", error);
    process.exit(1);
  }
}

consultarUsuarios();
