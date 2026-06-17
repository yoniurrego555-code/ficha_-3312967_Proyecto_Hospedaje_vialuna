const crypto = require("crypto");
const emailService = require("./email.service");
const usuariosService = require("./usuarios.auth.service");

const TOKEN_DURATION_MINUTES = Number(process.env.PASSWORD_RESET_TOKEN_MINUTES || 30);
const RESET_SECRET = process.env.PASSWORD_RESET_SECRET || "vialuna-reset-secret";
const EMAIL_FROM = process.env.EMAIL_FROM || "ViaLuna <onboarding@resend.dev>";
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || "http://localhost:3000";
const RESET_PAGE_URL = process.env.PASSWORD_RESET_PAGE_URL || `${BACKEND_BASE_URL}/frontend/public/reset-password.html`;

function buildError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function signPayload(payload) {
  return crypto
    .createHmac("sha256", RESET_SECRET)
    .update(payload)
    .digest("hex");
}

function createResetToken(data) {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

function verifyResetToken(token) {
  const [payload, signature] = String(token || "").split(".");

  if (!payload || !signature) {
    throw buildError("El enlace de recuperación no es válido.", 400);
  }

  const expectedSignature = signPayload(payload);

  if (
    signature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    throw buildError("El enlace de recuperación no es válido o fue modificado.", 400);
  }

  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));

  if (!data.exp || Date.now() > Number(data.exp)) {
    throw buildError("El enlace de recuperación ya venció.", 400);
  }

  return data;
}

exports.requestReset = async ({ email }) => {
  try {
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      throw buildError("Debes ingresar el correo registrado.", 400);
    }

    const usuario = await usuariosService.obtenerPorEmail(normalizedEmail);

    if (!usuario) {
      throw buildError("No existe un administrador registrado con ese correo.", 404);
    }

    const token = createResetToken({
      id: usuario.IDUsuario,
      email: normalizedEmail,
      type: "admin",
      exp: Date.now() + TOKEN_DURATION_MINUTES * 60 * 1000
    });

    const resetLink = `${RESET_PAGE_URL}?token=${encodeURIComponent(token)}`;

    // Se delega el envío al servicio centralizado
    await emailService.enviarCorreoRecuperacion(
      normalizedEmail, 
      resetLink, 
      usuario.NombreUsuario || usuario.Nombre || "Administrador"
    );

    return {
      mensaje: "Se envió un correo de recuperación al email registrado."
    };
  } catch (error) {
    console.error("Error en requestReset:", error.message);
    throw error;
  }
};

exports.resetPassword = async ({ token, password }) => {
  try {
    const data = verifyResetToken(token);
    const usuario = await usuariosService.obtener(data.id);

    if (!usuario || String(usuario.Email || "").trim().toLowerCase() !== String(data.email || "").toLowerCase()) {
      throw buildError("No fue posible validar la solicitud de recuperación.", 400);
    }

    await usuariosService.actualizarPassword(usuario.IDUsuario, password);

    return {
      mensaje: "La clave fue actualizada correctamente."
    };
  } catch (error) {
    console.error("Error en resetPassword:", error.message);
    throw error;
  }
};
