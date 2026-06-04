const service = require("../services/habitacion.service");

exports.listar = (req, res) => {
    service.listar()
        .then(data => {
            console.log("Habitaciones OK:", data.length);
            res.json(data);
        })
        .catch(error => {
            console.error(error);
            res.status(500).json({
                error: "Error al listar habitacion",
                detalle: error.message
            });
        });
};

exports.crear = (req, res) => {
    console.log("CREAR HABITACION BODY:", req.body);

    service.crear(req.body)
        .then(result => res.status(201).json({
            mensaje: "Creado correctamente",
            resultado: result
        }))
        .catch(error => {
            console.error(error);
            res.status(500).json({
                error: "Error al crear habitacion",
                detalle: error.message
            });
        });
};

exports.actualizar = (req, res) => {
    console.log("ACTUALIZAR HABITACION BODY:", req.body);

    service.actualizar(req.params.id, req.body)
        .then(result => res.json({
            mensaje: "Actualizado correctamente",
            resultado: result
        }))
        .catch(error => {
            console.error(error);
            res.status(500).json({
                error: "Error al actualizar habitacion",
                detalle: error.message
            });
        });
};

exports.obtener = (req, res) => {
    service.obtener(req.params.id)
        .then(data => {
            if (!data) {
                return res.status(404).json({ error: "Habitacion no encontrada" });
            }

            res.json(data);
        })
        .catch(error => {
            console.error(error);
            res.status(500).json({
                error: "Error al obtener habitacion",
                detalle: error.message
            });
        });
};

exports.eliminar = (req, res) => {
    service.eliminar(req.params.id)
        .then(result => res.json({
            mensaje: "Eliminado correctamente",
            resultado: result
        }))
        .catch(error => {
            console.error(error);
            res.status(500).json({
                error: "Error al eliminar habitacion",
                detalle: error.message
            });
        });
};
