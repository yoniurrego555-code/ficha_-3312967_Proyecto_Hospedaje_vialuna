const db = require("../config/db");

const obtener = () => {
  return db.query(
    `SELECT
      IDHabitacion,
      NombreHabitacion,
      ImagenHabitacion,
      CASE NombreHabitacion
        WHEN 'Suite' THEN 'suite-ejecutiva.svg'
        WHEN 'Doble' THEN 'doble-confort.svg'
        WHEN 'Sencilla' THEN 'sencilla-serena.svg'
        WHEN 'Familiar Deluxe' THEN 'familiar-deluxe.svg'
        ELSE 'suite-ejecutiva.svg'
      END AS ImagenUrl,
      Descripcion,
      Costo,
      CASE NombreHabitacion
        WHEN 'Suite' THEN 3
        WHEN 'Doble' THEN 2
        WHEN 'Sencilla' THEN 1
        WHEN 'Familiar Deluxe' THEN 5
        ELSE 2
      END AS CapacidadMaximaPersonas,
      Estado
    FROM habitacion
    ORDER BY Costo DESC`
  )
    .then(([rows]) => rows);
};

const obtenerPorId = (id) => {
  return db.query(
    `SELECT
      IDHabitacion,
      NombreHabitacion,
      ImagenHabitacion,
      CASE NombreHabitacion
        WHEN 'Suite' THEN 'suite-ejecutiva.svg'
        WHEN 'Doble' THEN 'doble-confort.svg'
        WHEN 'Sencilla' THEN 'sencilla-serena.svg'
        WHEN 'Familiar Deluxe' THEN 'familiar-deluxe.svg'
        ELSE 'suite-ejecutiva.svg'
      END AS ImagenUrl,
      Descripcion,
      Costo,
      CASE NombreHabitacion
        WHEN 'Suite' THEN 3
        WHEN 'Doble' THEN 2
        WHEN 'Sencilla' THEN 1
        WHEN 'Familiar Deluxe' THEN 5
        ELSE 2
      END AS CapacidadMaximaPersonas,
      Estado
    FROM habitacion
    WHERE IDHabitacion = ?`,
    [id]
  )
  .then(([rows]) => rows[0]);
};

const crear = (data) => {
  return db.query(
    `INSERT INTO habitacion
    (NombreHabitacion, ImagenHabitacion, Descripcion, Costo, Estado)
    VALUES (?, ?, ?, ?, ?)`,
    [
      data.NombreHabitacion,
      data.ImagenHabitacion || null,
      data.Descripcion,
      data.Costo,
      data.Estado
    ]
  )
  .then(([result]) => result);
};

const actualizar = (id, data) => {
  return db.query(
    `UPDATE habitacion SET 
    NombreHabitacion = ?, ImagenHabitacion = ?, Descripcion = ?, Costo = ?, Estado = ?
    WHERE IDHabitacion = ?`,
    [
      data.NombreHabitacion,
      data.ImagenHabitacion || null,
      data.Descripcion,
      data.Costo,
      data.Estado,
      id
    ]
  )
  .then(([result]) => result);
};

const eliminar = (id) => {
  return db.query(
    "DELETE FROM habitacion WHERE IDHabitacion = ?",
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
