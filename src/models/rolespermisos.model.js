const db = require("../config/db");

// 🔹 Obtener todos
const obtener = () => {
  return db.query(
    `SELECT
      rp.IDRolPermiso,
      rp.IDRol,
      r.Nombre AS NombreRol,
      r.Descripcion AS DescripcionRol,
      r.Estado AS EstadoRol,
      rp.IDPermiso,
      p.NombrePermisos,
      p.Descripcion AS DescripcionPermiso,
      p.EstadoPermisos,
      p.IsActive
    FROM rolespermisos rp
    INNER JOIN roles r ON r.IDRol = rp.IDRol
    INNER JOIN permisos p ON p.IDPermiso = rp.IDPermiso
    ORDER BY rp.IDRolPermiso DESC`
  )
    .then(([rows]) => rows);
};

const obtenerPorId = (id) => {
  return db.query(
    `SELECT
      rp.IDRolPermiso,
      rp.IDRol,
      r.Nombre AS NombreRol,
      r.Descripcion AS DescripcionRol,
      r.Estado AS EstadoRol,
      rp.IDPermiso,
      p.NombrePermisos,
      p.Descripcion AS DescripcionPermiso,
      p.EstadoPermisos,
      p.IsActive
    FROM rolespermisos rp
    INNER JOIN roles r ON r.IDRol = rp.IDRol
    INNER JOIN permisos p ON p.IDPermiso = rp.IDPermiso
    WHERE rp.IDRolPermiso = ?`,
    [id]
  )
    .then(([rows]) => rows[0]);
};

// 🔹 Crear
const obtenerPorRelacion = (idRol, idPermiso, excluirId = null) => {
  const sql = excluirId
    ? "SELECT * FROM rolespermisos WHERE IDRol = ? AND IDPermiso = ? AND IDRolPermiso <> ? LIMIT 1"
    : "SELECT * FROM rolespermisos WHERE IDRol = ? AND IDPermiso = ? LIMIT 1";
  const params = excluirId ? [idRol, idPermiso, excluirId] : [idRol, idPermiso];

  return db.query(sql, params).then(([rows]) => rows[0]);
};

const crear = (data) => {
  return db.query(
    `INSERT INTO rolespermisos (IDRol, IDPermiso)
     VALUES (?, ?)`,
    [
      data.IDRol,
      data.IDPermiso
    ]
  )
  .then(([result]) => result);
};

const actualizar = (id, data) => {
  return db.query(
    `UPDATE rolespermisos
     SET IDRol = ?, IDPermiso = ?
     WHERE IDRolPermiso = ?`,
    [
      data.IDRol,
      data.IDPermiso,
      id
    ]
  )
    .then(([result]) => result);
};

// 🔹 Eliminar
const eliminar = (id) => {
  return db.query(
    "DELETE FROM rolespermisos WHERE IDRolPermiso = ?",
    [id]
  )
  .then(([result]) => result);
};

const sembrarPermisosBase = async () => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO roles (Nombre, Descripcion, Estado)
       SELECT ?, ?, ?
       WHERE NOT EXISTS (
         SELECT 1 FROM roles WHERE LOWER(Nombre) = LOWER(?)
       )`,
      ["Administrador", "Acceso total al sistema", 1, "Administrador"]
    );

    await connection.query(
      `INSERT INTO roles (Nombre, Descripcion, Estado)
       SELECT ?, ?, ?
       WHERE NOT EXISTS (
         SELECT 1 FROM roles WHERE LOWER(Nombre) = LOWER(?)
       )`,
      ["Cliente", "Acceso limitado a funciones de cliente", 1, "Cliente"]
    );

    const [roles] = await connection.query(
      "SELECT IDRol, Nombre FROM roles WHERE LOWER(Nombre) IN ('administrador', 'cliente')"
    );

    const rolesMap = Object.fromEntries(
      roles.map((rol) => [String(rol.Nombre).toLowerCase(), rol.IDRol])
    );

    const permisos = [
      ["Gestionar dashboard", "Visualizar y administrar el dashboard", ["administrador"]],
      ["Gestionar usuarios", "Crear, editar y eliminar usuarios", ["administrador"]],
      ["Gestionar roles", "Administrar roles del sistema", ["administrador"]],
      ["Gestionar permisos", "Administrar permisos y asignaciones", ["administrador"]],
      ["Gestionar reservas", "Crear, editar y cancelar reservas", ["administrador", "cliente"]],
      ["Consultar habitaciones", "Visualizar habitaciones disponibles", ["administrador", "cliente"]],
      ["Editar perfil cliente", "Actualizar datos del cliente", ["cliente"]]
    ];

    for (const [nombre, descripcion] of permisos) {
      await connection.query(
        `INSERT INTO permisos (NombrePermisos, EstadoPermisos, Descripcion, IsActive)
         SELECT ?, 'Activo', ?, 1
         WHERE NOT EXISTS (
           SELECT 1 FROM permisos WHERE LOWER(NombrePermisos) = LOWER(?)
         )`,
        [nombre, descripcion, nombre]
      );
    }

    const [permisosRows] = await connection.query(
      "SELECT IDPermiso, NombrePermisos FROM permisos"
    );

    const permisosMap = Object.fromEntries(
      permisosRows.map((permiso) => [String(permiso.NombrePermisos).toLowerCase(), permiso.IDPermiso])
    );

    for (const [nombre, , rolesPermitidos] of permisos) {
      for (const rolNombre of rolesPermitidos) {
        const idRol = rolesMap[rolNombre];
        const idPermiso = permisosMap[String(nombre).toLowerCase()];

        if (!idRol || !idPermiso) {
          continue;
        }

        await connection.query(
          `INSERT INTO rolespermisos (IDRol, IDPermiso)
           SELECT ?, ?
           WHERE NOT EXISTS (
             SELECT 1 FROM rolespermisos WHERE IDRol = ? AND IDPermiso = ?
           )`,
          [idRol, idPermiso, idRol, idPermiso]
        );
      }
    }

    await connection.commit();
    return { mensaje: "Permisos base creados correctamente" };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  obtener,
  obtenerPorId,
  obtenerPorRelacion,
  crear,
  actualizar,
  eliminar,
  sembrarPermisosBase
};
