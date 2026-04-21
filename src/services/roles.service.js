const model = require("../models/roles.model");

// 🔹 LISTAR
exports.listar = () => model.obtener();

// 🔹 OBTENER
exports.obtener = (id) => model.obtenerPorId(id);

// 🔹 CREAR
exports.crear = async (data) => {
  const nombre = String(data?.Nombre || "").trim();

  if (!nombre) {
    const error = new Error("El nombre del rol es obligatorio.");
    error.status = 400;
    throw error;
  }

  const existente = await model.obtenerPorNombre(nombre);

  if (existente) {
    const error = new Error("Ya existe un rol con ese nombre.");
    error.status = 409;
    throw error;
  }

  return model.crear({ ...data, Nombre: nombre });
};

// 🔹 ACTUALIZAR
exports.actualizar = async (id, data) => {
  const nombre = String(data?.Nombre || "").trim();

  if (!nombre) {
    const error = new Error("El nombre del rol es obligatorio.");
    error.status = 400;
    throw error;
  }

  const existente = await model.obtenerPorNombre(nombre, id);

  if (existente) {
    const error = new Error("Ya existe otro rol con ese nombre.");
    error.status = 409;
    throw error;
  }

  return model.actualizar(id, { ...data, Nombre: nombre });
};

// 🔹 ELIMINAR
exports.eliminar = (id) => model.eliminar(id);
