const db = require("../config/db");

const obtener = () => {
  return db.query(`
    SELECT
      p.*,
        h.NombreHabitacion AS HabitacionIncluidaNombre,
        h.Descripcion AS HabitacionIncluidaDescripcion,
        h.Costo AS HabitacionIncluidaCosto,
        CASE h.NombreHabitacion
          WHEN 'Suite' THEN 3
          WHEN 'Doble' THEN 2
          WHEN 'Sencilla' THEN 1
          WHEN 'Familiar Deluxe' THEN 5
          ELSE 2
        END AS HabitacionIncluidaCapacidad,
        CASE h.NombreHabitacion
          WHEN 'Suite' THEN 'suite-ejecutiva.svg'
          WHEN 'Doble' THEN 'doble-confort.svg'
          WHEN 'Sencilla' THEN 'sencilla-serena.svg'
          WHEN 'Familiar Deluxe' THEN 'familiar-deluxe.svg'
          ELSE 'suite-ejecutiva.svg'
        END AS HabitacionIncluidaImagen,
      s.NombreServicio AS ServicioIncluidoNombre,
      s.Descripcion AS ServicioIncluidoDescripcion
    FROM paquetes p
    LEFT JOIN habitacion h
      ON h.IDHabitacion = p.IDHabitacion
    LEFT JOIN servicios s
      ON s.IDServicio = p.IDServicio
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
        CASE h.NombreHabitacion
          WHEN 'Suite' THEN 3
          WHEN 'Doble' THEN 2
          WHEN 'Sencilla' THEN 1
          WHEN 'Familiar Deluxe' THEN 5
          ELSE 2
        END AS HabitacionIncluidaCapacidad,
        CASE h.NombreHabitacion
          WHEN 'Suite' THEN 'suite-ejecutiva.svg'
          WHEN 'Doble' THEN 'doble-confort.svg'
          WHEN 'Sencilla' THEN 'sencilla-serena.svg'
          WHEN 'Familiar Deluxe' THEN 'familiar-deluxe.svg'
          ELSE 'suite-ejecutiva.svg'
        END AS HabitacionIncluidaImagen
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
      "SELECT IDServicio, NombreServicio, Costo FROM servicios WHERE IDServicio = ?",
      [paquete.IDServicio]
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
    (NombrePaquete, ImagenPaquete, Descripcion, IDHabitacion, IDServicio, Precio, Estado)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.NombrePaquete,
      data.ImagenPaquete,
      data.Descripcion,
      data.IDHabitacion,
      data.IDServicio,
      data.Precio,
      data.Estado
    ]
  ).then(([result]) => result);
};

// 🔹 Actualizar
const actualizar = (id, data) => {
  return db.query(
    `UPDATE paquetes SET 
    NombrePaquete = ?, ImagenPaquete = ?, Descripcion = ?, IDHabitacion = ?, IDServicio = ?, Precio = ?, Estado = ?
    WHERE IDPaquete = ?`,
    [
      data.NombrePaquete,
      data.ImagenPaquete,
      data.Descripcion,
      data.IDHabitacion,
      data.IDServicio,
      data.Precio,
      data.Estado,
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

// 🔥 EXPORTAR (ESTO ES LO QUE TE FALTABA)
module.exports = {
  obtener,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};
