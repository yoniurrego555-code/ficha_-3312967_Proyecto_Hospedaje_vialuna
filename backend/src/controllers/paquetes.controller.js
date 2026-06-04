const service = require("../services/paquetes.service");

exports.listar = (req, res) => {
  service.listar()
    .then(data => {
      console.log("Paquetes OK:", data.length);
      res.json(data);
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: "Error al listar", detalle: error.message });
    });
};

exports.obtener = (req, res) => {
  service.obtener(req.params.id)
    .then(data => {
      if (!data) return res.status(404).json({ error: "Paquete no encontrado" });
      res.json(data);
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: "Error al obtener", detalle: error.message });
    });
};

exports.crear = (req, res) => {
  console.log("CREAR PAQUETE BODY:", req.body);

  service.crear(req.body)
    .then(result => res.status(201).json({
      mensaje: "Creado correctamente",
      resultado: result
    }))
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: "Error al crear", detalle: error.message });
    });
};

exports.actualizar = (req, res) => {
  console.log("ACTUALIZAR PAQUETE BODY:", req.body);

  service.actualizar(req.params.id, req.body)
    .then(result => res.json({ mensaje: "Actualizado", resultado: result }))
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: "Error al actualizar", detalle: error.message });
    });
};

exports.eliminar = (req, res) => {
  service.eliminar(req.params.id)
    .then(result => res.json({ mensaje: "Eliminado", resultado: result }))
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: "Error al eliminar", detalle: error.message });
    });
};
