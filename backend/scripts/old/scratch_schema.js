const db = require('./src/config/db');

async function checkSchema() {
  const tables = ['habitacion', 'usuarios', 'servicios'];
  for (const table of tables) {
    try {
      const [rows] = await db.query(`DESCRIBE ${table}`);
      console.log(`\n--- Schema for ${table} ---`);
      console.table(rows);
    } catch (error) {
      console.error(`Error describing table ${table}:`, error.message);
    }
  }
  process.exit();
}

checkSchema();
