const model = require('../models/imagenes_habitacion.model');

exports.listarPorHabitacion = (habitacionId) => model.listarPorHabitacion(habitacionId);

exports.crear = (habitacionId, url) => model.crear(habitacionId, url);

exports.eliminar = (id) => model.eliminar(id);
