const db = require("../config/db");

// 🔹 Obtener todos
const obtener = () => {
  return db.query("SELECT * FROM detalledereservapaquetes")
    .then(([rows]) => rows);
};

// 🔹 Obtener por ID
const obtenerPorId = (id) => {
  return db.query(
    "SELECT * FROM detalledereservapaquetes WHERE id_detalle = ?",
    [id]
  )
  .then(([rows]) => rows[0]);
};

// 🔹 Crear
const crear = (data) => {
  return db.query(
    `INSERT INTO detalledereservapaquetes 
    (sub_total, id_reserva, cantidad, IDPaquete)
    VALUES (?, ?, ?, ?)`,
    [
      data.sub_total,
      data.id_reserva,
      data.cantidad,
      data.IDPaquete
    ]
  )
  .then(([result]) => result);
};

// 🔹 Actualizar
const actualizar = (id, data) => {
  return db.query(
    `UPDATE detalledereservapaquetes SET 
    sub_total = ?, 
    id_reserva = ?, 
    cantidad = ?, 
    IDPaquete = ?
    WHERE id_detalle = ?`,
    [
      data.sub_total,
      data.id_reserva,
      data.cantidad,
      data.IDPaquete,
      id
    ]
  )
  .then(([result]) => result);
};

// 🔹 Eliminar
const eliminar = (id) => {
  return db.query(
    "DELETE FROM detalledereservapaquetes WHERE id_detalle = ?",
    [id]
  )
  .then(([result]) => result);
};

module.exports = {
  obtener,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};