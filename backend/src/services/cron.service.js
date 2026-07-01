// src/services/cron.service.js
// Esquema real verificado desde reservas.model.js:
//   tabla:    reservas         → columnas: id_reserva, nr_documento, id_habitacion, id_estado_reserva, fecha_creacion, motivo_cancelacion
//   tabla:    clientes         → PK: NroDocumento  | columnas: Nombre, Apellido, Email
//   tabla:    habitacion       → PK: IDHabitacion  | columna: NombreHabitacion
//   join:     reservas r LEFT JOIN clientes c ON CAST(c.NroDocumento AS CHAR) = CAST(r.nr_documento AS CHAR)
//   join:     reservas r LEFT JOIN habitacion h ON h.IDHabitacion = r.id_habitacion
//   estado 5  = Pendiente → se cancela (estado 2) si lleva > 30 minutos sin confirmarse

const cron = require('node-cron');
const db = require('../config/db');
const { enviarCancelacionReserva } = require('./email.service');

/**
 * Busca reservas en estado "Pendiente" (5) con más de 30 min de antigüedad
 * y las cancela una por una, enviando el correo de expiración.
 */
async function cancelarReservasPendientesExpiradas() {
  let connection;
  try {
    connection = await db.getConnection();

    // ── 1. Buscar reservas candidatas ────────────────────────────────────────
    // Se usa el mismo patrón de JOIN que reservas.model.js para garantizar
    // compatibilidad con el collation de TiDB/MySQL.
    const [reservas] = await connection.query(`
      SELECT
        r.id_reserva,
        r.nr_documento,
        r.id_habitacion,
        r.fecha_creacion,
        c.Nombre      AS cliente_nombre,
        c.Apellido    AS cliente_apellido,
        c.Email       AS cliente_email,
        h.NombreHabitacion AS habitacion_nombre
      FROM reservas r
      LEFT JOIN clientes c
        ON CAST(c.NroDocumento AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci =
           CAST(r.nr_documento  AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci
      LEFT JOIN habitacion h
        ON h.IDHabitacion = r.id_habitacion
      WHERE r.id_estado_reserva = 1
        AND r.id_metodo_pago = 3
        AND (r.estado_pago = 'Pendiente' OR r.comprobante_url IS NULL)
        AND r.fecha_creacion <= NOW() - INTERVAL 30 MINUTE
    `);

    if (!reservas.length) {
      // Sin reservas expiradas — silencio (no spamear logs en cada minuto)
      return;
    }

    console.log(`[Cron] ⏰ ${new Date().toLocaleString('es-CO')} — Encontradas ${reservas.length} reserva(s) pendiente(s) expirada(s). Cancelando...`);

    // ── 2. Cancelar una por una ───────────────────────────────────────────────
    for (const reserva of reservas) {
      const motivo = 'Cancelación automática: tiempo límite de confirmación excedido (30 min)';
      try {
        const [columnRows] = await connection.query("SHOW COLUMNS FROM reservas LIKE 'motivo_cancelacion'");
        const hasMotivoCancelacion = columnRows.length > 0;

        if (hasMotivoCancelacion) {
          await connection.query(
            `UPDATE reservas
             SET id_estado_reserva = 6,
                 motivo_cancelacion = ?
             WHERE id_reserva = ? AND id_estado_reserva = 1`,
            [motivo, reserva.id_reserva]
          );
        } else {
          await connection.query(
            `UPDATE reservas
             SET id_estado_reserva = 6
             WHERE id_reserva = ? AND id_estado_reserva = 1`,
            [reserva.id_reserva]
          );
        }

        console.log(`[Cron] ✅ Reserva #${reserva.id_reserva} cancelada (doc: ${reserva.nr_documento}, hab: ${reserva.habitacion_nombre || 'N/A'}).`);

        // ── 3. Enviar correo de expiración ────────────────────────────────────
        const reservaHidratada = {
          id_reserva: reserva.id_reserva,
          IDReserva:  reserva.id_reserva,
          cliente: {
            email:         reserva.cliente_email,
            nombreCompleto: [reserva.cliente_nombre, reserva.cliente_apellido].filter(Boolean).join(' ').trim() || 'Huésped',
          },
          habitacion: {
            nombre:          reserva.habitacion_nombre || 'Habitación no especificada',
            NombreHabitacion: reserva.habitacion_nombre || 'Habitación no especificada',
          },
        };

        enviarCancelacionReserva(reservaHidratada, motivo).catch((err) => {
          console.warn(`[Cron] ⚠️  No se pudo enviar correo para reserva #${reserva.id_reserva}:`, err.message);
        });

      } catch (rowErr) {
        console.error(`[Cron] ❌ Error al cancelar reserva #${reserva.id_reserva}:`, rowErr.message, rowErr);
      }
    }

  } catch (queryErr) {
    console.error('[Cron] ❌ Error general en el job de reservas:', queryErr.message, queryErr);
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Registra el cron job y lo inicia.
 * Llamar desde server.js una vez que la DB esté conectada.
 */
function initCronJobs() {
  // Ejecutar cada minuto
  cron.schedule('* * * * *', cancelarReservasPendientesExpiradas, {
    timezone: 'America/Bogota',
  });

  console.log('[Cron] ✅ Servicio de verificación de reservas iniciado — schedule: cada minuto (America/Bogota).');
}

module.exports = { initCronJobs };
