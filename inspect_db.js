const mysql = require('mysql2/promise');

async function inspect() {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Yoniurrego200421@',
    database: 'hospedaje',
    port: 3307
  });

  const [tables] = await db.query("SHOW TABLES LIKE '%paquete%'");
  console.log("Tables matching 'paquete':", tables);

  const [columns] = await db.query("SHOW COLUMNS FROM paquetes");
  console.log("\nColumns in 'paquetes':");
  console.table(columns.map(c => ({ Field: c.Field, Type: c.Type })));

  try {
    const [paqueteServicioCols] = await db.query("SHOW COLUMNS FROM paquete_servicio");
    console.log("\nColumns in 'paquete_servicio':");
    console.table(paqueteServicioCols.map(c => ({ Field: c.Field, Type: c.Type })));
  } catch(e) {
    console.log("\nTable 'paquete_servicio' does not exist.");
  }
  
  await db.end();
}

inspect().catch(console.error);
