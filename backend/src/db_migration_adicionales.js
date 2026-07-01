const db = require('./config/db');

async function updateDB() {
  try {
    console.log('Iniciando migración de base de datos para pagos adicionales...');
    
    // 1. Agregar columnas a reservas si no existen
    const columnsToAdd = [
      { name: 'total_original', definition: 'DECIMAL(10,2) DEFAULT 0' },
      { name: 'monto_pagado', definition: 'DECIMAL(10,2) DEFAULT 0' },
      { name: 'saldo_pendiente', definition: 'DECIMAL(10,2) DEFAULT 0' }
    ];

    for (const col of columnsToAdd) {
      try {
        await db.query(`ALTER TABLE reservas ADD COLUMN ${col.name} ${col.definition}`);
        console.log(`Columna ${col.name} agregada a reservas.`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`La columna ${col.name} ya existe en reservas.`);
        } else {
          throw err;
        }
      }
    }

    // Inicializar totales en base al total actual
    await db.query(`
        UPDATE reservas 
        SET total_original = total, 
            monto_pagado = CASE WHEN estado_pago = 'Pagado' OR estado_pago = 'Confirmado' THEN total ELSE 0 END,
            saldo_pendiente = CASE WHEN estado_pago = 'Pagado' OR estado_pago = 'Confirmado' THEN 0 ELSE total END
        WHERE total_original = 0 AND total > 0
    `);

    // 2. Crear tabla pagos_adicionales
    await db.query(`
      CREATE TABLE IF NOT EXISTS pagos_adicionales (
          id_pago INT AUTO_INCREMENT PRIMARY KEY,
          id_reserva INT NOT NULL,
          monto DECIMAL(10,2) NOT NULL,
          comprobante_url VARCHAR(255) NULL,
          estado VARCHAR(50) DEFAULT 'Pendiente',
          fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
          observacion VARCHAR(255) NULL,
          FOREIGN KEY (id_reserva) REFERENCES reservas(id_reserva) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla pagos_adicionales creada o ya existía.');

    console.log('Migración completada exitosamente.');
  } catch (err) {
    console.error('Error actualizando BD:', err);
  } finally {
    process.exit(0);
  }
}

updateDB();
