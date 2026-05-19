const pool = require('./src/config/db.js');
async function run() {
  try {
    const connection = await pool.getConnection();
    await connection.query("SET FOREIGN_KEY_CHECKS=0;");
    
    // Delete the habitacion
    const [result] = await connection.query("DELETE FROM habitacion WHERE NombreHabitacion = 'Suite';");
    console.log("Deleted habitacion Suite:", result.affectedRows, "rows");

    await connection.query("SET FOREIGN_KEY_CHECKS=1;");
    connection.release();
  } catch(e) {
    console.error(e);
  }
  process.exit();
}
run();
