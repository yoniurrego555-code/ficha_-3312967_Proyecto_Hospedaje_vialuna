const model = require("../models/clientes.model");

function buildError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizarCliente(data = {}) {
  return {
    NroDocumento: String(data.NroDocumento || "").trim(),
    Nombre: String(data.Nombre || "").trim(),
    Apellido: String(data.Apellido || "").trim(),
    Direccion: String(data.Direccion || "").trim(),
    Email: String(data.Email || "").trim().toLowerCase(),
    Telefono: String(data.Telefono || "").trim(),
    Estado: Number(data.Estado ?? 1),
    IDRol: Number(data.IDRol ?? 2)
  };
}

async function validarCliente(data, currentId = null) {
  const cliente = normalizarCliente(data);

  if (!cliente.NroDocumento) throw buildError("El documento es obligatorio");
  if (!cliente.Nombre) throw buildError("El nombre es obligatorio");
  if (!cliente.Apellido) throw buildError("El apellido es obligatorio");
  if (!cliente.Direccion) throw buildError("La direccion es obligatoria");
  if (!cliente.Email) throw buildError("El correo electronico es obligatorio");
  if (!cliente.Telefono) throw buildError("El telefono es obligatorio");

  const existente = await model.obtenerPorDocumentoOEmail(cliente);

  if (existente && String(existente.NroDocumento) !== String(currentId || cliente.NroDocumento)) {
    if (String(existente.NroDocumento) === cliente.NroDocumento) {
      throw buildError("Ya existe un cliente registrado con ese documento", 409);
    }

    if (String(existente.Email || "").toLowerCase() === cliente.Email) {
      throw buildError("Ya existe un cliente registrado con ese correo", 409);
    }
  }

  return cliente;
}

exports.listar = () => model.obtener();
exports.obtener = (id) => model.obtenerPorId(id);

exports.login = async (credenciales) => {
  const Email = String(credenciales.Email || "").trim().toLowerCase();
  const NroDocumento = String(credenciales.NroDocumento || "").trim();

  if (!Email || !NroDocumento) {
    throw buildError("Correo y documento son obligatorios");
  }

  return model.obtenerPorCredenciales({ Email, NroDocumento });
};

exports.crear = async (data) => {
  const cliente = await validarCliente(data);
  const result = await model.crear(cliente);

  return {
    id: result.insertId || cliente.NroDocumento,
    cliente: await model.obtenerPorId(cliente.NroDocumento)
  };
};

exports.actualizar = async (id, data) => {
  const clienteActual = await model.obtenerPorId(id);

  if (!clienteActual) {
    throw buildError("El cliente no existe", 404);
  }

  const cliente = await validarCliente({ ...clienteActual, ...data, NroDocumento: id }, id);
  await model.actualizar(id, cliente);
  return model.obtenerPorId(id);
};

exports.eliminar = async (id) => {
  const clienteActual = await model.obtenerPorId(id);

  if (!clienteActual) {
    throw buildError("El cliente no existe", 404);
  }

  return model.eliminar(id);
};
