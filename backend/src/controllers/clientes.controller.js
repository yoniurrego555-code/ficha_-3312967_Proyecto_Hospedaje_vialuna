const service = require("../services/clientes.service");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const emailService = require("../services/email.service");

const JWT_SECRET = process.env.JWT_SECRET || "vialuna-jwt-secret";
const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);

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

// 🔹 CREAR (desde Admin)
exports.crear = async (req, res) => {
  try {
    if (req.file) {
      const host = req.get("host") || "localhost:3000";
      req.body.AvatarUsuario = `${req.protocol}://${host}/uploads/${req.file.filename}`;
    }

    // Generar contraseña temporal aleatoria (8 caracteres alfanuméricos)
    const plainPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);

    // Guardar contraseña hasheada en el campo Contrasena
    const dataToSave = { ...req.body, Contrasena: passwordHash };

    const result = await service.crear(dataToSave);

    const email = req.body.Email || req.body.email;
    const nombre = req.body.Nombre || "Cliente";

    // Enviar correo con contraseña temporal + enlace para cambiarla (válido 7 días)
    if (email) {
      // Generar token de 7 días para que el cliente pueda cambiar su contraseña
      const resetToken = jwt.sign(
        { email, type: "password_reset" },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Construir URL del frontend
      let baseURL = process.env.FRONTEND_URL || "https://hospedajevialuna.website";
      const origin = req.get("origin") || req.get("referer") || "";
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        const parsedUrl = new URL(origin);
        baseURL = parsedUrl.origin;
        if (!origin.includes("5173") && !origin.includes("3000")) {
          baseURL += "/frontend";
        }
      } else if (origin.includes("hospedajevialuna.website")) {
        baseURL = "https://hospedajevialuna.website";
      }

      const setPasswordUrl = `${baseURL}/auth/set-password.html?token=${resetToken}`;

      // Fire-and-forget: enviar correo con contraseña temporal y enlace de cambio
      emailService.enviarBienvenidaAdminCreado(email, nombre, plainPassword, setPasswordUrl)
        .catch(err => console.error("[ClientesController] Error enviando correo de bienvenida:", err));
    }

    res.json({
      mensaje: "Creado correctamente",
      resultado: result
    });
  } catch (err) {
    console.error("❌ ERROR:", err);

    // 🔐 MANEJO DE ERRORES DE DUPLICADOS
    if (err.code === "ER_DUP_ENTRY" || err.status === 409) {
      return res.status(409).json({
        error: err.message || "El correo o documento ya está registrado"
      });
    }

    res.status(err.status || 500).json({ error: err.message || "Error al crear" });
  }
};

// 🔹 ACTUALIZAR
exports.actualizar = (req, res) => {
  console.log("BODY EN ACTUALIZAR:", req.body);
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
