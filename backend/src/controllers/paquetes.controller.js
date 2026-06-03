const service = require("../services/paquetes.service");

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
  console.log("📥 Crear Paquete - Body:", req.body);
  if (req.file) {
    console.log("🖼️ Crear Paquete - File:", req.file);
    const host = req.get("host") || "localhost:3000";
    req.body.ImagenUrl = `${req.protocol}://${host}/uploads/${req.file.filename}`;
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
  console.log("📥 Actualizar Paquete - Body:", req.body);
  if (req.file) {
    console.log("🖼️ Actualizar Paquete - File:", req.file);
    const host = req.get("host") || "localhost:3000";
    req.body.ImagenUrl = `${req.protocol}://${host}/uploads/${req.file.filename}`;
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