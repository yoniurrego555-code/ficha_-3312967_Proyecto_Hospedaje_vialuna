const db = require("../config/db");

// 🔹 Obtener todos
const obtener = () => {
  return db.query("SELECT * FROM metodopago")
    .then(([rows]) => rows);
};

// 🔹 Obtener por ID
const obtenerPorId = (id) => {
  return db.query(
    "SELECT * FROM metodopago WHERE IdMetodoPago = ?",
    [id]
  )
  .then(([rows]) => rows[0]);
};

// 🔹 Crear
const crear = (data) => {
  return db.query(
    `INSERT INTO metodopago (NomMetodoPago)
     VALUES (?)`,
    [data.NomMetodoPago]
  )
  .then(([result]) => result);
};

// 🔹 Actualizar
const actualizar = (id, data) => {
  return db.query(
    `UPDATE metodopago SET 
     NomMetodoPago = ?
     WHERE IdMetodoPago = ?`,
    [
      data.NomMetodoPago,
      id
    ]
  )
  .then(([result]) => result);
};

// 🔹 Eliminar
const eliminar = (id) => {
  return db.query(
    "DELETE FROM metodopago WHERE IdMetodoPago = ?",
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