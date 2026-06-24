const sendEmail = require('../utils/sendEmail');

/**
 * Servicio para envío de correos electrónicos transaccionales usando Brevo.
 */

/**
 * Envía correos de confirmación al cliente y notificación al administrador 
 * cuando se crea una nueva reserva.
 * 
 * @param {Object} reserva - El objeto hidratado de la reserva
 */
async function enviarConfirmacionReserva(reserva) {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;

    const clienteEmail = reserva.cliente?.email;
    const nombreCliente = reserva.cliente?.nombreCompleto || "Huésped";
    const habitacionNombre = reserva.habitacion?.nombre || "Habitación no especificada";
    const fechaInicio = reserva.fecha_inicio;
    const fechaFin = reserva.fecha_fin;
    const total = reserva.total ? `$${Number(reserva.total).toLocaleString('es-CO')}` : "Por definir";

    // 1. Enviar confirmación al CLIENTE (si tiene correo registrado)
    if (clienteEmail) {
      const clienteHtml = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #02634f; margin: 0;">¡Reserva Confirmada!</h1>
            <p style="color: #666; font-size: 16px;">Via Luna Hospedaje</p>
          </div>
          
          <p style="font-size: 16px; color: #333;">Hola <strong>${nombreCliente}</strong>,</p>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">Nos alegra confirmarte que tu reserva ha sido guardada con éxito. A continuación, te presentamos los detalles de tu estadía:</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #02634f;">
            <p style="margin: 8px 0; font-size: 15px;"><strong>🏨 Habitación reservada:</strong> ${habitacionNombre}</p>
            <p style="margin: 8px 0; font-size: 15px;"><strong>📅 Fecha de entrada:</strong> ${fechaInicio}</p>
            <p style="margin: 8px 0; font-size: 15px;"><strong>📅 Fecha de salida:</strong> ${fechaFin}</p>
            <p style="margin: 8px 0; font-size: 15px;"><strong>👥 Huéspedes:</strong> (Según capacidad reservada)</p>
            <p style="margin: 8px 0; font-size: 15px;"><strong>💰 Valor Total:</strong> ${total}</p>
          </div>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6;">Estamos muy emocionados de recibirte y esperamos que disfrutes de mucha naturaleza, descanso y experiencias únicas.</p>
          <p style="font-size: 16px; color: #333;">Si tienes alguna pregunta, no dudes en ponerte en contacto con nosotros.</p>
          
          <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 30px 0;">
          <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">© 2026 Via Luna Hospedaje. Todos los derechos reservados.</p>
        </div>
      `;

      try {
        await sendEmail(clienteEmail, "Confirmación de Reserva - Via Luna Hospedaje", clienteHtml);
        console.log(`[EmailService] ✅ Correo de confirmación enviado exitosamente al cliente: ${clienteEmail}`);
      } catch (err) {
        console.error(`[EmailService] ❌ Error enviando correo al cliente (${clienteEmail}):`, err.response?.body || err.message || err);
      }
    } else {
      console.warn(`[EmailService] ⚠️ La reserva #${reserva.id_reserva} no tiene correo de cliente. Se omite envío al cliente.`);
    }

    // 2. Enviar notificación al ADMINISTRADOR
    if (adminEmail) {
      const fechaCreacion = new Date().toLocaleString("es-CO");
      const adminHtml = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; border-bottom: 2px solid #20c997; padding-bottom: 15px; margin-bottom: 20px;">
            <h2 style="color: #173029; margin: 0;">🛎️ Nueva Reserva Recibida</h2>
          </div>
          
          <p style="font-size: 16px; color: #333;">Se ha registrado una nueva reserva en el sistema de Via Luna.</p>
          
          <div style="background-color: #f4f6f5; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #dcdcdc;">
            <h3 style="margin-top: 0; color: #02634f;">Detalles de la Reserva (#${reserva.id_reserva})</h3>
            <p style="margin: 8px 0; font-size: 15px;"><strong>Cliente:</strong> ${nombreCliente}</p>
            <p style="margin: 8px 0; font-size: 15px;"><strong>Correo del cliente:</strong> ${clienteEmail || 'No proporcionado'}</p>
            <p style="margin: 8px 0; font-size: 15px;"><strong>Documento:</strong> ${reserva.cliente?.nroDocumento || reserva.nr_documento || 'No especificado'}</p>
            <hr style="border: 0; border-top: 1px dashed #ccc; margin: 15px 0;">
            <p style="margin: 8px 0; font-size: 15px;"><strong>Habitación:</strong> ${habitacionNombre}</p>
            <p style="margin: 8px 0; font-size: 15px;"><strong>Ingreso:</strong> ${fechaInicio}</p>
            <p style="margin: 8px 0; font-size: 15px;"><strong>Salida:</strong> ${fechaFin}</p>
            <p style="margin: 8px 0; font-size: 15px;"><strong>Total:</strong> ${total}</p>
            <hr style="border: 0; border-top: 1px dashed #ccc; margin: 15px 0;">
            <p style="margin: 8px 0; font-size: 14px; color: #666;"><strong>Fecha/Hora de creación:</strong> ${fechaCreacion}</p>
          </div>
          
          <p style="font-size: 14px; color: #555;">Por favor, revisa el panel de administración para ver la información completa sobre paquetes o servicios adicionales.</p>
        </div>
      `;

      try {
        await sendEmail(adminEmail, `Nueva Reserva - ${nombreCliente} - ${habitacionNombre}`, adminHtml);
        console.log(`[EmailService] ✅ Correo de notificación enviado exitosamente al administrador: ${adminEmail}`);
      } catch (err) {
        console.error(`[EmailService] ❌ Error enviando notificación al admin (${adminEmail}):`, err.response?.body || err.message || err);
      }
    } else {
      console.warn("[EmailService] ⚠️ process.env.ADMIN_EMAIL no está configurado. No se enviará notificación al administrador.");
    }
  } catch (error) {
    // Relanzamos el error general si falla algo antes del envío
    throw error;
  }
}

/**
 * Genera y envía el correo de recuperación de contraseña
 */
async function enviarCorreoRecuperacion(email, resetUrl, userName = "Usuario") {
  const subject = "Restablece tu contraseña - Via Luna Hospedaje";
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Restablecer Contraseña</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4fdf8; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-top: 4px solid #258a60; }
        .header { padding: 30px; text-align: center; border-bottom: 1px solid #f0f0f0; }
        .header h1 { margin: 0; color: #173029; font-size: 24px; }
        .content { padding: 30px; line-height: 1.6; }
        .content p { font-size: 16px; margin-bottom: 20px; }
        .button-container { text-align: center; margin: 35px 0; }
        .button { background-color: #258a60; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block; transition: background-color 0.3s; }
        .button:hover { background-color: #1e704e; }
        .footer { padding: 20px; text-align: center; background-color: #f9f9f9; font-size: 14px; color: #888; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Vía Luna Hospedaje</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${userName}</strong>,</p>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en Vía Luna. Si hiciste esta solicitud, por favor haz clic en el siguiente botón para crear una nueva contraseña:</p>
          
          <div class="button-container">
            <a href="${resetUrl}" class="button">Restablecer mi contraseña</a>
          </div>
          
          <p>Este enlace es seguro y expirará en <strong>15 minutos</strong> por razones de seguridad.</p>
          <p>Si no solicitaste un cambio de contraseña, puedes ignorar este correo de forma segura. Tu cuenta sigue protegida.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Vía Luna Hospedaje. Todos los derechos reservados.<br>
          Si tienes problemas con el botón, copia y pega el siguiente enlace en tu navegador:<br>
          <a href="${resetUrl}" style="color: #258a60; word-break: break-all;">${resetUrl}</a>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const response = await sendEmail(email, subject, html);
    console.log(`[EmailService] ✅ Correo de recuperación enviado a: ${email}`);
    return response;
  } catch (error) {
    console.error(`[EmailService] ❌ Error enviando correo de recuperación a ${email}:`, error.response?.body || error.message || error);
    throw error;
  }
}

/**
 * Genera y envía el correo de bienvenida a nuevos usuarios
 */
async function enviarBienvenida(email, userName = "Usuario", setPasswordUrl = null) {
  
  const subject = "¡Bienvenido a Via Luna Hospedaje!";
  
  let linkSection = "";
  if (setPasswordUrl) {
    linkSection = `
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #02634f;">
        <p style="margin-top: 0; font-size: 15px;">Para empezar a usar tu cuenta, por favor crea una contraseña segura haciendo clic en el siguiente botón:</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${setPasswordUrl}" style="background-color: #258a60; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">Crear mi Contraseña</a>
        </div>
        <p style="font-size: 13px; color: #666; margin-bottom: 0;">Este enlace es seguro y expirará en 24 horas por razones de seguridad.</p>
      </div>
    `;
  }

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #02634f; margin: 0;">¡Bienvenido, ${userName}!</h1>
        <p style="color: #666; font-size: 16px;">Via Luna Hospedaje</p>
      </div>
      
      <p style="font-size: 16px; color: #333;">Estamos muy felices de que te unas a nosotros.</p>
      <p style="font-size: 16px; color: #333; line-height: 1.6;">Desde ahora puedes disfrutar de la mejor experiencia en nuestro hospedaje.</p>
      
      ${linkSection}
      
      <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 30px 0;">
      <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">© ${new Date().getFullYear()} Via Luna Hospedaje. Todos los derechos reservados.</p>
    </div>
  `;

  try {
    await sendEmail(email, subject, html);
    console.log(`[EmailService] ✅ Correo de bienvenida enviado a: ${email}`);
  } catch (error) {
    console.error(`[EmailService] ❌ Error enviando bienvenida a ${email}:`, error.response?.body || error.message || error);
  }
}

/**
 * Genera y envía el correo de cancelación de reserva
 */
async function enviarCancelacionReserva(reserva, motivo = "Sin motivo especificado") {
  
  const clienteEmail = reserva.cliente?.email;
  const nombreCliente = reserva.cliente?.nombreCompleto || reserva.cliente?.Nombres || "Huésped";
  const habitacionNombre = reserva.habitacion?.nombre || reserva.habitacion?.NombreHabitacion || "Habitación";
  
  if (!clienteEmail) return;

  const subject = "Cancelación de Reserva - Via Luna Hospedaje";
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #b45309; margin: 0;">Reserva Cancelada</h1>
        <p style="color: #666; font-size: 16px;">Via Luna Hospedaje</p>
      </div>
      
      <p style="font-size: 16px; color: #333;">Hola <strong>${nombreCliente}</strong>,</p>
      <p style="font-size: 16px; color: #333; line-height: 1.6;">Te confirmamos que tu reserva para la habitación <strong>${habitacionNombre}</strong> ha sido cancelada.</p>
      
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #b45309;">
        <p style="margin: 8px 0; font-size: 15px;"><strong>Código de Reserva:</strong> #${reserva.id_reserva || reserva.IDReserva}</p>
        <p style="margin: 8px 0; font-size: 15px;"><strong>Motivo de cancelación:</strong> ${motivo}</p>
      </div>
      
      <p style="font-size: 16px; color: #333; line-height: 1.6;">Esperamos poder recibirte en el futuro.</p>
      
      <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 30px 0;">
      <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">© 2026 Via Luna Hospedaje. Todos los derechos reservados.</p>
    </div>
  `;

  try {
    await sendEmail(clienteEmail, subject, html);
    console.log(`[EmailService] ✅ Correo de cancelación enviado a: ${clienteEmail}`);
  } catch (error) {
    console.error(`[EmailService] ❌ Error enviando cancelación a ${clienteEmail}:`, error.response?.body || error.message || error);
  }
}

/**
 * Genera y envía el correo de confirmación de pago de reserva
 */
async function enviarConfirmacionPago(reserva) {
  
  const clienteEmail = reserva.cliente?.email;
  const nombreCliente = reserva.cliente?.nombreCompleto || reserva.cliente?.Nombres || "Huésped";
  const habitacionNombre = reserva.habitacion?.nombre || reserva.habitacion?.NombreHabitacion || "Habitación reservada";
  
  if (!clienteEmail) return;

  const total = reserva.total ? `$${Number(reserva.total).toLocaleString('es-CO')}` : "Por definir";
  const idReserva = reserva.id_reserva || reserva.IDReserva;

  const subject = "Confirmación de Pago de Reserva - Via Luna Hospedaje";
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #258a60; margin: 0;">¡Pago Confirmado!</h1>
        <p style="color: #666; font-size: 16px;">Via Luna Hospedaje</p>
      </div>
      
      <p style="font-size: 16px; color: #333;">Hola <strong>${nombreCliente}</strong>,</p>
      <p style="font-size: 16px; color: #333; line-height: 1.6;">Hemos registrado exitosamente el pago para tu reserva de la habitación <strong>${habitacionNombre}</strong>.</p>
      
      <div style="background-color: #f4fdf8; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #258a60;">
        <p style="margin: 8px 0; font-size: 15px;"><strong>Código de Reserva:</strong> #${idReserva}</p>
        <p style="margin: 8px 0; font-size: 15px;"><strong>Estado:</strong> Pagada / Aceptada</p>
        <p style="margin: 8px 0; font-size: 15px;"><strong>Monto Pagado:</strong> ${total}</p>
      </div>
      
      <p style="font-size: 16px; color: #333; line-height: 1.6;">¡Todo está listo para tu llegada! Si tienes alguna consulta adicional, no dudes en contactarnos.</p>
      
      <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 30px 0;">
      <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">© ${new Date().getFullYear()} Via Luna Hospedaje. Todos los derechos reservados.</p>
    </div>
  `;

  try {
    await sendEmail(clienteEmail, subject, html);
    console.log(`[EmailService] ✅ Correo de confirmación de pago enviado a: ${clienteEmail}`);
  } catch (error) {
    console.error(`[EmailService] ❌ Error enviando confirmación de pago a ${clienteEmail}:`, error.response?.body || error.message || error);
  }
}

module.exports = {
  enviarConfirmacionReserva,
  enviarCorreoRecuperacion,
  enviarBienvenida,
  enviarCancelacionReserva,
  enviarConfirmacionPago,
};
