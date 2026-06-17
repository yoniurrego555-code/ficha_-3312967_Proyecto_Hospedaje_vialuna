const db = require("../config/db");

const obtener = () => {
  return db.query(`
    SELECT
      p.*,
        MAX(h.NombreHabitacion) AS HabitacionIncluidaNombre,
        MAX(h.Descripcion) AS HabitacionIncluidaDescripcion,
        MAX(h.Costo) AS HabitacionIncluidaCosto,
        MAX(h.CapacidadMaximaPersonas) AS HabitacionIncluidaCapacidad,
        MAX(h.ImagenUrl) AS HabitacionIncluidaImagen,
      GROUP_CONCAT(s.NombreServicio SEPARATOR ', ') AS ServiciosIncluidosNombres,
      GROUP_CONCAT(s.Descripcion SEPARATOR ' | ') AS ServiciosIncluidosDescripciones
    FROM paquetes p
    LEFT JOIN habitacion h
      ON h.IDHabitacion = p.IDHabitacion
    LEFT JOIN servicios s
      ON FIND_IN_SET(s.IDServicio, p.IDServicio) > 0
    GROUP BY p.IDPaquete
    ORDER BY p.NombrePaquete
  `)
    .then(([rows]) => rows);
};

// 🔹 Obtener por ID
const obtenerPorId = (id) => {
  return db.query(
    `
      SELECT
        p.*,
        h.NombreHabitacion AS HabitacionIncluidaNombre,
        h.Descripcion AS HabitacionIncluidaDescripcion,
        h.Costo AS HabitacionIncluidaCosto,
        h.CapacidadMaximaPersonas AS HabitacionIncluidaCapacidad,
        h.ImagenUrl AS HabitacionIncluidaImagen
      FROM paquetes p
      LEFT JOIN habitacion h
        ON h.IDHabitacion = p.IDHabitacion
      WHERE p.IDPaquete = ?
    `,
    [id]
  )
  .then(([rows]) => {
    const paquete = rows[0];
    if (!paquete) return null;

    return db.query(
      "SELECT IDServicio, NombreServicio, Costo FROM servicios WHERE FIND_IN_SET(IDServicio, ?) > 0",
      [paquete.IDServicio || ""]
    )
    .then(([servicios]) => {
      return {
        ...paquete,
        habitacion: paquete.IDHabitacion
          ? {
              id: paquete.IDHabitacion,
              nombre: paquete.HabitacionIncluidaNombre,
              descripcion: paquete.HabitacionIncluidaDescripcion,
              costo: Number(paquete.HabitacionIncluidaCosto || 0),
              capacidad: Number(paquete.HabitacionIncluidaCapacidad || 0),
              imagen: paquete.HabitacionIncluidaImagen || ""
            }
          : null,
        servicios: servicios || []
      };
    });
  });
};

// 🔹 Crear
const crear = (data) => {
  return db.query(
    `INSERT INTO paquetes 
    (NombrePaquete, ImagenPaquete, Descripcion, IDHabitacion, IDServicio, Precio, Estado, ImagenUrl)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.NombrePaquete,
      data.ImagenPaquete || null,
      data.Descripcion,
      data.IDHabitacion || null,
      data.IDServicio || null,
      data.Precio,
      data.Estado,
      data.ImagenUrl || null
    ]
  ).then(([result]) => result);
};

// 🔹 Actualizar
const actualizar = (id, data) => {
  return db.query(
    `UPDATE paquetes SET 
    NombrePaquete = ?, ImagenPaquete = ?, Descripcion = ?, IDHabitacion = ?, IDServicio = ?, Precio = ?, Estado = ?, ImagenUrl = ?
    WHERE IDPaquete = ?`,
    [
      data.NombrePaquete,
      data.ImagenPaquete || null,
      data.Descripcion,
      data.IDHabitacion || null,
      data.IDServicio || null,
      data.Precio,
      data.Estado,
      data.ImagenUrl || null,
      id
    ]
  ).then(([result]) => result);
};

// 🔹 Eliminar
const eliminar = (id) => {
  return db.query(
    "DELETE FROM paquetes WHERE IDPaquete = ?",
    [id]
  ).then(([result]) => result);
};

// 🔥 EXPORTAR
module.exports = {
  obtener,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};
