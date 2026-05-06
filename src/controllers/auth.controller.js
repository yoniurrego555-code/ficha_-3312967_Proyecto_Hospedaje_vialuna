const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authModel = require("../models/auth.model");

const JWT_SECRET = process.env.JWT_SECRET || "vialuna-jwt-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";
const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);

function isBcryptHash(value) {
  return /^\$2[aby]\$\d{2}\$/.test(String(value || ""));
}

function buildToken(account) {
  return jwt.sign(
    {
      sub: String(account.id),
      email: account.email,
      rol: account.rol,
      IDRol: account.IDRol,
      source: account.source
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function sanitizeSession(account) {
  const user = {
    id: account.id,
    nombre: account.nombre,
    email: account.email,
    rol: account.rol,
    IDRol: account.IDRol
  };

  if (account.source === "clientes") {
    user.id_cliente = account.id;
    user.NroDocumento = account.id;
  } else {
    user.IDUsuario = account.id;
  }

  return {
    token: buildToken(account),
    user
  };
}

function validatePassword(password, fieldName = "contraseña") {
  const normalized = String(password || "").trim();

  if (normalized.length < 6) {
    throw authModel.buildError(`La ${fieldName} debe tener al menos 6 caracteres.`, 400);
  }

  return normalized;
}

async function validateAccountPassword(account, password) {
  const currentHash = String(account?.passwordHash || "");

  if (!currentHash) {
    return false;
  }

  if (isBcryptHash(currentHash)) {
    return bcrypt.compare(password, currentHash);
  }

  const legacyMatch = currentHash === password;

  if (legacyMatch) {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await authModel.updatePasswordByAccount(account, passwordHash);
  }

  return legacyMatch;
}

function handleError(res, error, fallbackMessage) {
  console.error(fallbackMessage, error);
  res.status(error.status || 500).json({
    error: error.message || fallbackMessage
  });
}

exports.checkEmail = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim();

    if (!email) {
      throw authModel.buildError("El correo es obligatorio.", 400);
    }

    const exists = await authModel.emailExists(email);
    res.json({
      exists,
      message: exists ? "El correo ya está registrado." : "Correo disponible."
    });
  } catch (error) {
    handleError(res, error, "Error al validar el correo");
  }
};

exports.login = async (req, res) => {
  try {
    const email = String(req.body?.email || req.body?.Email || "").trim();
    const password = String(req.body?.password || req.body?.Password || req.body?.Contrasena || "").trim();

    if (!email || !password) {
      throw authModel.buildError("Correo y contraseña son obligatorios.", 400);
    }

    const account = await authModel.findAccountByEmail(email);

    if (!account || !account.passwordHash) {
      return res.status(401).json({
        message: "Usuario no encontrado"
      });
    }

    const validPassword = await validateAccountPassword(account, password);

    if (!validPassword) {
      return res.status(401).json({
        message: "Contraseña incorrecta"
      });
    }

    const session = sanitizeSession(account);

    res.json({
      token: session.token,
      rol: session.user.rol,
      id: session.user.id,
      nombre: session.user.nombre,
      email: session.user.email,
      user: session.user
    });
  } catch (error) {
    handleError(res, error, "Error al iniciar sesión");
  }
};

exports.register = async (req, res) => {
  try {
    const payload = {
      NroDocumento: String(req.body?.NroDocumento || req.body?.documento || "").trim(),
      Nombre: String(req.body?.Nombre || req.body?.nombre || "").trim(),
      Apellido: String(req.body?.Apellido || req.body?.apellido || "").trim(),
      Direccion: String(req.body?.Direccion || req.body?.direccion || "").trim(),
      Email: String(req.body?.Email || req.body?.email || "").trim(),
      Telefono: String(req.body?.Telefono || req.body?.telefono || "").trim(),
      Estado: 1,
      IDRol: 2
    };

    const plainPassword = validatePassword(req.body?.Contrasena || req.body?.password);

    if (!payload.NroDocumento || !payload.Nombre || !payload.Apellido || !payload.Email || !payload.Telefono) {
      throw authModel.buildError("Todos los campos obligatorios deben estar completos.", 400);
    }

    if (await authModel.emailExists(payload.Email)) {
      throw authModel.buildError("El correo ya está registrado.", 409);
    }

    if (await authModel.documentoExists(payload.NroDocumento)) {
      throw authModel.buildError("El documento ya está registrado.", 409);
    }

    const passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    const { account } = await authModel.createCliente({
      ...payload,
      Contrasena: passwordHash
    });

    res.status(201).json({
      message: "Cliente registrado correctamente.",
      ...sanitizeSession(account)
    });
  } catch (error) {
    handleError(res, error, "Error al registrar cliente");
  }
};

exports.recover = async (req, res) => {
  try {
    const email = String(req.body?.email || req.body?.Email || "").trim();
    const newPassword = validatePassword(req.body?.newPassword || req.body?.nuevaContrasena || req.body?.Contrasena, "nueva contraseña");

    if (!email) {
      throw authModel.buildError("El correo es obligatorio.", 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await authModel.updatePasswordByEmail(email, passwordHash);

    res.json({
      message: "Contraseña actualizada correctamente."
    });
  } catch (error) {
    handleError(res, error, "Error al recuperar la contraseña");
  }
};
