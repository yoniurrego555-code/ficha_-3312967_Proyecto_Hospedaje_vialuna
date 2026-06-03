const service = require("../services/servicios.service");

// 🔹 LISTAR
exports.listar = (req, res) => {
  service.listar()
    .then(data => res.json(data))
    .catch(err => {
      console.error("❌ ERROR:", err);
      res.status(500).json({ error: "Error al listar" });
    });
};

// 🔹 OBTENER
exports.obtener = (req, res) => {
  service.obtener(req.params.id)
    .then(data => res.json(data))
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: "Error al obtener" });
    });
};

// 🔹 CREAR
exports.crear = (req, res) => {
  console.log("📥 Crear Servicio - Body:", req.body);
  if (req.file) {
    console.log("🖼️ Crear Servicio - File:", req.file);
    const host = req.get("host") || "localhost:3000";
    req.body.ImagenUrl = `${req.protocol}://${host}/uploads/${req.file.filename}`;
  }

  // Validaciones
  if (req.body.CantidadMaximaPersonas && Number(req.body.CantidadMaximaPersonas) < 1) {
    return res.status(400).json({ error: "CantidadMáximaPersonas debe ser mayor o igual a 1" });
  }
  if (req.body.EdadMinima && req.body.EdadMaxima && Number(req.body.EdadMinima) > Number(req.body.EdadMaxima)) {
    return res.status(400).json({ error: "EdadMínima no puede ser mayor que EdadMáxima" });
  }

  service.crear(req.body)
    .then(result => res.json({
      mensaje: "Creado correctamente",
      resultado: result
    }))
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: "Error al crear" });
    });
};

// 🔹 ACTUALIZAR
exports.actualizar = (req, res) => {
  console.log("📥 Actualizar Servicio - Body:", req.body);
  if (req.file) {
    console.log("🖼️ Actualizar Servicio - File:", req.file);
    const host = req.get("host") || "localhost:3000";
    req.body.ImagenUrl = `${req.protocol}://${host}/uploads/${req.file.filename}`;
  }

  // Validaciones
  if (req.body.CantidadMaximaPersonas && Number(req.body.CantidadMaximaPersonas) < 1) {
    return res.status(400).json({ error: "CantidadMáximaPersonas debe ser mayor o igual a 1" });
  }
  if (req.body.EdadMinima && req.body.EdadMaxima && Number(req.body.EdadMinima) > Number(req.body.EdadMaxima)) {
    return res.status(400).json({ error: "EdadMínima no puede ser mayor que EdadMáxima" });
  }

  service.actualizar(req.params.id, req.body)
    .then(() => res.json({ mensaje: "Actualizado" }))
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: "Error al actualizar" });
    });
};

// 🔹 ELIMINAR
exports.eliminar = (req, res) => {
  service.eliminar(req.params.id)
    .then(() => res.json({ mensaje: "Eliminado" }))
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: "Error al eliminar" });
    });
};