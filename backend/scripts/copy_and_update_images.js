require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  try {
    const projectRoot = path.resolve(__dirname, '..');
    const frontendRooms = path.resolve(projectRoot, '..', 'frontend', 'assets', 'images', 'rooms');
    const frontendService = path.resolve(projectRoot, '..', 'frontend', 'assets', 'images', 'service');
    const uploadsDir = path.resolve(projectRoot, 'public', 'uploads');

    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT) || 3306,
      connectionLimit: 5
    });

    const copyFiles = async (srcDir, prefix = '') => {
      if (!fs.existsSync(srcDir)) return [];
      const files = fs.readdirSync(srcDir).filter(f => /\.(png|jpe?g|webp|svg)$/i.test(f));
      for (const f of files) {
        const src = path.join(srcDir, f);
        const destName = `${prefix}${f}`;
        const dest = path.join(uploadsDir, destName);
        fs.copyFileSync(src, dest);
        console.log('Copied', src, '->', dest);
      }
      return files.map(f => `${prefix}${f}`);
    };

    const roomFiles = await copyFiles(frontendRooms, 'room_');
    const serviceFiles = await copyFiles(frontendService, 'service_');

    // Update imagenes_habitacion rows pointing to frontend assets
    for (const f of roomFiles) {
      const oldPaths = [
        `/frontend/assets/images/rooms/${f.replace(/^room_/, '')}`,
        `frontend/assets/images/rooms/${f.replace(/^room_/, '')}`,
        `assets/images/rooms/${f.replace(/^room_/, '')}`
      ];
      const newUrl = `/uploads/${f}`;
      for (const old of oldPaths) {
        const [res] = await pool.query('UPDATE imagenes_habitacion SET url_imagen = ? WHERE url_imagen = ?', [newUrl, old]);
        if (res.affectedRows) console.log(`Updated imagenes_habitacion: ${old} -> ${newUrl}`);
      }
    }

    // Optionally update habitacion.ImagenUrl if it referenced frontend assets
    for (const f of roomFiles) {
      const oldPaths = [
        `/frontend/assets/images/rooms/${f.replace(/^room_/, '')}`,
        `frontend/assets/images/rooms/${f.replace(/^room_/, '')}`,
        `assets/images/rooms/${f.replace(/^room_/, '')}`
      ];
      const newUrl = `/uploads/${f}`;
      for (const old of oldPaths) {
        const [res] = await pool.query('UPDATE habitacion SET ImagenUrl = ? WHERE ImagenUrl = ?', [newUrl, old]);
        if (res.affectedRows) console.log(`Updated habitacion.ImagenUrl: ${old} -> ${newUrl}`);
      }
    }

    await pool.end();
    console.log('Done.');
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
