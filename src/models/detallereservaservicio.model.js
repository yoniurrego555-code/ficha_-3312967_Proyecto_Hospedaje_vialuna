const db = require("../config/db");

// 🔹 Obtener todos
const obtener = () => {
  return db.query("SELECT * FROM detallereservaservicio")
    .then(([rows]) => rows);
};

// 🔹 Obtener por ID
const obtenerPorId = (id) => {
  return db.query(
    "SELECT * FROM detallereservaservicio WHERE IDDetalleReservaServicio = ?",
    [id]
  )
  .then(([rows]) => rows[0]);
};

// 🔹 Crear
const crear = (data) => {
  return db.query(
    `INSERT INTO detallereservaservicio 
    (IDReserva, Cantidad, Precio, Estado, IDServicio, NombreServicio)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.IDReserva,
      data.Cantidad,
      data.Precio,
      data.Estado,
      data.IDServicio,
      data.NombreServicio
    ]
  )
  .then(([result]) => result);
};

// 🔹 Actualizar
const actualizar = (id, data) => {
  return db.query(
    `UPDATE detallereservaservicio SET 
    IDReserva = ?, 
    Cantidad = ?, 
    Precio = ?, 
    Estado = ?, 
    IDServicio = ?, 
    NombreServicio = ?
    WHERE IDDetalleReservaServicio = ?`,
    [
      data.IDReserva,
      data.Cantidad,
      data.Precio,
      data.Estado,
      data.IDServicio,
      data.NombreServicio,
      id
    ]
  )
  .then(([result]) => result);
};

// 🔹 Eliminar
const eliminar = (id) => {
  return db.query(
    "DELETE FROM detallereservaservicio WHERE IDDetalleReservaServicio = ?",
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