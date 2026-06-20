require('dotenv').config();
const mysql = require('mysql2/promise');

const EMAIL = process.env.TEST_EMAIL || process.argv[2] || 'yoniurrego444@gmail.com';
const NEW_PASS = process.env.TEST_PASS || process.argv[3] || 'Test1234!';

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

    console.log(`Conectando a DB en ${process.env.DB_HOST}:${process.env.DB_PORT}`);

    // Intentar actualizar en usuarios
    const [userCols] = await pool.query('SHOW COLUMNS FROM usuarios');
    const userColNames = userCols.map(r => r.Field);
    const passCol = userColNames.find(c => ['Password','Contrasena','PasswordHash','pass'].includes(c));

    let updated = false;

    if (passCol) {
      const [rows] = await pool.query(`SELECT IDUsuario FROM usuarios WHERE LOWER(COALESCE(Email,'')) = LOWER(?) LIMIT 1`, [EMAIL]);
      if (rows.length > 0) {
        const id = rows[0].IDUsuario;
        const sql = `UPDATE usuarios SET ${passCol} = ? WHERE IDUsuario = ?`;
        await pool.query(sql, [NEW_PASS, id]);
        console.log(`Actualizada contraseña en usuarios (ID ${id}), columna ${passCol}`);
        updated = true;
      }
    }

    if (!updated) {
      // Intentar clientes
      const [rows] = await pool.query(`SELECT NroDocumento FROM clientes WHERE LOWER(COALESCE(Email,'')) = LOWER(?) LIMIT 1`, [EMAIL]);
      if (rows.length > 0) {
        const id = rows[0].NroDocumento;
        await pool.query(`UPDATE clientes SET Contrasena = ? WHERE NroDocumento = ?`, [NEW_PASS, id]);
        console.log(`Actualizada contraseña en clientes (NroDocumento ${id})`);
        updated = true;
      }
    }

    if (!updated) {
      console.log('No se encontró la cuenta con ese email en usuarios ni clientes.');
    }

    await pool.end();
  } catch (err) {
    console.error('ERROR al actualizar contraseña:', err.message);
    process.exit(1);
  }
})();
