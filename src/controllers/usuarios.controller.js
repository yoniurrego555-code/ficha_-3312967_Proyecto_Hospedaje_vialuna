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

// 🔹 CREAR
exports.login = (req, res) => {
  const { Email, Username, Password, Contrasena } = req.body;

  if ((!Email && !Username) || (!Password && !Contrasena)) {
    return res.status(400).json({ error: "Usuario o correo y clave son obligatorios" });
  }

  service.login(req.body)
    .then(usuario => {
      if (!usuario) {
        return res.status(401).json({ error: "Credenciales invalidas" });
      }

      res.json({
        mensaje: "Login exitoso",
        usuario
      });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: "Error al iniciar sesion" });
    });
};

exports.crear = (req, res) => {
  service.crear(req.body)
    .then(result => res.json({
      mensaje: "Creado correctamente",
      resultado: result
    }))
    .catch(err => {
      console.error(err);
      res.status(err.status || 500).json({ error: err.message || "Error al crear" });
    });
};

// 🔹 ACTUALIZAR
exports.actualizar = (req, res) => {
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
