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
      ImagenUrl,
      Descripcion,
      Costo,
      CapacidadMaximaPersonas,
      cantidad_camas,
      tipo_camas,
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
    .then(async ([rows]) => {
      if (!rows || rows.length === 0) return rows;
      const ids = rows.map(r => r.IDHabitacion);
      let imgs = [];
      try {
        const [result] = await db.query(
          `SELECT id, habitacion_id, url_imagen FROM imagenes_habitacion WHERE habitacion_id IN (${ids.map(() => '?').join(',')}) ORDER BY fecha_creacion ASC`,
          ids
        );
        imgs = result;
      } catch (err) {
        console.warn("⚠️ Tabla imagenes_habitacion no encontrada u ocurrió un error. Usando ImagenUrl.");
      }

      const map = {};
      imgs.forEach(i => {
        map[i.habitacion_id] = map[i.habitacion_id] || [];
        map[i.habitacion_id].push(i.url_imagen);
      });

      return rows.map(r => ({
        ...r,
        // Aliases normalizados para compatibilidad con frontend
        id_habitacion: r.IDHabitacion,
        IDHabitacion: r.IDHabitacion,
        nombre: r.NombreHabitacion,
        NombreHabitacion: r.NombreHabitacion,
        precio: Number(r.Costo || 0),
        costo: Number(r.Costo || 0),
        Costo: Number(r.Costo || 0),
        capacidad: r.CapacidadMaximaPersonas,
        imagenes: map[r.IDHabitacion] || (r.ImagenUrl ? [r.ImagenUrl] : [])
      }));
    });
};

const obtenerPorId = (id) => {
  return db.query(
    `SELECT
      IDHabitacion,
      NombreHabitacion,
      ImagenUrl,
      Descripcion,
      Costo,
      CapacidadMaximaPersonas,
      cantidad_camas,
      tipo_camas,
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
  .then(async ([rows]) => {
    const row = rows[0];
    if (!row) return null;
    let imgs = [];
    try {
      const [result] = await db.query(
        `SELECT url_imagen FROM imagenes_habitacion WHERE habitacion_id = ? ORDER BY fecha_creacion ASC`,
        [id]
      );
      imgs = result;
    } catch (err) {
      console.warn("⚠️ Tabla imagenes_habitacion no encontrada u ocurrió un error. Usando ImagenUrl.");
    }

    return {
      ...row,
      imagenes: imgs.map(i => i.url_imagen).length ? imgs.map(i => i.url_imagen) : (row.ImagenUrl ? [row.ImagenUrl] : [])
    };
  });
};

const crear = (data) => {
  return db.query(
    `INSERT INTO habitacion
    (NombreHabitacion, Descripcion, Costo, CapacidadMaximaPersonas, Estado, cantidad_camas, tipo_camas, ImagenUrl)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.NombreHabitacion,
      data.Descripcion,
      data.Costo,
      normalizeCapacidad(data),
      normalizeEstado(data.Estado),
      data.cantidad_camas || null,
      data.tipo_camas || null,
      data.ImagenUrl || null
    ]
  )
  .then(([result]) => result);
};

const actualizar = (id, data) => {
  return db.query(
    `UPDATE habitacion SET 
    NombreHabitacion = ?, Descripcion = ?, Costo = ?, CapacidadMaximaPersonas = ?, Estado = ?,
    cantidad_camas = ?, tipo_camas = ?, ImagenUrl = ?
    WHERE IDHabitacion = ?`,
    [
      data.NombreHabitacion,
      data.Descripcion,
      data.Costo,
      normalizeCapacidad(data),
      normalizeEstado(data.Estado),
      data.cantidad_camas || null,
      data.tipo_camas || null,
      data.ImagenUrl || null,
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
