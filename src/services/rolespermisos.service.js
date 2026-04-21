const model = require("../models/rolespermisos.model");

// 🔹 LISTAR
exports.listar = () => model.obtener();

// 🔹 OBTENER
exports.obtener = (id) => model.obtenerPorId(id);

// 🔹 CREAR
exports.crear = async (data) => {
  const idRol = Number(data?.IDRol);
  const idPermiso = Number(data?.IDPermiso);

  if (!idRol || !idPermiso) {
    const error = new Error("El rol y el permiso son obligatorios.");
    error.status = 400;
    throw error;
  }

  const existente = await model.obtenerPorRelacion(idRol, idPermiso);

  if (existente) {
    const error = new Error("Ese permiso ya esta asignado al rol seleccionado.");
    error.status = 409;
    throw error;
  }

  return model.crear({ IDRol: idRol, IDPermiso: idPermiso });
};

// 🔹 ACTUALIZAR
exports.actualizar = async (id, data) => {
  const idRol = Number(data?.IDRol);
  const idPermiso = Number(data?.IDPermiso);

  if (!idRol || !idPermiso) {
    const error = new Error("El rol y el permiso son obligatorios.");
    error.status = 400;
    throw error;
  }

  const existente = await model.obtenerPorRelacion(idRol, idPermiso, id);

  if (existente) {
    const error = new Error("Ya existe esa misma asignacion rol-permiso.");
    error.status = 409;
    throw error;
  }

  return model.actualizar(id, { IDRol: idRol, IDPermiso: idPermiso });
};

// 🔹 ELIMINAR
exports.eliminar = (id) => model.eliminar(id);
exports.sembrarPermisosBase = () => model.sembrarPermisosBase();
