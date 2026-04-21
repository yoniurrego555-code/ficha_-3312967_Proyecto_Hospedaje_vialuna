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

const obtenerPorCredenciales = ({ Email, NroDocumento }) => {
  return db.query(
    `SELECT *
     FROM clientes
     WHERE LOWER(Email) = LOWER(?)
       AND NroDocumento = ?
       AND Estado = 1
     LIMIT 1`,
    [Email, NroDocumento]
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

const crear = (data) => {
  return db.query(
    `INSERT INTO clientes 
    (NroDocumento, Nombre, Apellido, Direccion, Email, Telefono, Estado, IDRol)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.NroDocumento,
      data.Nombre,
      data.Apellido,
      data.Direccion,
      data.Email,
      data.Telefono,
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
  crear,
  actualizar,
  eliminar
};
