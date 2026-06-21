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
const emailService = require("./email.service");

exports.crear = async (data) => {
  const reserva = await model.crear(data);
  
  // Enviar correos de confirmación en segundo plano sin interrumpir la respuesta
  emailService.enviarConfirmacionReserva(reserva).catch((error) => {
    console.error("Error al enviar correos de reserva:", error.message || error);
  });
  
  return reserva;
};
exports.actualizar = async (id, data) => {
  const oldReserva = await model.obtenerPorId(id).catch(() => null);
  const result = await model.actualizar(id, data);
  
  if (data.id_estado_reserva && [2, 5, 7].includes(Number(data.id_estado_reserva)) && oldReserva && Number(oldReserva.id_estado_reserva) !== Number(data.id_estado_reserva)) {
    model.obtenerPorId(id).then(reserva => {
      if (reserva) {
        emailService.enviarCancelacionReserva(reserva, "Cambio de estado en el sistema (Cancelada, Rechazada o Expirada)").catch(err => console.error(err));
      }
    }).catch(err => console.error(err));
  }

  // Notificación de Pago (Si se asigna un método de pago, o si el estado cambia a Aceptada (4) o Activa (1))
  const newlyPaidState = data.id_estado_reserva && [1, 4].includes(Number(data.id_estado_reserva)) && oldReserva && ![1, 4].includes(Number(oldReserva.id_estado_reserva));
  const newPaymentMethod = data.id_metodo_pago && oldReserva && !oldReserva.id_metodo_pago;

  if (newlyPaidState || newPaymentMethod) {
    model.obtenerPorId(id).then(reserva => {
      if (reserva) {
        emailService.enviarConfirmacionPago(reserva).catch(err => console.error(err));
      }
    }).catch(err => console.error(err));
  }

  return result;
};

exports.eliminar = async (id, motivo) => {
  const result = await model.eliminar(id, motivo);
  if (result.affectedRows > 0) {
    model.obtenerPorId(id).then(reserva => {
      if (reserva) {
        emailService.enviarCancelacionReserva(reserva, motivo || "Cancelada por el usuario").catch(err => console.error(err));
      }
    }).catch(err => console.error(err));
  }
  return result;
};
