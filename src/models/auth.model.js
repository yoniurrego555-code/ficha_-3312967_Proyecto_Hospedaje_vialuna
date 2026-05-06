const db = require("../config/db");

let userColumnsPromise = null;

function buildError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function escapeIdentifier(name) {
  return `\`${String(name).replaceAll("`", "``")}\``;
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

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeCliente(cliente) {
  if (!cliente) {
    return null;
  }

  return {
    id: cliente.NroDocumento,
    nombre: [cliente.Nombre, cliente.Apellido].filter(Boolean).join(" ").trim() || cliente.Nombre || "",
    email: cliente.Email,
    rol: "cliente",
    IDRol: Number(cliente.IDRol || 2),
    passwordHash: cliente.Contrasena,
    source: "clientes",
    raw: cliente
  };
}

function normalizeUsuario(usuario) {
  if (!usuario) {
    return null;
  }

  return {
    id: usuario.IDUsuario,
    nombre: usuario.Username || usuario.NombreCompleto || usuario.Nombre || usuario.Email || "",
    email: usuario.Email,
    rol: "admin",
    IDRol: Number(usuario.IDRol || 1),
    passwordHash: usuario.PasswordHash,
    source: "usuarios",
    raw: usuario
  };
}

async function findClienteByEmail(email) {
  const normalized = normalizeEmail(email);

  if (!normalized) {
    return null;
  }

  const [rows] = await db.query(
    `SELECT NroDocumento, Nombre, Apellido, Email, Telefono, Direccion, Contrasena, Estado, IDRol
     FROM clientes
     WHERE LOWER(Email) = ?
     LIMIT 1`,
    [normalized]
  );

  return rows[0] || null;
}

async function findUsuarioByEmail(email) {
  const normalized = normalizeEmail(email);

  if (!normalized) {
    return null;
  }

  const columns = await getUserColumns();
  const nameColumn = getColumnName(columns, "Nombre", "NombreUsuario");
  const usernameColumn = getColumnName(columns, "Username", "NombreUsuario");
  const passwordColumn = getColumnName(columns, "Password", "Contrasena");
  const estadoColumn = getColumnName(columns, "Estado");

  if (!columns.has("Email")) {
    return null;
  }

  const fields = [
    "u.IDUsuario",
    nameColumn ? `u.${escapeIdentifier(nameColumn)} AS NombreBase` : "NULL AS NombreBase",
    columns.has("Apellido") ? "u.Apellido" : "NULL AS Apellido",
    "u.Email",
    usernameColumn ? `u.${escapeIdentifier(usernameColumn)} AS Username` : "NULL AS Username",
    passwordColumn ? `u.${escapeIdentifier(passwordColumn)} AS PasswordHash` : "NULL AS PasswordHash",
    columns.has("IDRol") ? "u.IDRol" : "1 AS IDRol",
    "r.Nombre AS NombreRol",
    estadoColumn ? `u.${escapeIdentifier(estadoColumn)} AS Estado` : "1 AS Estado"
  ];

  const [rows] = await db.query(
    `SELECT
       ${fields.join(",\n       ")}
     FROM usuarios u
     LEFT JOIN roles r ON r.IDRol = u.IDRol
     WHERE LOWER(u.Email) = ?
     LIMIT 1`,
    [normalized]
  );

  const usuario = rows[0];

  if (!usuario) {
    return null;
  }

  return {
    ...usuario,
    NombreCompleto: [usuario.NombreBase, usuario.Apellido].filter(Boolean).join(" ").trim()
  };
}

async function emailExists(email) {
  const normalized = normalizeEmail(email);

  const [rows] = await db.query(
    `SELECT Email
     FROM clientes
     WHERE LOWER(Email) = ?
     UNION
     SELECT Email
     FROM usuarios
     WHERE LOWER(Email) = ?
     LIMIT 1`,
    [normalized, normalized]
  );

  return rows.length > 0;
}

async function documentoExists(documento) {
  const [rows] = await db.query(
    "SELECT NroDocumento FROM clientes WHERE NroDocumento = ? LIMIT 1",
    [String(documento || "").trim()]
  );

  return rows.length > 0;
}

async function findAccountByEmail(email) {
  const usuario = normalizeUsuario(await findUsuarioByEmail(email));

  if (usuario && Number(usuario.raw.Estado || 0) === 1) {
    return usuario;
  }

  const cliente = normalizeCliente(await findClienteByEmail(email));

  if (cliente && Number(cliente.raw.Estado || 0) === 1) {
    return cliente;
  }

  return null;
}

async function createCliente(data) {
  const payload = {
    NroDocumento: String(data.NroDocumento || "").trim(),
    Nombre: String(data.Nombre || "").trim(),
    Apellido: String(data.Apellido || "").trim(),
    Direccion: String(data.Direccion || "").trim(),
    Email: normalizeEmail(data.Email),
    Telefono: String(data.Telefono || "").trim(),
    Contrasena: data.Contrasena,
    Estado: Number(data.Estado ?? 1),
    IDRol: Number(data.IDRol ?? 2)
  };

  const [result] = await db.query(
    `INSERT INTO clientes
      (NroDocumento, Nombre, Apellido, Direccion, Email, Telefono, Contrasena, Estado, IDRol)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.NroDocumento,
      payload.Nombre,
      payload.Apellido,
      payload.Direccion,
      payload.Email,
      payload.Telefono,
      payload.Contrasena,
      payload.Estado,
      payload.IDRol
    ]
  );

  return {
    insertId: result.insertId,
    account: normalizeCliente(await findClienteByEmail(payload.Email))
  };
}

async function updatePasswordByEmail(email, passwordHash) {
  const normalized = normalizeEmail(email);
  const cliente = await findClienteByEmail(normalized);

  if (cliente) {
    await db.query(
      "UPDATE clientes SET Contrasena = ? WHERE LOWER(Email) = ?",
      [passwordHash, normalized]
    );

    return normalizeCliente(await findClienteByEmail(normalized));
  }

  const usuario = await findUsuarioByEmail(normalized);

  if (!usuario) {
    throw buildError("No existe una cuenta registrada con ese correo.", 404);
  }

  const columns = await getUserColumns();
  const passwordColumn = getColumnName(columns, "Password", "Contrasena");

  if (!passwordColumn) {
    throw buildError("La tabla usuarios no tiene una columna de contraseña compatible.", 500);
  }

  await db.query(
    `UPDATE usuarios SET ${escapeIdentifier(passwordColumn)} = ? WHERE LOWER(Email) = ?`,
    [passwordHash, normalized]
  );

  return normalizeUsuario(await findUsuarioByEmail(normalized));
}

async function updatePasswordByAccount(account, passwordHash) {
  if (!account?.source || !account?.id) {
    throw buildError("No fue posible actualizar la contraseña de la cuenta.", 400);
  }

  if (account.source === "clientes") {
    await db.query(
      "UPDATE clientes SET Contrasena = ? WHERE NroDocumento = ?",
      [passwordHash, account.id]
    );

    return normalizeCliente(await findClienteByEmail(account.email));
  }

  const columns = await getUserColumns();
  const passwordColumn = getColumnName(columns, "Password", "Contrasena");

  if (!passwordColumn) {
    throw buildError("La tabla usuarios no tiene una columna de contraseña compatible.", 500);
  }

  await db.query(
    `UPDATE usuarios SET ${escapeIdentifier(passwordColumn)} = ? WHERE IDUsuario = ?`,
    [passwordHash, account.id]
  );

  return normalizeUsuario(await findUsuarioByEmail(account.email));
}

async function getClientesWithoutPassword() {
  const [rows] = await db.query(
    `SELECT NroDocumento, Email
     FROM clientes
     WHERE Contrasena IS NULL OR TRIM(Contrasena) = ''`
  );

  return rows;
}

async function getAllClientes() {
  const [rows] = await db.query(
    `SELECT NroDocumento
     FROM clientes`
  );

  return rows;
}

async function updateClientePassword(documento, passwordHash) {
  await db.query(
    "UPDATE clientes SET Contrasena = ? WHERE NroDocumento = ?",
    [passwordHash, documento]
  );
}

module.exports = {
  buildError,
  emailExists,
  documentoExists,
  findAccountByEmail,
  createCliente,
  updatePasswordByEmail,
  updatePasswordByAccount,
  getClientesWithoutPassword,
  getAllClientes,
  updateClientePassword
};
