const db = require('./src/config/db.js');

async function test() {
  try {
    const [reservas] = await db.query('SELECT * FROM reservas LIMIT 5');
    console.log('--- SAMPLE RESERVAS ---');
    console.log(JSON.stringify(reservas, null, 2));
    
    // Also check tables in the database to be absolutely sure of their schema
    const [tables] = await db.query('SHOW TABLES');
    console.log('--- TABLES ---');
    console.log(tables);
    
    process.exit(0);
  } catch (e) {
    console.error('ERROR:', e);
    process.exit(1);
  }
}
test();
