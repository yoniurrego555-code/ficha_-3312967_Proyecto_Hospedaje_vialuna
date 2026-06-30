require("dotenv").config({ path: "../.env" });
const db = require("../src/config/db");

async function addDetallesPagoColumn() {
  try {
    console.log("Conectando a la base de datos...");
    
    // Primero, verificamos si la columna ya existe
    const [columns] = await db.query("SHOW COLUMNS FROM reservas LIKE 'detalles_pago'");
    
    if (columns.length > 0) {
      console.log("La columna 'detalles_pago' ya existe en la tabla 'reservas'.");
    } else {
      console.log("Añadiendo la columna 'detalles_pago' de tipo JSON...");
      // Intentamos con JSON. Si la BD es antigua y no soporta JSON, fallará y podríamos cambiar a TEXT.
      await db.query("ALTER TABLE reservas ADD COLUMN detalles_pago JSON NULL");
      console.log("Columna 'detalles_pago' añadida correctamente.");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error al modificar la base de datos:", error);
    
    if (error.code === 'ER_PARSE_ERROR' || error.message.includes('JSON')) {
      console.log("El tipo JSON podría no estar soportado nativamente. Intentando con TEXT...");
      try {
        await db.query("ALTER TABLE reservas ADD COLUMN detalles_pago TEXT NULL");
        console.log("Columna 'detalles_pago' añadida como TEXT correctamente.");
        process.exit(0);
      } catch (err2) {
         console.error("Error también al intentar con TEXT:", err2);
         process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
}

addDetallesPagoColumn();
