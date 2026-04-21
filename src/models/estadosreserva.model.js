const db = require("../config/db");

// 🔹 Obtener todos
const obtener = () => {
  return db.query("SELECT * FROM estadosreserva")
    .then(([rows]) => rows);
};

// 🔹 Obtener por ID
const obtenerPorId = (id) => {
  return db.query(
    "SELECT * FROM estadosreserva WHERE IdEstadoReserva = ?",
    [id]
  )
  .then(([rows]) => rows[0]);
};

// 🔹 Crear
const crear = (data) => {
  return db.query(
    `INSERT INTO estadosreserva (NombreEstadoReserva)
     VALUES (?)`,
    [data.NombreEstadoReserva]
  )
  .then(([result]) => result);
};

// 🔹 Actualizar
const actualizar = (id, data) => {
  return db.query(
    `UPDATE estadosreserva SET 
     NombreEstadoReserva = ?
     WHERE IdEstadoReserva = ?`,
    [
      data.NombreEstadoReserva,
      id
    ]
  )
  .then(([result]) => result);
};

// 🔹 Eliminar
const eliminar = (id) => {
  return db.query(
    "DELETE FROM estadosreserva WHERE IdEstadoReserva = ?",
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