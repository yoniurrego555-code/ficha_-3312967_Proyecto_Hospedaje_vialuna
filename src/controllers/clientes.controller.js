const service = require("../services/clientes.service");

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

// 🔹 LOGIN MEJORADO - SOLO POR EMAIL
exports.login = (req, res) => {
  const { Email } = req.body;

  if (!Email) {
    return res.status(400).json({
      error: "El correo es obligatorio"
    });
  }

  service.login({ Email })
    .then(cliente => {
      if (!cliente) {
        return res.status(401).json({
          error: "Credenciales invalidas"
        });
      }

      res.json({
        mensaje: "Login exitoso",
        usuario: cliente
      });
    })
    .catch(err => {
      console.error(err);
      
      // 🔐 MANEJO DE ERRORES ESPECÍFICOS
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          error: "El correo ya está registrado"
        });
      }
      
      res.status(500).json({ 
        error: "Error al iniciar sesion" 
      });
    });
};

// 🔹 CREAR
exports.crear = (req, res) => {
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
