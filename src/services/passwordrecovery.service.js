const crypto = require("crypto");
const nodemailer = require("nodemailer");
const usuariosService = require("./usuarios.auth.service");

const TOKEN_DURATION_MINUTES = Number(process.env.PASSWORD_RESET_TOKEN_MINUTES || 30);
const RESET_SECRET = process.env.PASSWORD_RESET_SECRET || "vialuna-reset-secret";
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "true").toLowerCase() !== "false";
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER;
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || "http://localhost:3000";
const RESET_PAGE_URL = process.env.PASSWORD_RESET_PAGE_URL || `${BACKEND_BASE_URL}/frontend/public/reset-password.html`;

function buildError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getTransporter() {
  if (!SMTP_USER || !SMTP_PASS) {
    throw buildError(
      "Configura SMTP_USER y SMTP_PASS para enviar correos de recuperacion con Gmail.",
      500
    );
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
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
    throw buildError("El enlace de recuperacion no es valido.", 400);
  }

  const expectedSignature = signPayload(payload);

  if (
    signature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    throw buildError("El enlace de recuperacion no es valido o fue modificado.", 400);
  }

  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));

  if (!data.exp || Date.now() > Number(data.exp)) {
    throw buildError("El enlace de recuperacion ya vencio.", 400);
  }

  return data;
}

exports.requestReset = async ({ email }) => {
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
  const transporter = getTransporter();

  await transporter.sendMail({
    from: MAIL_FROM,
    to: normalizedEmail,
    subject: "Recuperacion de clave - ViaLuna",
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
        <h2>Recuperacion de clave</h2>
        <p>Recibimos una solicitud para restablecer tu clave de administrador en ViaLuna.</p>
        <p>Haz clic en el siguiente enlace para crear una nueva clave:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Este enlace vence en ${TOKEN_DURATION_MINUTES} minutos.</p>
        <p>Si no solicitaste este cambio, ignora este mensaje.</p>
      </div>
    `
  });

  return {
    mensaje: "Se envio un correo de recuperacion al Gmail registrado."
  };
};

exports.resetPassword = async ({ token, password }) => {
  const data = verifyResetToken(token);
  const usuario = await usuariosService.obtener(data.id);

  if (!usuario || String(usuario.Email || "").trim().toLowerCase() !== String(data.email || "").toLowerCase()) {
    throw buildError("No fue posible validar la solicitud de recuperacion.", 400);
  }

  await usuariosService.actualizarPassword(usuario.IDUsuario, password);

  return {
    mensaje: "La clave fue actualizada correctamente."
  };
};
