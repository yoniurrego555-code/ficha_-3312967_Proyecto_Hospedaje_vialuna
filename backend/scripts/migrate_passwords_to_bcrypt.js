require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

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

    // Usuarios table
    console.log('\nComprobando tabla `usuarios`...');
    const [usuarios] = await pool.query("SELECT IDUsuario, Email, COALESCE(Password, Contrasena, '') AS pass FROM usuarios");
    console.log(`Encontrados ${usuarios.length} registros en usuarios.`);

    for (const u of usuarios) {
      const pass = String(u.pass || '');
      const isHash = /^\$2[aby]\$/.test(pass);
      if (!pass) continue;
      if (!isHash) {
        const newHash = await bcrypt.hash(pass, Number(process.env.BCRYPT_ROUNDS || 10));
        // Intentar actualizar columna Password o Contrasena
        try {
          await pool.query("UPDATE usuarios SET Password = ? WHERE IDUsuario = ?", [newHash, u.IDUsuario]);
          console.log(`Usuario ${u.Email} (ID ${u.IDUsuario}): contraseña migrada a bcrypt (campo Password).`);
        } catch (e) {
          try {
            await pool.query("UPDATE usuarios SET Contrasena = ? WHERE IDUsuario = ?", [newHash, u.IDUsuario]);
            console.log(`Usuario ${u.Email} (ID ${u.IDUsuario}): contraseña migrada a bcrypt (campo Contrasena).`);
          } catch (err) {
            console.error(`No se pudo actualizar usuario ID ${u.IDUsuario}:`, err.message);
          }
        }
      }
    }

    // Clientes table
    console.log('\nComprobando tabla `clientes`...');
    const [clientes] = await pool.query("SELECT NroDocumento, Email, COALESCE(Contrasena, '') AS pass FROM clientes");
    console.log(`Encontrados ${clientes.length} registros en clientes.`);

    for (const c of clientes) {
      const pass = String(c.pass || '');
      const isHash = /^\$2[aby]\$/.test(pass);
      if (!pass) continue;
      if (!isHash) {
        const newHash = await bcrypt.hash(pass, Number(process.env.BCRYPT_ROUNDS || 10));
        try {
          await pool.query("UPDATE clientes SET Contrasena = ? WHERE NroDocumento = ?", [newHash, c.NroDocumento]);
          console.log(`Cliente ${c.Email} (NroDocumento ${c.NroDocumento}): contraseña migrada a bcrypt.`);
        } catch (err) {
          console.error(`No se pudo actualizar cliente ${c.Email}:`, err.message);
        }
      }
    }

    await pool.end();
    console.log('\nMigración completada.');
  } catch (err) {
    console.error('ERROR durante la migración:', err.message);
    process.exit(1);
  }
})();
