// Script to ensure the 'Caminata Ecológica' service exists in the database
// Run this script with `node scripts/add_caminata_service.js`

const db = require('../src/config/db');

async function addCaminata() {
  try {
    // Check if a service with a similar name already exists (case-insensitive)
    const [rows] = await db.query(
      "SELECT id FROM servicios WHERE LOWER(nombre) = LOWER(?) OR LOWER(NombreServicio) = LOWER(?)",
      ['Caminata Ecológica', 'Caminata Ecológica']
    );
    if (rows.length === 0) {
      await db.query(
        "INSERT INTO servicios (nombre, descripcion, precio, estado) VALUES (?, ?, ?, ?)",
        [
          'Caminata Ecológica',
          'Explora la naturaleza en una caminata guiada y ecológica, ideal para amantes del senderismo.',
          50000,
          'disponible'
        ]
      );
      console.log('✔️  Servicio "Caminata Ecológica" creado exitosamente.');
    } else {
      console.log('ℹ️  El servicio "Caminata Ecológica" ya existe en la base de datos.');
    }
  } catch (err) {
    console.error('❌  Error al crear el servicio:', err);
  } finally {
    // Close the pool to exit the process cleanly
    if (db && typeof db.end === 'function') await db.end();
  }
}

addCaminata();
