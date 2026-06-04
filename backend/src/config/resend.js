const { Resend } = require('resend');

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn("ADVERTENCIA: RESEND_API_KEY no está configurada en las variables de entorno (.env). El envío de correos fallará.");
}

// Pasamos un string por defecto si no existe para evitar que el constructor tire Error y tumbe la aplicación.
const resend = new Resend(resendApiKey || 're_dummy_key_to_prevent_crash');

module.exports = resend;
