const model = require("../models/usuarios.model");

function buildError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

exports.listar = () => model.obtener();
exports.obtener = (id) => model.obtenerPorId(id);
exports.obtenerPorEmail = (email) => model.obtenerPorEmail(email);
exports.login = (credenciales) => model.obtenerPorCredenciales(credenciales);
exports.crear = (data) => model.crear(data);
exports.actualizar = (id, data) => model.actualizar(id, data);
exports.actualizarPassword = async (id, password) => {
  const clave = String(password || "").trim();

  if (clave.length < 6) {
    throw buildError("La nueva clave debe tener al menos 6 caracteres.", 400);
  }

  return model.actualizarPassword(id, clave);
};
exports.eliminar = (id) => model.eliminar(id);
