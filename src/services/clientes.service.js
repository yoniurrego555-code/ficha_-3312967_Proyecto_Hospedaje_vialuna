const model = require("../models/clientes.model");

// 🔹 LISTAR
exports.listar = () => model.obtener();

// 🔹 OBTENER
exports.obtener = (id) => model.obtenerPorId(id);

// 🔹 LOGIN
exports.login = (credenciales) => model.obtenerPorCredenciales(credenciales);

// 🔹 CREAR
exports.crear = (data) => model.crear(data);

// 🔹 ACTUALIZAR
exports.actualizar = (id, data) => model.actualizar(id, data);

// 🔹 ELIMINAR
exports.eliminar = (id) => model.eliminar(id);
