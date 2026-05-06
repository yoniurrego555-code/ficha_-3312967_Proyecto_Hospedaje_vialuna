const db = require("../config/db");

let userColumnsPromise = null;

function escapeIdentifier(name) {
  return `\`${String(name).replaceAll("`", "``")}\``;
}

function buildInsertQuery(tableName, data) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  const columns = entries.map(([key]) => escapeIdentifier(key)).join(", ");
  const placeholders = entries.map(() => "?").join(", ");

  return {
    sql: `INSERT INTO ${escapeIdentifier(tableName)} (${columns}) VALUES (${placeholders})`,
    values: entries.map(([, value]) => value)
  };
}

function buildUpdateQuery(tableName, data, whereColumn, whereValue) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  const assignments = entries.map(([key]) => `${escapeIdentifier(key)} = ?`).join(", ");

  return {
    sql: `UPDATE ${escapeIdentifier(tableName)} SET ${assignments} WHERE ${escapeIdentifier(whereColumn)} = ?`,
    values: [...entries.map(([, value]) => value), whereValue]
  };
}

async function getUserColumns() {
  if (!userColumnsPromise) {
    userColumnsPromise = db.query("SHOW COLUMNS FROM usuarios")
      .then(([rows]) => new Set(rows.map((row) => row.Field)))
      .catch((error) => {
        userColumnsPromise = null;
        throw error;
      });
  }

  return userColumnsPromise;
}

function getColumnName(columns, ...candidates) {
  return candidates.find((candidate) => columns.has(candidate)) || null;
}

async function buildSelect(whereClause = "", params = []) {
  const columns = await getUserColumns();
  const nameColumn = getColumnName(columns, "Nombre", "NombreUsuario");
  const usernameColumn = getColumnName(columns, "Username", "NombreUsuario");
  const passwordColumn = getColumnName(columns, "Password", "Contrasena");
  const estadoColumn = getColumnName(columns, "Estado");

  const selectFields = [
    "u.IDUsuario",
    nameColumn ? `u.${escapeIdentifier(nameColumn)} AS Nombre` : "'' AS Nombre",
    columns.has("Apellido") ? "u.Apellido" : "NULL AS Apellido",
    columns.has("Email") ? "u.Email" : "NULL AS Email",
    columns.has("Telefono") ? "u.Telefono" : "NULL AS Telefono",
    usernameColumn ? `u.${escapeIdentifier(usernameColumn)} AS Username` : "NULL AS Username",
    passwordColumn ? `u.${escapeIdentifier(passwordColumn)} AS Password` : "NULL AS Password",
    estadoColumn ? `u.${escapeIdentifier(estadoColumn)} AS Estado` : "1 AS Estado",
    columns.has("TipoDocumento") ? "u.TipoDocumento" : "NULL AS TipoDocumento",
    columns.has("NumeroDocumento") ? "u.NumeroDocumento" : "NULL AS NumeroDocumento",
    columns.has("Pais") ? "u.Pais" : "NULL AS Pais",
    columns.has("Direccion") ? "u.Direccion" : "NULL AS Direccion",
    columns.has("IDRol") ? "u.IDRol" : "NULL AS IDRol",
    "r.Nombre AS NombreRol"
  ];

  return {
    sql: `
      SELECT
        ${selectFields.join(",\n        ")}
      FROM usuarios u
      LEFT JOIN roles r ON r.IDRol = u.IDRol
      ${whereClause}
    `,
    params,
    selectFields,
    columns,
    passwordColumn,
    estadoColumn
  };
}

async function buildWritePayload(data) {
  const columns = await getUserColumns();
  const nameColumn = getColumnName(columns, "Nombre", "NombreUsuario");
  const usernameColumn = getColumnName(columns, "Username", "NombreUsuario");
  const passwordColumn = getColumnName(columns, "Password", "Contrasena");

  return {
    ...(nameColumn ? { [nameColumn]: data.Nombre || data.Username || null } : {}),
    Apellido: columns.has("Apellido") ? data.Apellido || null : undefined,
    Email: columns.has("Email") ? data.Email || null : undefined,
    Telefono: columns.has("Telefono") ? data.Telefono || null : undefined,
    ...(usernameColumn ? { [usernameColumn]: data.Username || data.Nombre || null } : {}),
    ...(passwordColumn ? { [passwordColumn]: data.Password || data.Contrasena || null } : {}),
    TipoDocumento: columns.has("TipoDocumento") ? data.TipoDocumento || null : undefined,
    NumeroDocumento: columns.has("NumeroDocumento") ? data.NumeroDocumento || null : undefined,
    Pais: columns.has("Pais") ? data.Pais || null : undefined,
    Direccion: columns.has("Direccion") ? data.Direccion || null : undefined,
    Estado: columns.has("Estado") ? Number(data.Estado ?? 1) : undefined,
    IDRol: columns.has("IDRol") ? data.IDRol : undefined
  };
}

const obtener = async () => {
  const query = await buildSelect("ORDER BY u.IDUsuario DESC");
  return db.query(query.sql, query.params).then(([rows]) => rows);
};

const obtenerPorId = async (id) => {
  const query = await buildSelect("WHERE u.IDUsuario = ?", [id]);
  return db.query(query.sql, query.params).then(([rows]) => rows[0]);
};

const obtenerPorEmail = async (email) => {
  const query = await buildSelect("WHERE LOWER(COALESCE(u.Email, '')) = LOWER(?) LIMIT 1", [email]);
  return db.query(query.sql, query.params).then(([rows]) => rows[0]);
};

const obtenerPorCredenciales = async (credenciales) => {
  const identificador = String(credenciales.Email || credenciales.Username || "").trim();
  const clave = String(credenciales.Password || credenciales.Contrasena || "").trim();
  const base = await buildSelect();

  if (!base.passwordColumn) {
    throw new Error("La tabla usuarios no tiene una columna de clave compatible.");
  }

  const usernameChecks = [
    "LOWER(COALESCE(u.Email, '')) = LOWER(?)"
  ];
  const usernameColumn = getColumnName(base.columns, "NombreUsuario", "Username");

  if (usernameColumn) {
    usernameChecks.push(`LOWER(COALESCE(u.${escapeIdentifier(usernameColumn)}, '')) = LOWER(?)`);
  }

  const whereParts = [
    `WHERE (${usernameChecks.join(" OR ")})`,
    `AND COALESCE(u.${escapeIdentifier(base.passwordColumn)}, '') = ?`
  ];

  if (base.estadoColumn) {
    whereParts.push(`AND COALESCE(u.${escapeIdentifier(base.estadoColumn)}, 1) = 1`);
  }

  whereParts.push("AND COALESCE(r.Estado, 1) = 1");
  whereParts.push("LIMIT 1");

  const params = usernameChecks.map(() => identificador);
  params.push(clave);

  return db.query(
    `
      SELECT
        ${base.selectFields.join(",\n        ")}
      FROM usuarios u
      LEFT JOIN roles r ON r.IDRol = u.IDRol
      ${whereParts.join("\n      ")}
    `,
    params
  ).then(([rows]) => rows[0]);
};

// 🔍 VALIDAR EMAIL DUPLICADO ANTES DE INSERTAR
const validarEmailUnico = async (email) => {
  const [clientesResult] = await db.query(
    "SELECT Email FROM clientes WHERE LOWER(Email) = LOWER(?) LIMIT 1",
    [email]
  );
  
  const [usuariosResult] = await db.query(
    "SELECT Email FROM usuarios WHERE LOWER(Email) = LOWER(?) LIMIT 1", 
    [email]
  );
  
  return clientesResult.length === 0 && usuariosResult.length === 0;
};

const crear = async (data) => {
  // 🔐 VALIDAR EMAIL DUPLICADO
  const emailUnico = await validarEmailUnico(data.Email);
  if (!emailUnico) {
    const error = new Error("El correo ya está registrado");
    error.code = "ER_DUP_ENTRY";
    error.status = 409;
    throw error;
  }

  const payload = await buildWritePayload(data);
  const query = buildInsertQuery("usuarios", payload);
  return db.query(query.sql, query.values).then(([result]) => result);
};

const actualizar = async (id, data) => {
  const payload = await buildWritePayload(data);
  const query = buildUpdateQuery("usuarios", payload, "IDUsuario", id);
  return db.query(query.sql, query.values).then(([result]) => result);
};

const actualizarPassword = async (id, password) => {
  const columns = await getUserColumns();
  const passwordColumn = getColumnName(columns, "Password", "Contrasena");

  if (!passwordColumn) {
    throw new Error("La tabla usuarios no tiene una columna de clave compatible.");
  }

  return db.query(
    `UPDATE usuarios SET ${escapeIdentifier(passwordColumn)} = ? WHERE IDUsuario = ?`,
    [password, id]
  ).then(([result]) => result);
};

const eliminar = (id) => {
  return db.query(
    "DELETE FROM usuarios WHERE IDUsuario = ?",
    [id]
  ).then(([result]) => result);
};

module.exports = {
  obtener,
  obtenerPorId,
  obtenerPorEmail,
  obtenerPorCredenciales,
  validarEmailUnico,
  crear,
  actualizar,
  actualizarPassword,
  eliminar
};
