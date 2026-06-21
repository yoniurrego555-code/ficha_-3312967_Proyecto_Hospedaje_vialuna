const service = require("../services/usuarios.auth.service");
const jwt = require("jsonwebtoken");
const emailService = require("../services/email.service");

const JWT_SECRET = process.env.JWT_SECRET || "vialuna-jwt-secret";

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
    .then(result => {
      // 1. Obtener email y nombre del usuario creado
      const email = req.body.Email || req.body.email;
      const nombre = req.body.Nombre || req.body.NombreUsuario || "Usuario";

      // 2. Si hay email, generar token de configuración de clave y enviar correo
      if (email) {
        // Obtenemos el ID del resultado de la inserción
        const newUserId = result.insertId || result.id || "";
        
        // Generar token para set-password válido por 24 horas
        const resetToken = jwt.sign(
          { sub: newUserId, email: email, type: "password_reset" },
          JWT_SECRET,
          { expiresIn: "24h" }
        );

        // Generar la URL correcta del frontend
        let baseURL = process.env.FRONTEND_URL || "https://hospedajevialuna.website";
        const origin = req.get("origin") || req.get("referer") || "";
        
        // Si estamos en entorno local de VS Code (Live Server)
        if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
          const parsedUrl = new URL(origin);
          baseURL = parsedUrl.origin; // e.g. http://127.0.0.1:5500
          
          if (origin.includes("/frontend")) {
             baseURL += "/frontend";
          } else if (!origin.includes("5173") && !origin.includes("3000")) {
             baseURL += "/frontend";
          }
        } else if (origin.includes("hospedajevialuna.website")) {
          baseURL = "https://hospedajevialuna.website";
        }
        
        // Utilizamos la nueva vista de creación de contraseña
        const setPasswordUrl = `${baseURL}/auth/set-password.html?token=${resetToken}`;

        emailService.enviarBienvenida(email, nombre, setPasswordUrl).catch(err => console.error("Error enviando bienvenida:", err));
      }

      res.json({
        mensaje: "Creado correctamente",
        resultado: result
      });
    })
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
