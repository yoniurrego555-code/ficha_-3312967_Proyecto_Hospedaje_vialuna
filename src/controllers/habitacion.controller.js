const service = require("../services/habitacion.service");

// 🔹 LISTAR
exports.listar = (req, res) => {
    service.listar()
        .then(data => {
            console.log("📦 Habitacion:", data); // 🔥 DEBUG
            res.json(data);
        })
        .catch(error => {
            console.error("❌ ERROR LISTAR HABITACION:", error); // 🔥 CLAVE
            res.status(500).json({
                error: "Error al listar habitacion",
                detalle: error.message
            });
        });
};

// 🔹 CREAR
exports.crear = (req, res) => {
    service.crear(req.body)
        .then(() => res.json({ mensaje: "Creado correctamente" }))
        .catch(error => {
            console.error("❌ ERROR CREAR:", error);
            res.status(400).json(error);
        });
};

// 🔹 ACTUALIZAR
exports.actualizar = (req, res) => {
    service.actualizar(req.params.id, req.body)
        .then(() => res.json({ mensaje: "Actualizado correctamente" }))
        .catch(error => {
            console.error("❌ ERROR ACTUALIZAR:", error);
            res.status(400).json(error);
        });
};

// 🔹 OBTENER POR ID
exports.obtener = (req, res) => {
    service.listar()
        .then(data => {
            const item = data.find(x => x.IDHabitacion == req.params.id);
            res.json(item);
        })
        .catch(error => {
            console.error("❌ ERROR OBTENER:", error);
            res.status(500).json(error);
        });
};

// 🔹 ELIMINAR
exports.eliminar = (req, res) => {
    service.eliminar(req.params.id)
        .then(() => res.json({ mensaje: "Eliminado correctamente" }))
        .catch(error => {
            console.error("❌ ERROR ELIMINAR:", error);
            res.status(400).json(error);
        });
};