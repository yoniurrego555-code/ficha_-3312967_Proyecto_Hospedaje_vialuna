const db = require('./config/db');

async function updateDB() {
  try {
    console.log('Actualizando estados de reserva...');
    
    // Mapear reservas existentes a los nuevos IDs antes de actualizar estadosreserva
    // 1 -> Activa => 2 (Confirmada)
    // 2 -> Cancelada => 6 (Rechazada)
    // 3 -> Finalizada => 5 (Finalizada)
    // 4 -> Aceptada => 2 (Confirmada)
    // 5 -> Rechazada => 6 (Rechazada)
    // 6 -> Pendiente => 1 (Pendiente)
    // 7 -> Expirada => 5 (Finalizada)

    // Desactivar temporalmente foreign keys si da problemas, pero no deberia ser necesario si actualizamos cuidadosamente o primero preparamos
    await db.query('SET FOREIGN_KEY_CHECKS=0');

    // Mapeo en reservas
    await db.query(`
      UPDATE reservas SET id_estado_reserva = CASE
        WHEN id_estado_reserva = 1 THEN 2
        WHEN id_estado_reserva = 2 THEN 6
        WHEN id_estado_reserva = 3 THEN 5
        WHEN id_estado_reserva = 4 THEN 2
        WHEN id_estado_reserva = 5 THEN 6
        WHEN id_estado_reserva = 6 THEN 1
        WHEN id_estado_reserva = 7 THEN 5
        ELSE 1
      END
    `);

    // Limpiar tabla estadosreserva
    await db.query('TRUNCATE TABLE estadosreserva');

    // Insertar nuevos valores
    await db.query(`
      INSERT INTO estadosreserva (IdEstadoReserva, NombreEstadoReserva) VALUES
      (1, 'Pendiente'),
      (2, 'Confirmada'),
      (3, 'En Proceso'),
      (4, 'Completada'),
      (5, 'Finalizada'),
      (6, 'Rechazada')
    `);

    await db.query('SET FOREIGN_KEY_CHECKS=1');
    console.log('Actualización completada exitosamente.');
  } catch (err) {
    console.error('Error actualizando BD:', err);
  } finally {
    process.exit(0);
  }
}

updateDB();
