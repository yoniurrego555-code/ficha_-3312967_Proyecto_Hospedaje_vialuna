const pool = require('./src/config/db.js');
async function run() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT * FROM estadosreserva;");
    console.log(JSON.stringify(rows, null, 2));
    connection.release();
  } catch(e) {
    console.error(e);
  }
  process.exit();
}
run();
