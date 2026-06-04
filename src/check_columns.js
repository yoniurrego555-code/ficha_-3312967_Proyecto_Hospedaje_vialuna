const db = require('./config/db');

async function check() {
  try {
    const [columns] = await db.query("SHOW COLUMNS FROM clientes");
    console.log("CLIENTES COLUMNS:");
    columns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} (Null: ${col.Null})`);
    });

    const [columnsHab] = await db.query("SHOW COLUMNS FROM habitacion");
    console.log("\nHABITACION COLUMNS:");
    columnsHab.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} (Null: ${col.Null})`);
    });

    const [columnsRes] = await db.query("SHOW COLUMNS FROM reservas");
    console.log("\nRESERVAS COLUMNS:");
    columnsRes.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} (Null: ${col.Null})`);
    });

  } catch (error) {
    console.error("DB Query error:", error);
  }
  process.exit();
}

check();
