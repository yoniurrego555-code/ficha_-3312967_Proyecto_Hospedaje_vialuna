const db = require('./src/config/db');

async function alter() {
  try {
    await db.query(`
      ALTER TABLE reservas 
      ADD COLUMN estado_pago ENUM('Pendiente', 'En revisión', 'Pagado', 'Rechazado') DEFAULT 'Pendiente',
      ADD COLUMN comprobante_url TEXT NULL,
      ADD COLUMN fecha_pago DATETIME NULL,
      ADD COLUMN observacion_pago TEXT NULL;
    `);
    console.log('Exito');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('Las columnas ya existen');
    } else {
      console.error(e);
      process.exit(1);
    }
  } finally {
    process.exit(0);
  }
}

alter();
