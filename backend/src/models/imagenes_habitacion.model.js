const db = require('../config/db');

const listarPorHabitacion = (habitacionId) => {
  return db.query(
    'SELECT id, habitacion_id, url_imagen, fecha_creacion FROM imagenes_habitacion WHERE habitacion_id = ? ORDER BY fecha_creacion ASC',
    [habitacionId]
  ).then(([rows]) => rows);
};

const crear = (habitacionId, url) => {
  return db.query(
    'INSERT INTO imagenes_habitacion (habitacion_id, url_imagen) VALUES (?, ?)',
    [habitacionId, url]
  ).then(([result]) => ({ insertId: result.insertId }));
};

const eliminar = (id) => {
  return db.query('DELETE FROM imagenes_habitacion WHERE id = ?', [id]).then(([result]) => result);
};

module.exports = {
  listarPorHabitacion,
  crear,
  eliminar
};
