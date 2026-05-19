const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'c:/Users/yoniu/OneDrive/Escritorio/Proyecto_Hospedaje_vialuna/backend/.env' });

async function updateRooms() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  console.log('Actualizando habitaciones con descripciones cortas...');

  // Familiar (ID 5)
  await connection.execute(
    'UPDATE habitacion SET NombreHabitacion = ?, ImagenHabitacion = ?, Descripcion = ? WHERE IDHabitacion = ?',
    ['Familiar', 'familiar.png', 'Amplia, ideal para familias.', 5]
  );

  // Parejas (ID 3)
  await connection.execute(
    'UPDATE habitacion SET NombreHabitacion = ?, ImagenHabitacion = ?, Descripcion = ? WHERE IDHabitacion = ?',
    ['Parejas', 'parejas.png', 'Cama doble para parejas.', 3]
  );

  // Individual (ID 4)
  await connection.execute(
    'UPDATE habitacion SET NombreHabitacion = ?, ImagenHabitacion = ?, Descripcion = ? WHERE IDHabitacion = ?',
    ['Individual', 'individual.png', 'Sencilla para una persona.', 4]
  );

  console.log('Habitaciones actualizadas exitosamente.');
  await connection.end();
}

updateRooms().catch(console.error);
