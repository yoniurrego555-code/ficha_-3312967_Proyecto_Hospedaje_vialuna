const resend = require('../config/resend');

/**
 * Servicio para envío de correos electrónicos transaccionales usando Resend.
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
    const fromEmail = process.env.EMAIL_FROM;

    if (!fromEmail) {
      console.warn("ADVERTENCIA: process.env.EMAIL_FROM no está configurado. Se omite el envío de correos.");
      return;
    }

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
        await resend.emails.send({
          from: fromEmail,
          to: clienteEmail,
          subject: "Confirmación de Reserva - Via Luna Hospedaje",
          html: clienteHtml,
        });
        console.log(`[EmailService] ✅ Correo de confirmación enviado exitosamente al cliente: ${clienteEmail}`);
      } catch (err) {
        console.error(`[EmailService] ❌ Error enviando correo al cliente (${clienteEmail}):`, err.response?.data || err.message);
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
        await resend.emails.send({
          from: fromEmail,
          to: adminEmail,
          subject: `Nueva Reserva - ${nombreCliente} - ${habitacionNombre}`,
          html: adminHtml,
        });
        console.log(`[EmailService] ✅ Correo de notificación enviado exitosamente al administrador: ${adminEmail}`);
      } catch (err) {
        console.error(`[EmailService] ❌ Error enviando notificación al admin (${adminEmail}):`, err.response?.data || err.message);
      }
    } else {
      console.warn("[EmailService] ⚠️ process.env.ADMIN_EMAIL no está configurado. No se enviará notificación al administrador.");
    }
  } catch (error) {
    // Relanzamos el error general si falla algo antes del envío
    throw error;
  }
}

module.exports = {
  enviarConfirmacionReserva,
};
