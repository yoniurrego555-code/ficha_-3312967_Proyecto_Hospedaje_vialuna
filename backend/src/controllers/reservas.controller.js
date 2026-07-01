const service = require("../services/reservas.service");
const sendEmail = require("../utils/sendEmail");

function handleError(res, error, fallbackMessage) {
  console.error(fallbackMessage, error);
  res.status(error.status || 500).json({
    error: error.message || fallbackMessage
  });
}

exports.listar = async (req, res) => {
  try {
    const reservas = await service.listar(req.query);
    res.json(reservas);
  } catch (error) {
    handleError(res, error, "Error al listar reservas");
  }
};

exports.obtener = async (req, res) => {
  try {
    const reserva = await service.obtener(req.params.id);

    if (!reserva) {
      return res.status(404).json({ error: "La reserva no existe" });
    }

    res.json(reserva);
  } catch (error) {
    handleError(res, error, "Error al obtener la reserva");
  }
};

exports.obtenerPorUsuario = async (req, res) => {
  try {
    const reservas = await service.obtenerPorUsuario(req.params.id);
    res.json(reservas);
  } catch (error) {
    handleError(res, error, "Error al obtener las reservas del usuario");
  }
};

exports.crear = async (req, res) => {
  try {
    if (req.auth && String(req.auth.rol).toLowerCase() === 'cliente') {
      req.body.id_cliente = req.auth.sub || req.auth.id_cliente || req.auth.id || req.auth.IDCliente;
    }
    
    // Forzar siempre el estado a Pendiente (ID 1) al crear reserva
    req.body.id_estado_reserva = 1;
    
    const reserva = await service.crear(req.body);
    res.status(201).json({
      mensaje: "Reserva creada correctamente",
      reserva
    });
  } catch (error) {
    handleError(res, error, "Error al crear la reserva");
  }
};

exports.actualizar = async (req, res) => {
  try {
    // PROTECCIÓN: Si el usuario es cliente, forzar el id_cliente desde el token
    if (req.auth && String(req.auth.rol).toLowerCase() === 'cliente') {
      req.body.id_cliente = req.auth.sub || req.auth.id_cliente || req.auth.id || req.auth.IDCliente;
    }
    const reserva = await service.actualizar(req.params.id, req.body);
    res.json({
      mensaje: "Reserva actualizada correctamente",
      reserva
    });
  } catch (error) {
    handleError(res, error, "Error al actualizar la reserva");
  }
};

exports.eliminar = async (req, res) => {
  try {
    const motivo = req.body ? req.body.motivo_cancelacion : null;
    const result = await service.eliminar(req.params.id, motivo);

    if (!result.affectedRows) {
      return res.status(404).json({
        error: "La reserva no existe"
      });
    }

    res.json({
      mensaje: "Reserva cancelada correctamente"
    });
  } catch (error) {
    handleError(res, error, "Error al cancelar la reserva");
  }
};

exports.subirComprobante = async (req, res) => {
  try {
    const reserva = await service.obtener(req.params.id);
    if (!reserva) {
      return res.status(404).json({ error: "La reserva no existe" });
    }
    
    // Validar propiedad de la reserva si es cliente
    if (req.auth && String(req.auth.rol).toLowerCase() === 'cliente') {
      const clientId = req.auth.sub || req.auth.id_cliente || req.auth.id || req.auth.IDCliente;
      if (String(reserva.id_cliente) !== String(clientId) && String(reserva.nr_documento) !== String(clientId)) {
        return res.status(403).json({ error: "No tienes permisos para esta reserva" });
      }
    }

    if (!req.file) {
      return res.status(400).json({ error: "No se ha subido ningún archivo" });
    }

    const fileUrl = `/uploads/comprobantes/reserva-${req.params.id}/${req.file.filename}`;
    
    await service.actualizar(req.params.id, {
      ...reserva, // Spread existing fields just in case
      estado_pago: 'En revisión',
      comprobante_url: fileUrl,
      fecha_pago: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });

    res.json({
      mensaje: "Comprobante subido correctamente y pago en revisión.",
      comprobante_url: fileUrl
    });
  } catch (error) {
    handleError(res, error, "Error al subir el comprobante");
  }
};

exports.actualizarEstadoPago = async (req, res) => {
  try {
    const { estado_pago, observacion_pago } = req.body;
    const reserva = await service.obtener(req.params.id);
    
    if (!reserva) {
      return res.status(404).json({ error: "La reserva no existe" });
    }

    const updates = { estado_pago, observacion_pago };

    // Si se aprueba el pago y la reserva está pendiente, pasar a confirmada (estado 2)
    if (estado_pago === 'Pagado' && String(reserva.estado?.id) === '1') {
      updates.id_estado_reserva = 2; // Confirmada
    } else if (estado_pago === 'Rechazado' && ['1', '2'].includes(String(reserva.estado?.id))) {
      updates.id_estado_reserva = 6; // Rechazada
    }

    await service.actualizar(req.params.id, {
      ...reserva,
      ...updates
    });

    // Send email notification for Pagado
    if (estado_pago === 'Pagado' && reserva.cliente?.email) {
      try {
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
            <h2 style="color: #258a60; text-align: center;">¡Pago Aprobado!</h2>
            <p>Hola <strong>${reserva.cliente.nombre || 'Huésped'}</strong>,</p>
            <p>Nos complace informarte que hemos recibido y verificado exitosamente el pago de tu reserva en <strong>Via Luna</strong>.</p>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Código de Reserva:</strong> #${reserva.id_reserva}</p>
              <p style="margin: 5px 0;"><strong>Estado Actual:</strong> Confirmada</p>
              <p style="margin: 5px 0;"><strong>Check-in:</strong> ${reserva.fecha_inicio}</p>
              <p style="margin: 5px 0;"><strong>Check-out:</strong> ${reserva.fecha_fin}</p>
            </div>
            <p>¡Te esperamos con los brazos abiertos!</p>
            <p style="color: #6b7280; font-size: 0.85rem; text-align: center; margin-top: 30px;">
              Hospedaje Via Luna<br>
              Si tienes alguna duda, responde a este correo.
            </p>
          </div>
        `;
        await sendEmail(reserva.cliente.email, "¡Pago de Reserva Confirmado! - Via Luna", html);
      } catch (emailErr) {
        console.error("Error al enviar email de pago aprobado:", emailErr);
      }
    }

    res.json({
      mensaje: `Estado de pago actualizado a ${estado_pago}`,
      estado_pago
    });
  } catch (error) {
    handleError(res, error, "Error al actualizar el estado de pago");
  }
};

exports.eliminarComprobante = async (req, res) => {
  try {
    const reserva = await service.obtener(req.params.id);
    if (!reserva) {
      return res.status(404).json({ error: "La reserva no existe" });
    }

    if (reserva.comprobante_url) {
      const fs = require('fs');
      const path = require('path');
      const filename = reserva.comprobante_url.replace('/uploads/comprobantes/', '');
      const filePath = path.join(__dirname, '../../public/uploads/comprobantes', filename);
      
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error("Error eliminando archivo:", err);
      }
    }

    await service.actualizar(req.params.id, {
      ...reserva,
      estado_pago: 'Pendiente',
      comprobante_url: null,
      fecha_pago: null,
      observacion_pago: null
    });

    res.json({
      mensaje: "Comprobante retirado correctamente. El estado de pago volvió a Pendiente."
    });
  } catch (error) {
    handleError(res, error, "Error al eliminar el comprobante");
  }
};

exports.subirPagoAdicional = async (req, res) => {
  try {
    const db = require('../config/db');
    const reserva = await service.obtener(req.params.id);
    if (!reserva) {
      return res.status(404).json({ error: "La reserva no existe" });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: "No se proporcionó ningún archivo." });
    }

    const comprobante_url = `/uploads/comprobantes/reserva-${req.params.id}/${req.file.filename}`;
    const monto = req.body.monto ? Number(req.body.monto) : Number(reserva.saldo_pendiente || 0);

    await db.query(`
      INSERT INTO pagos_adicionales (id_reserva, monto, comprobante_url, estado, fecha_pago)
      VALUES (?, ?, ?, 'Pendiente', NOW())
    `, [req.params.id, monto, comprobante_url]);

    res.status(201).json({ mensaje: "Comprobante adicional subido exitosamente y enviado a revisión." });
  } catch (error) {
    handleError(res, error, "Error subiendo pago adicional");
  }
};

exports.actualizarEstadoPagoAdicional = async (req, res) => {
  try {
    const db = require('../config/db');
    const { estado, observacion } = req.body;
    const idPago = req.params.idPago;

    if (!['Aprobado', 'Rechazado'].includes(estado)) {
      return res.status(400).json({ error: "Estado inválido." });
    }

    const [pagos] = await db.query("SELECT * FROM pagos_adicionales WHERE id_pago = ?", [idPago]);
    if (!pagos.length) {
      return res.status(404).json({ error: "El pago no existe" });
    }

    const pago = pagos[0];
    if (pago.estado === 'Aprobado') {
      return res.status(400).json({ error: "Este pago ya fue aprobado anteriormente" });
    }

    await db.query(`
      UPDATE pagos_adicionales 
      SET estado = ?, observacion = ?
      WHERE id_pago = ?
    `, [estado, observacion || null, idPago]);

    if (estado === 'Aprobado') {
      const reserva = await service.obtener(pago.id_reserva);
      if (reserva) {
        const nuevoMontoPagado = Number(reserva.monto_pagado || 0) + Number(pago.monto);
        let nuevoSaldoPendiente = Number(reserva.total || 0) - nuevoMontoPagado;
        if (nuevoSaldoPendiente < 0) nuevoSaldoPendiente = 0;
        
        let nuevoEstadoPago = 'Pendiente Parcial';
        let queryParams = [nuevoMontoPagado, nuevoSaldoPendiente, nuevoEstadoPago];
        let setQuery = "monto_pagado = ?, saldo_pendiente = ?, estado_pago = ?";

        if (nuevoSaldoPendiente <= 0) {
           nuevoEstadoPago = 'Confirmado';
           queryParams = [nuevoMontoPagado, nuevoSaldoPendiente, nuevoEstadoPago, 2];
           setQuery = "monto_pagado = ?, saldo_pendiente = ?, estado_pago = ?, id_estado_reserva = ?";
        }

        queryParams.push(pago.id_reserva);

        await db.query(`
           UPDATE reservas 
           SET ${setQuery}
           WHERE id_reserva = ?
        `, queryParams);
      }
    }

    res.json({ mensaje: `Pago adicional ${estado.toLowerCase()} exitosamente.` });
  } catch (error) {
    handleError(res, error, "Error actualizando pago adicional");
  }
};
