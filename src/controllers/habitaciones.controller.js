const HabitacionesService = require('../services/habitaciones.service');

const HabitacionesController = {
    crear: (req, res) => {
        console.log('[habitaciones.controller] crear - body:', req.body);
        HabitacionesService.crearHabitacion(req.body)
            .then((result) => res.status(201).json({
                ok: true,
                mensaje: 'Habitacion creada correctamente',
                data: { id: result.insertId }
            }))
            .catch((err) => res.status(400).json({ ok: false, mensaje: err.toString() }));
    },

    listar: (req, res) => {
        HabitacionesService.obtenerHabitaciones()
            .then((data) => res.json({ ok: true, data }))
            .catch((err) => res.status(500).json({ ok: false, mensaje: err.toString() }));
    },

    obtenerPorId: (req, res) => {
        HabitacionesService.obtenerHabitacion(req.params.id)
            .then((data) => res.json({ ok: true, data }))
            .catch((err) => res.status(404).json({ ok: false, mensaje: err.toString() }));
    },

    actualizar: (req, res) => {
        console.log('[habitaciones.controller] actualizar - id:', req.params.id, 'body:', req.body);
        HabitacionesService.actualizarHabitacion(req.params.id, req.body)
            .then(() => res.json({ ok: true, mensaje: 'Habitacion actualizada correctamente' }))
            .catch((err) => res.status(400).json({ ok: false, mensaje: err.toString() }));
    },

    eliminar: (req, res) => {
        HabitacionesService.eliminarHabitacion(req.params.id)
            .then(() => res.json({ ok: true, mensaje: 'Habitacion eliminada correctamente' }))
            .catch((err) => res.status(400).json({ ok: false, mensaje: err.toString() }));
    },

    reservar: (req, res) => {
        HabitacionesService.reservarHabitacion(req.params.id)
            .then(() => res.json({ ok: true, mensaje: 'Habitacion reservada correctamente' }))
            .catch((err) => res.status(400).json({ ok: false, mensaje: err.toString() }));
    }
};

module.exports = HabitacionesController;
