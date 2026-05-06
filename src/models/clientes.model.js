const db = require("../config/db");

const obtener = () => {
  return db.query("SELECT * FROM clientes ORDER BY Nombre, Apellido")
    .then(([rows]) => rows);
};

const obtenerPorId = (id) => {
  return db.query(
    "SELECT * FROM clientes WHERE NroDocumento = ?",
    [id]
  )
    .then(([rows]) => rows[0]);
};

const obtenerPorCredenciales = ({ Email }) => {
  return db.query(
    `SELECT *
     FROM clientes
     WHERE LOWER(Email) = LOWER(?)
       AND Estado = 1
     LIMIT 1`,
    [Email]
  )
    .then(([rows]) => rows[0]);
};

const obtenerPorDocumentoOEmail = ({ NroDocumento, Email }) => {
  return db.query(
    `SELECT *
     FROM clientes
     WHERE NroDocumento = ?
        OR LOWER(Email) = LOWER(?)
     LIMIT 1`,
    [NroDocumento, Email]
  )
    .then(([rows]) => rows[0]);
};

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

const validarDocumentoUnico = async (documento) => {
  const [rows] = await db.query(
    "SELECT NroDocumento FROM clientes WHERE NroDocumento = ? LIMIT 1",
    [documento]
  );

  return rows.length === 0;
};

const crear = async (data) => {
  const emailUnico = await validarEmailUnico(data.Email);
  if (!emailUnico) {
    const error = new Error("El correo ya está registrado");
    error.code = "ER_DUP_ENTRY";
    error.status = 409;
    throw error;
  }

  const documentoUnico = await validarDocumentoUnico(data.NroDocumento);
  if (!documentoUnico) {
    const error = new Error("El documento ya está registrado");
    error.code = "ER_DUP_ENTRY";
    error.status = 409;
    throw error;
  }

  return db.query(
    `INSERT INTO clientes
      (NroDocumento, Nombre, Apellido, Direccion, Email, Telefono, Contrasena, Estado, IDRol)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.NroDocumento,
      data.Nombre,
      data.Apellido,
      data.Direccion,
      data.Email,
      data.Telefono,
      data.Contrasena ?? null,
      data.Estado,
      data.IDRol
    ]
  )
    .then(([result]) => result);
};

const actualizar = (id, data) => {
  return db.query(
    `UPDATE clientes SET
      Nombre = ?, Apellido = ?, Direccion = ?, Email = ?, Telefono = ?, Estado = ?, IDRol = ?
     WHERE NroDocumento = ?`,
    [
      data.Nombre,
      data.Apellido,
      data.Direccion,
      data.Email,
      data.Telefono,
      data.Estado,
      data.IDRol,
      id
    ]
  )
    .then(([result]) => result);
};

const eliminar = (id) => {
  return db.query(
    "DELETE FROM clientes WHERE NroDocumento = ?",
    [id]
  )
    .then(([result]) => result);
};

module.exports = {
  obtener,
  obtenerPorId,
  obtenerPorCredenciales,
  obtenerPorDocumentoOEmail,
  validarEmailUnico,
  validarDocumentoUnico,
  crear,
  actualizar,
  eliminar
};
