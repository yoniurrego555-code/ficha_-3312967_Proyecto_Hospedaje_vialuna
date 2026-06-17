const service = require("../services/usuarios.auth.service");

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

// 🔹 LOGIN - DESHABILITADO POR SEGURIDAD
exports.login = (req, res) => {
  res.status(403).json({
    error: "Endpoint deshabilitado por seguridad. Utilice /api/auth/login."
  });
};

exports.crear = (req, res) => {
  if (req.file) {
    const host = req.get("host") || "localhost:3000";
    req.body.AvatarUsuario = `${req.protocol}://${host}/uploads/${req.file.filename}`;
  }

  service.crear(req.body)
    .then(result => res.json({
      mensaje: "Creado correctamente",
      resultado: result
    }))
    .catch(err => {
      console.error("❌ ERROR:", err);
      
      // 🔐 MANEJO DE ERRORES DE DUPLICADOS
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          error: "El correo ya está registrado"
        });
      }
      
      res.status(500).json({ error: "Error al crear" });
    });
};

// 🔹 ACTUALIZAR
exports.actualizar = (req, res) => {
  if (req.file) {
    const host = req.get("host") || "localhost:3000";
    req.body.AvatarUsuario = `${req.protocol}://${host}/uploads/${req.file.filename}`;
  }

  service.actualizar(req.params.id, req.body)
    .then(() => res.json({ mensaje: "Actualizado" }))
    .catch(err => {
      console.error(err);
      res.status(err.status || 500).json({ error: err.message || "Error al actualizar" });
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
