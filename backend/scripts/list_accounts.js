require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT) || 3306,
      connectionLimit: 5
    });

    console.log('Conectando a DB en', `${process.env.DB_HOST}:${process.env.DB_PORT}`);

    // Detectar columna de contraseña en usuarios
    const [userCols] = await pool.query("SHOW COLUMNS FROM usuarios");
    const userColNames = userCols.map(r => r.Field);
    const userPassCol = userColNames.find(c => ['Password','Contrasena','PasswordHash','pass'].includes(c)) || null;

    if (userPassCol) {
      const [usuarios] = await pool.query(`SELECT IDUsuario, COALESCE(Email, '') AS Email, COALESCE(${userPassCol}, '') AS Pass FROM usuarios LIMIT 10`);
      console.log('\nUsuarios (hasta 10):');
      usuarios.forEach(u => {
        const isHash = /^\\$2[aby]\\$/.test(String(u.Pass || ''));
        console.log(`- ID: ${u.IDUsuario} Email: ${u.Email} PassHash: ${isHash}`);
      });
    } else {
      console.log('\nTabla usuarios no tiene columna de contraseña reconocida.');
    }

    const [clientes] = await pool.query("SELECT NroDocumento, COALESCE(Email, '') AS Email, COALESCE(Contrasena, '') AS Pass FROM clientes LIMIT 10");
    console.log('\nClientes (hasta 10):');
    clientes.forEach(c => {
      const isHash = /^\$2[aby]\$/.test(String(c.Pass || ''));
      console.log(`- NroDocumento: ${c.NroDocumento} Email: ${c.Email} PassHash: ${isHash}`);
    });

    await pool.end();
  } catch (err) {
    console.error('ERROR al listar cuentas:', err.message);
    process.exit(1);
  }
})();
