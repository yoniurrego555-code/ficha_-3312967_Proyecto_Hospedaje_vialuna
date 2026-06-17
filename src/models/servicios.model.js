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
    (NombreServicio, Descripcion, Duracion, CantidadMaximaPersonas, Costo, Estado, EdadMinima, EdadMaxima, ImagenServicio, ImagenUrl)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.NombreServicio,
      data.Descripcion,
      data.Duracion,
      data.CantidadMaximaPersonas,
      data.Costo,
      data.Estado,
      data.EdadMinima || null,
      data.EdadMaxima || null,
      data.ImagenServicio || null,
      data.ImagenUrl || null
    ]
  )
  .then(([result]) => result);
};

const actualizar = (id, data) => {
  let fieldsToUpdate = [
    "NombreServicio = ?", "Descripcion = ?", "Duracion = ?", 
    "CantidadMaximaPersonas = ?", "Costo = ?", "Estado = ?",
    "EdadMinima = ?", "EdadMaxima = ?"
  ];
  
  let queryParams = [
    data.NombreServicio,
    data.Descripcion,
    data.Duracion,
    data.CantidadMaximaPersonas,
    data.Costo,
    data.Estado,
    data.EdadMinima || null,
    data.EdadMaxima || null
  ];

  if (data.ImagenUrl !== undefined && data.ImagenUrl !== null) {
    fieldsToUpdate.push("ImagenUrl = ?");
    queryParams.push(data.ImagenUrl);
  }

  queryParams.push(id);

  return db.query(
    `UPDATE servicios SET ${fieldsToUpdate.join(", ")} WHERE IDServicio = ?`,
    queryParams
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