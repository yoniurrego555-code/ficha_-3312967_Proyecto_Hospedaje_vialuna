const jwt = require("jsonwebtoken");
const service = require("../services/usuarios.auth.service");

const JWT_SECRET = process.env.JWT_SECRET || "vialuna-super-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

function normalizeRole(usuario = {}) {
  const raw = String(usuario.NombreRol || usuario.rol || usuario.Rol || "").trim().toLowerCase();

  if (raw === "admin" || raw === "administrador" || Number(usuario.IDRol) === 1) {
    return "admin";
  }

  if (raw === "cliente" || raw === "usuario" || Number(usuario.IDRol) === 2) {
    return "cliente";
  }

  return raw || "cliente";
}

function normalizeUser(usuario) {
  const rol = normalizeRole(usuario);
  return {
    IDUsuario: usuario.IDUsuario,
    id: usuario.IDUsuario,
    nombre: usuario.Nombre || usuario.Username || usuario.NombreUsuario || "Usuario",
    apellido: usuario.Apellido || "",
    email: usuario.Email,
    telefono: usuario.Telefono || "",
    IDRol: usuario.IDRol,
    rol,
    NombreRol: usuario.NombreRol
  };
}

exports.listar = (req, res) => {
  service.listar()
    .then(data => res.json(data))
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: "Error al listar" });
    });
};

exports.obtener = (req, res) => {
  service.obtener(req.params.id)
    .then(data => res.json(data))
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: "Error al obtener" });
    });
};

exports.login = (req, res) => {
  console.log("LOGIN BODY:", req.body);

  const email = req.body.email || req.body.Email || req.body.Username || req.body.username;
  const password = req.body.password || req.body.Password || req.body.Contrasena || req.body.contrasena;

  if (!email || !password) {
    return res.status(400).json({ error: "Usuario o correo y clave son obligatorios" });
  }

  service.login({ Email: email, Username: email, Password: password, Contrasena: password })
    .then(usuario => {
      if (!usuario) {
        return res.status(401).json({ error: "Credenciales invalidas" });
      }

      const usuarioNormalizado = normalizeUser(usuario);
      const token = jwt.sign(
        {
          id: usuarioNormalizado.IDUsuario,
          IDUsuario: usuarioNormalizado.IDUsuario,
          email: usuarioNormalizado.Email,
          rol: usuarioNormalizado.rol,
          IDRol: usuarioNormalizado.IDRol
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        ok: true,
        mensaje: "Login exitoso",
        token,
        usuario: usuarioNormalizado,
        user: usuarioNormalizado
      });
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: "Error al iniciar sesion", detalle: error.message });
    });
};

exports.crear = (req, res) => {
  console.log("CREAR USUARIO BODY:", req.body);

  service.crear(req.body)
    .then(result => res.json({
      mensaje: "Creado correctamente",
      resultado: result
    }))
    .catch(error => {
      console.error(error);

      if (error.code === "ER_DUP_ENTRY" || error.status === 409) {
        return res.status(409).json({ error: "El correo ya esta registrado" });
      }

      res.status(500).json({ error: "Error al crear", detalle: error.message });
    });
};

exports.actualizar = (req, res) => {
  console.log("ACTUALIZAR USUARIO BODY:", req.body);

  service.actualizar(req.params.id, req.body)
    .then(() => res.json({ mensaje: "Actualizado" }))
    .catch(error => {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || "Error al actualizar" });
    });
};

exports.eliminar = (req, res) => {
  service.eliminar(req.params.id)
    .then(() => res.json({ mensaje: "Eliminado" }))
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: "Error al eliminar", detalle: error.message });
    });
};

