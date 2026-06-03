const db = require('./src/config/db');

async function updateSchema() {
  const checkColumn = async (table, column) => {
    const [rows] = await db.query(
      `SELECT count(*) as count FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = 'hospedaje' AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    );
    return rows[0].count > 0;
  };

  const addColumn = async (table, column, definition) => {
    const exists = await checkColumn(table, column);
    if (!exists) {
      await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      console.log(`Added ${column} to ${table}`);
    } else {
      console.log(`Column ${column} already exists in ${table}`);
    }
  };

  try {
    // Habitacion
    await addColumn('habitacion', 'cantidad_camas', 'INT NULL');
    await addColumn('habitacion', 'tipo_camas', 'VARCHAR(255) NULL');
    await addColumn('habitacion', 'ImagenUrl', 'VARCHAR(500) NULL');

    // Servicios
    await addColumn('servicios', 'DuracionMinutos', 'INT NULL');
    await addColumn('servicios', 'CapacidadMaxima', 'INT NULL');
    await addColumn('servicios', 'EdadMinima', 'INT NULL');
    await addColumn('servicios', 'EdadMaxima', 'INT NULL');
    await addColumn('servicios', 'ImagenServicio', 'VARCHAR(255) NULL');
    await addColumn('servicios', 'ImagenUrl', 'VARCHAR(500) NULL');
    await addColumn('servicios', 'DescripcionExtra', 'TEXT NULL');

    // Paquetes
    await addColumn('paquetes', 'ImagenUrl', 'VARCHAR(500) NULL');

    // Clientes
    await addColumn('clientes', 'Pais', 'VARCHAR(100) DEFAULT "Colombia"');
    await addColumn('clientes', 'Departamento', 'VARCHAR(100) NULL');

    // Usuarios
    await addColumn('usuarios', 'Pais', 'VARCHAR(100) NULL');
    await addColumn('usuarios', 'Departamento', 'VARCHAR(100) NULL');

    console.log('Database updates completed successfully.');
  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    process.exit(0);
  }
}

updateSchema();
