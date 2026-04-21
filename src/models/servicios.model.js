const db = require("../config/db");

const obtener = () => {
  return db.query("SELECT * FROM servicios")
    .then(([rows]) => rows);
};

const obtenerPorId = (id) => {
  return db.query(
    "SELECT * FROM servicios WHERE IDServicio = ?",
    [id]
  )
  .then(([rows]) => rows[0]);
};

const crear = (data) => {
  return db.query(
    `INSERT INTO servicios 
    (NombreServicio, Descripcion, Duracion, CantidadMaximaPersonas, Costo, Estado)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.NombreServicio,
      data.Descripcion,
      data.Duracion,
      data.CantidadMaximaPersonas,
      data.Costo,
      data.Estado
    ]
  )
  .then(([result]) => result);
};

const actualizar = (id, data) => {
  return db.query(
    `UPDATE servicios SET 
    NombreServicio = ?, Descripcion = ?, Duracion = ?, CantidadMaximaPersonas = ?, Costo = ?, Estado = ?
    WHERE IDServicio = ?`,
    [
      data.NombreServicio,
      data.Descripcion,
      data.Duracion,
      data.CantidadMaximaPersonas,
      data.Costo,
      data.Estado,
      id
    ]
  )
  .then(([result]) => result);
};

const eliminar = (id) => {
  return db.query(
    "DELETE FROM servicios WHERE IDServicio = ?",
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