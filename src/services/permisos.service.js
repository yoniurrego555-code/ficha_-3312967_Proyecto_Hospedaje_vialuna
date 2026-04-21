const model = require("../models/permisos.model");

// 🔹 LISTAR
exports.listar = () => model.obtener();

// 🔹 OBTENER
exports.obtener = (id) => model.obtenerPorId(id);

// 🔹 CREAR
exports.crear = async (data) => {
  const nombre = String(data?.NombrePermisos || "").trim();
  const descripcion = String(data?.Descripcion || "").trim();
  const activo = Number(data?.IsActive ?? 1);
  const estadoTexto = String(data?.EstadoPermisos || (activo === 1 ? "Activo" : "Inactivo")).trim();

  if (!nombre) {
    const error = new Error("El nombre del permiso es obligatorio.");
    error.status = 400;
    throw error;
  }

  const existente = await model.obtenerPorNombre(nombre);

  if (existente) {
    const error = new Error("Ya existe un permiso con ese nombre.");
    error.status = 409;
    throw error;
  }

  return model.crear({
    NombrePermisos: nombre,
    EstadoPermisos: estadoTexto || "Activo",
    Descripcion: descripcion,
    IsActive: activo === 1 ? 1 : 0
  });
};

// 🔹 ACTUALIZAR
exports.actualizar = async (id, data) => {
  const nombre = String(data?.NombrePermisos || "").trim();
  const descripcion = String(data?.Descripcion || "").trim();
  const activo = Number(data?.IsActive ?? 1);
  const estadoTexto = String(data?.EstadoPermisos || (activo === 1 ? "Activo" : "Inactivo")).trim();

  if (!nombre) {
    const error = new Error("El nombre del permiso es obligatorio.");
    error.status = 400;
    throw error;
  }

  const existente = await model.obtenerPorNombre(nombre, id);

  if (existente) {
    const error = new Error("Ya existe otro permiso con ese nombre.");
    error.status = 409;
    throw error;
  }

  return model.actualizar(id, {
    NombrePermisos: nombre,
    EstadoPermisos: estadoTexto || "Activo",
    Descripcion: descripcion,
    IsActive: activo === 1 ? 1 : 0
  });
};

// 🔹 ELIMINAR
exports.eliminar = (id) => model.eliminar(id);
