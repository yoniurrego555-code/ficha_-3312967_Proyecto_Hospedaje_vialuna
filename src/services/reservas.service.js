const model = require("../models/reservas.model");

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function matchesFilter(reserva, filters = {}) {
  const candidateValues = [
    reserva?.id_cliente,
    reserva?.nr_documento,
    reserva?.email,
    reserva?.correo,
    reserva?.cliente?.id,
    reserva?.cliente?.email,
    reserva?.cliente?.correo,
    reserva?.cliente?.nroDocumento,
    reserva?.cliente?.numeroDocumento
  ].map(normalizeValue);

  const emailFilter = normalizeValue(filters.email);
  const clientIdFilter = normalizeValue(filters.id_cliente);

  if (emailFilter && !candidateValues.includes(emailFilter)) {
    return false;
  }

  if (clientIdFilter && !candidateValues.includes(clientIdFilter)) {
    return false;
  }

  return true;
}

exports.listar = async (filters = {}) => {
  const reservas = await model.obtener();

  if (!filters?.email && !filters?.id_cliente) {
    return reservas;
  }

  return reservas.filter((reserva) => matchesFilter(reserva, filters));
};
exports.obtener = (id) => model.obtenerPorId(id);
exports.obtenerPorUsuario = (userId) => model.obtenerPorUsuario(userId);
exports.crear = (data) => model.crear(data);
exports.actualizar = (id, data) => model.actualizar(id, data);
exports.eliminar = (id) => model.eliminar(id);
