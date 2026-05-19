const db = require("../config/db");

function normalizeEstado(value) {
  const map = {
    disponible: 1,
    reservada: 2,
    ocupada: 3,
    mantenimiento: 4,
    activo: 1,
    inactivo: 0,
    '1': 1,
    '0': 0
  };

  if (value == null) {
    return 1;
  }

  const normalized = String(value).trim().toLowerCase();
  const parsed = Number(normalized);

  if (!Number.isNaN(parsed) && normalized !== '') {
    return parsed;
  }

  return map[normalized] ?? 1;
}

function normalizeCapacidad(data) {
  const capacidadValue = data.CapacidadMaximaPersonas ?? data.capacidad ?? data.capacidadMaximaPersonas ?? data.Capacidad;
  const parsed = Number(capacidadValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

const obtener = () => {
  return db.query(
    `SELECT
      IDHabitacion,
      NombreHabitacion,
      ImagenHabitacion,
      ImagenUrl,
      Descripcion,
      Costo,
      CapacidadMaximaPersonas,
      Estado,
      CASE Estado
        WHEN 1 THEN 'disponible'
        WHEN 2 THEN 'reservada'
        WHEN 3 THEN 'ocupada'
        WHEN 4 THEN 'mantenimiento'
        ELSE 'desconocido'
      END AS estado
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
      ImagenUrl,
      Descripcion,
      Costo,
      CapacidadMaximaPersonas,
      Estado,
      CASE Estado
        WHEN 1 THEN 'disponible'
        WHEN 2 THEN 'reservada'
        WHEN 3 THEN 'ocupada'
        WHEN 4 THEN 'mantenimiento'
        ELSE 'desconocido'
      END AS estado
    FROM habitacion
    WHERE IDHabitacion = ?`,
    [id]
  )
  .then(([rows]) => rows[0]);
};

const crear = (data) => {
  return db.query(
    `INSERT INTO habitacion
    (NombreHabitacion, ImagenHabitacion, Descripcion, Costo, CapacidadMaximaPersonas, Estado)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.NombreHabitacion,
      data.ImagenHabitacion || null,
      data.Descripcion,
      data.Costo,
      normalizeCapacidad(data),
      normalizeEstado(data.Estado)
    ]
  )
  .then(([result]) => result);
};

const actualizar = (id, data) => {
  return db.query(
    `UPDATE habitacion SET 
    NombreHabitacion = ?, ImagenHabitacion = ?, Descripcion = ?, Costo = ?, CapacidadMaximaPersonas = ?, Estado = ?
    WHERE IDHabitacion = ?`,
    [
      data.NombreHabitacion,
      data.ImagenHabitacion || null,
      data.Descripcion,
      data.Costo,
      normalizeCapacidad(data),
      normalizeEstado(data.Estado),
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
