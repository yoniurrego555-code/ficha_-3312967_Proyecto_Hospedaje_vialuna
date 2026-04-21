const db = require("../config/db");

const ESTADO_CANCELADA = 2;
let reservationColumnsPromise = null;

function buildError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString().slice(0, 10);
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeIds(items) {
  return [...new Set(
    (Array.isArray(items) ? items : [])
      .map((item) => Number(typeof item === "object" ? item.id || item.IDPaquete || item.IDServicio : item))
      .filter(Number.isInteger)
  )];
}

async function getReservationColumns() {
  if (!reservationColumnsPromise) {
    reservationColumnsPromise = db.query("SHOW COLUMNS FROM reservas")
      .then(([rows]) => new Set(rows.map((row) => row.Field)))
      .catch((error) => {
        reservationColumnsPromise = null;
        throw error;
      });
  }

  return reservationColumnsPromise;
}

function normalizeTime(value) {
  if (!value) {
    return null;
  }

  return String(value).slice(0, 5);
}

async function obtenerReservasBase(connection, whereClause = "", params = []) {
  const reservationColumns = await getReservationColumns();
  const hasHoraEntrada = reservationColumns.has("hora_entrada");
  const hasHoraSalida = reservationColumns.has("hora_salida");
  const [rows] = await connection.query(
    `
      SELECT
        r.id_reserva,
        r.id_cliente,
        r.nr_documento,
        r.fecha_reserva,
        r.fecha_inicio,
        r.fecha_fin,
        ${hasHoraEntrada ? "r.hora_entrada," : "NULL AS hora_entrada,"}
        ${hasHoraSalida ? "r.hora_salida," : "NULL AS hora_salida,"}
        r.id_estado_reserva,
        er.NombreEstadoReserva,
        r.total,
        r.id_metodo_pago,
        mp.NomMetodoPago,
        r.id_habitacion,
        h.NombreHabitacion,
        h.Descripcion AS DescripcionHabitacion,
        h.Costo AS CostoHabitacion,
        c.NroDocumento AS ClienteDocumento,
        c.Nombre AS ClienteNombre,
        c.Apellido AS ClienteApellido,
        c.Email AS ClienteEmail,
        c.Telefono AS ClienteTelefono
      FROM reservas r
      LEFT JOIN clientes c
        ON CAST(c.NroDocumento AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci =
           CAST(r.nr_documento AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci
      LEFT JOIN habitacion h
        ON h.IDHabitacion = r.id_habitacion
      LEFT JOIN metodopago mp
        ON mp.IdMetodoPago = r.id_metodo_pago
      LEFT JOIN estadosreserva er
        ON er.IdEstadoReserva = r.id_estado_reserva
      ${whereClause}
      ORDER BY r.id_reserva DESC
    `,
    params
  );

  return rows;
}

async function obtenerPaquetesPorReserva(connection, reservationIds) {
  if (!reservationIds.length) {
    return new Map();
  }

  const placeholders = reservationIds.map(() => "?").join(",");
  const [rows] = await connection.query(
    `
      SELECT
        drp.id_reserva,
        drp.id_detalle,
        drp.cantidad,
        drp.sub_total,
        p.IDPaquete,
        p.NombrePaquete,
        p.Descripcion,
        p.Precio,
        s.IDServicio AS ServicioIncluidoId,
        s.NombreServicio AS ServicioIncluidoNombre,
        s.Descripcion AS ServicioIncluidoDescripcion
      FROM detalledereservapaquetes drp
      INNER JOIN paquetes p
        ON p.IDPaquete = drp.IDPaquete
      LEFT JOIN servicios s
        ON s.IDServicio = p.IDServicio
      WHERE drp.id_reserva IN (${placeholders})
      ORDER BY drp.id_reserva, p.NombrePaquete
    `,
    reservationIds
  );

  const packagesByReservation = new Map();

  rows.forEach((row) => {
    const current = packagesByReservation.get(row.id_reserva) || [];
    current.push({
      id_detalle: row.id_detalle,
      id: row.IDPaquete,
      nombre: row.NombrePaquete,
      descripcion: row.Descripcion,
      precio: Number(row.Precio || 0),
      cantidad: Number(row.cantidad || 1),
      total: Number(row.sub_total || 0),
      servicioIncluido: row.ServicioIncluidoId
        ? {
            id: row.ServicioIncluidoId,
            nombre: row.ServicioIncluidoNombre,
            descripcion: row.ServicioIncluidoDescripcion
          }
        : null
    });
    packagesByReservation.set(row.id_reserva, current);
  });

  return packagesByReservation;
}

async function obtenerServiciosPorReserva(connection, reservationIds) {
  if (!reservationIds.length) {
    return new Map();
  }

  const placeholders = reservationIds.map(() => "?").join(",");
  const [rows] = await connection.query(
    `
      SELECT
        drs.IDReserva AS id_reserva,
        drs.IDDetalleReservaServicio,
        drs.Cantidad,
        drs.Precio,
        drs.Estado,
        s.IDServicio,
        s.NombreServicio,
        s.Descripcion,
        s.Duracion,
        s.CantidadMaximaPersonas,
        s.Costo
      FROM detallereservaservicio drs
      INNER JOIN servicios s
        ON s.IDServicio = drs.IDServicio
      WHERE drs.IDReserva IN (${placeholders})
      ORDER BY drs.IDReserva, s.NombreServicio
    `,
    reservationIds
  );

  const servicesByReservation = new Map();

  rows.forEach((row) => {
    const current = servicesByReservation.get(row.id_reserva) || [];
    current.push({
      id_detalle: row.IDDetalleReservaServicio,
      id: row.IDServicio,
      nombre: row.NombreServicio,
      descripcion: row.Descripcion,
      duracion: row.Duracion,
      cantidadMaximaPersonas: row.CantidadMaximaPersonas,
      costo: Number(row.Costo || 0),
      precioGuardado: Number(row.Precio || 0),
      cantidad: Number(row.Cantidad || 1),
      estado: row.Estado || "Activo"
    });
    servicesByReservation.set(row.id_reserva, current);
  });

  return servicesByReservation;
}

async function hidratarReservas(connection, rows) {
  if (!rows.length) {
    return [];
  }

  const reservationIds = rows.map((row) => row.id_reserva);
  const [packagesByReservation, servicesByReservation] = await Promise.all([
    obtenerPaquetesPorReserva(connection, reservationIds),
    obtenerServiciosPorReserva(connection, reservationIds)
  ]);

  return rows.map((row) => ({
    id_reserva: row.id_reserva,
    id_cliente: row.id_cliente,
    nr_documento: row.nr_documento,
    fecha_reserva: normalizeDate(row.fecha_reserva),
    fecha_inicio: normalizeDate(row.fecha_inicio),
    fecha_fin: normalizeDate(row.fecha_fin),
    hora_entrada: normalizeTime(row.hora_entrada),
    hora_salida: normalizeTime(row.hora_salida),
    total: Number(row.total || 0),
    estado: {
      id: row.id_estado_reserva,
      nombre: row.NombreEstadoReserva || "Sin estado"
    },
    metodoPago: {
      id: row.id_metodo_pago,
      nombre: row.NomMetodoPago || "Sin metodo"
    },
    habitacion: row.id_habitacion
      ? {
          id: row.id_habitacion,
          nombre: row.NombreHabitacion,
          descripcion: row.DescripcionHabitacion,
          costo: Number(row.CostoHabitacion || 0)
        }
      : null,
    cliente: {
      id: row.id_cliente,
      nroDocumento: row.ClienteDocumento || String(row.id_cliente || ""),
      nombre: row.ClienteNombre || "",
      apellido: row.ClienteApellido || "",
      nombreCompleto: `${row.ClienteNombre || ""} ${row.ClienteApellido || ""}`.trim(),
      email: row.ClienteEmail || "",
      telefono: row.ClienteTelefono || ""
    },
    paquetes: packagesByReservation.get(row.id_reserva) || [],
    servicios: servicesByReservation.get(row.id_reserva) || []
  }));
}

async function validarReserva(connection, data, options = {}) {
  const fechaReservaBase = options.fechaReserva || new Date().toISOString().slice(0, 10);
  const idCliente = Number(data.id_cliente);
  const idHabitacion = Number(data.id_habitacion);
  const idMetodoPago = Number(data.id_metodo_pago);
  const idEstadoReserva = Number(data.id_estado_reserva || 1);
  const cantidadHuespedes = Number(data.cantidad_huespedes || data.cantidadHuespedes || 1);
  const paquetesIds = normalizeIds(data.paquetes);
  const serviciosIds = normalizeIds(data.servicios);
  const horaEntrada = normalizeTime(data.hora_entrada || data.horaEntrada);
  const horaSalida = normalizeTime(data.hora_salida || data.horaSalida);

  if (!Number.isInteger(idCliente)) {
    throw buildError("Selecciona un cliente valido");
  }

  if (!Number.isInteger(idHabitacion)) {
    throw buildError("Selecciona una habitacion valida");
  }

  if (!Number.isInteger(idMetodoPago)) {
    throw buildError("Selecciona un metodo de pago valido");
  }

  if (!Number.isInteger(idEstadoReserva)) {
    throw buildError("Selecciona un estado valido");
  }

  if (!Number.isInteger(cantidadHuespedes) || cantidadHuespedes < 1) {
    throw buildError("La cantidad de huespedes debe ser valida");
  }

  if (!data.fecha_inicio || !data.fecha_fin) {
    throw buildError("Las fechas de la reserva son obligatorias");
  }

  if (horaEntrada && !/^\d{2}:\d{2}$/.test(horaEntrada)) {
    throw buildError("La hora de entrada no es valida");
  }

  if (horaSalida && !/^\d{2}:\d{2}$/.test(horaSalida)) {
    throw buildError("La hora de salida no es valida");
  }

  const fechaInicio = new Date(data.fecha_inicio);
  const fechaFin = new Date(data.fecha_fin);
  const fechaHoy = new Date(`${getTodayDateString()}T00:00:00`);

  if (Number.isNaN(fechaInicio.getTime()) || Number.isNaN(fechaFin.getTime())) {
    throw buildError("Las fechas de la reserva no son validas");
  }

  if (fechaInicio < fechaHoy) {
    throw buildError("No se pueden crear reservas en fechas pasadas");
  }

  if (fechaFin <= fechaInicio) {
    throw buildError("La fecha final debe ser mayor a la fecha inicial");
  }

  const [
    [clientes],
    [habitaciones],
    [metodosPago],
    [estadosReserva]
  ] = await Promise.all([
    connection.query(
      "SELECT * FROM clientes WHERE NroDocumento = ? AND Estado = 1 LIMIT 1",
      [String(idCliente)]
    ),
    connection.query(
      "SELECT * FROM habitacion WHERE IDHabitacion = ? AND Estado = 1 LIMIT 1",
      [idHabitacion]
    ),
    connection.query(
      "SELECT * FROM metodopago WHERE IdMetodoPago = ? LIMIT 1",
      [idMetodoPago]
    ),
    connection.query(
      "SELECT * FROM estadosreserva WHERE IdEstadoReserva = ? LIMIT 1",
      [idEstadoReserva]
    )
  ]);

  const cliente = clientes[0];
  const habitacion = habitaciones[0];
  const metodoPago = metodosPago[0];
  const estadoReserva = estadosReserva[0];

  if (!cliente) {
    throw buildError("El cliente seleccionado no existe o esta inactivo", 404);
  }

  if (!habitacion) {
    throw buildError("La habitacion seleccionada no existe o esta inactiva", 404);
  }

  if (cantidadHuespedes > Number(habitacion.CapacidadMaximaPersonas || 1)) {
    throw buildError(
      `La habitacion seleccionada admite maximo ${habitacion.CapacidadMaximaPersonas || 1} huesped(es)`
    );
  }

  if (!metodoPago) {
    throw buildError("El metodo de pago seleccionado no existe", 404);
  }

  if (!estadoReserva) {
    throw buildError("El estado de reserva seleccionado no existe", 404);
  }

  let paquetes = [];
  if (paquetesIds.length) {
    const placeholders = paquetesIds.map(() => "?").join(",");
    const [rows] = await connection.query(
      `
        SELECT
          p.IDPaquete,
          p.NombrePaquete,
          p.Descripcion,
          p.Precio,
          s.IDServicio AS ServicioIncluidoId,
          s.NombreServicio AS ServicioIncluidoNombre,
          s.Descripcion AS ServicioIncluidoDescripcion
        FROM paquetes p
        LEFT JOIN servicios s
          ON s.IDServicio = p.IDServicio
        WHERE p.IDPaquete IN (${placeholders})
          AND p.Estado = 1
      `,
      paquetesIds
    );

    if (rows.length !== paquetesIds.length) {
      throw buildError("Uno o mas paquetes seleccionados no existen", 404);
    }

    paquetes = rows.map((row) => ({
      id: row.IDPaquete,
      nombre: row.NombrePaquete,
      descripcion: row.Descripcion,
      precio: Number(row.Precio || 0),
      servicioIncluido: row.ServicioIncluidoId
        ? {
            id: row.ServicioIncluidoId,
            nombre: row.ServicioIncluidoNombre,
            descripcion: row.ServicioIncluidoDescripcion
          }
        : null
    }));
  }

  let servicios = [];
  if (serviciosIds.length) {
    const placeholders = serviciosIds.map(() => "?").join(",");
    const [rows] = await connection.query(
      `
        SELECT *
        FROM servicios
        WHERE IDServicio IN (${placeholders})
          AND Estado = 1
      `,
      serviciosIds
    );

    if (rows.length !== serviciosIds.length) {
      throw buildError("Uno o mas servicios seleccionados no existen", 404);
    }

    servicios = rows.map((row) => ({
      id: row.IDServicio,
      nombre: row.NombreServicio,
      descripcion: row.Descripcion,
      duracion: row.Duracion,
      cantidadMaximaPersonas: row.CantidadMaximaPersonas,
      costo: Number(row.Costo || 0)
    }));

    const servicioInvalido = servicios.find(
      (servicio) =>
        Number(servicio.cantidadMaximaPersonas || 0) > 0 &&
        cantidadHuespedes > Number(servicio.cantidadMaximaPersonas)
    );

    if (servicioInvalido) {
      throw buildError(
        `${servicioInvalido.nombre} admite maximo ${servicioInvalido.cantidadMaximaPersonas} huesped(es)`
      );
    }
  }

  const noches = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24));
  const totalHabitacion = noches * Number(habitacion.Costo || 0);
  const totalPaquetes = paquetes.reduce((acc, paquete) => acc + paquete.precio, 0);
  const totalServicios = servicios.reduce((acc, servicio) => acc + servicio.costo, 0);

  return {
    reserva: {
      id_cliente: idCliente,
      nr_documento: data.nr_documento || cliente.NroDocumento,
      fecha_reserva: data.fecha_reserva || fechaReservaBase,
      fecha_inicio: data.fecha_inicio,
      fecha_fin: data.fecha_fin,
      hora_entrada: horaEntrada,
      hora_salida: horaSalida,
      id_estado_reserva: idEstadoReserva,
      id_metodo_pago: idMetodoPago,
      id_habitacion: idHabitacion,
      total: totalHabitacion + totalPaquetes + totalServicios
    },
    paquetes,
    servicios
  };
}

async function guardarDetalles(connection, reservationId, paquetes, servicios) {
  if (paquetes.length) {
    await Promise.all(
      paquetes.map((paquete) =>
        connection.query(
          `
            INSERT INTO detalledereservapaquetes
              (sub_total, id_reserva, cantidad, IDPaquete)
            VALUES (?, ?, ?, ?)
          `,
          [paquete.precio, reservationId, 1, paquete.id]
        )
      )
    );
  }

  if (servicios.length) {
    await Promise.all(
      servicios.map((servicio) =>
        connection.query(
          `
            INSERT INTO detallereservaservicio
              (IDReserva, Cantidad, Precio, Estado, IDServicio, NombreServicio)
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          [reservationId, 1, servicio.costo, "Activo", servicio.id, servicio.nombre]
        )
      )
    );
  }
}

async function obtener() {
  const rows = await obtenerReservasBase(db);
  return hidratarReservas(db, rows);
}

async function obtenerPorId(id) {
  const rows = await obtenerReservasBase(db, "WHERE r.id_reserva = ?", [id]);
  const reservas = await hidratarReservas(db, rows);
  return reservas[0] || null;
}

async function obtenerPorUsuario(userId) {
  const normalizedUserId = String(userId || "").trim();

  if (!normalizedUserId) {
    return [];
  }

  const rows = await obtenerReservasBase(
    db,
    `
      WHERE CAST(r.id_cliente AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci = ?
         OR CAST(r.nr_documento AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci = ?
         OR CAST(c.NroDocumento AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci = ?
    `,
    [normalizedUserId, normalizedUserId, normalizedUserId]
  );

  return hidratarReservas(db, rows);
}

async function crear(data) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const reservationColumns = await getReservationColumns();
    const payload = await validarReserva(connection, data);
    const hasHoraEntrada = reservationColumns.has("hora_entrada");
    const hasHoraSalida = reservationColumns.has("hora_salida");
    const insertColumns = [
      "id_cliente",
      "nr_documento",
      "fecha_reserva",
      "fecha_inicio",
      "fecha_fin",
      ...(hasHoraEntrada ? ["hora_entrada"] : []),
      ...(hasHoraSalida ? ["hora_salida"] : []),
      "id_estado_reserva",
      "total",
      "id_metodo_pago",
      "id_habitacion"
    ];
    const insertValues = [
      payload.reserva.id_cliente,
      payload.reserva.nr_documento,
      payload.reserva.fecha_reserva,
      payload.reserva.fecha_inicio,
      payload.reserva.fecha_fin,
      ...(hasHoraEntrada ? [payload.reserva.hora_entrada] : []),
      ...(hasHoraSalida ? [payload.reserva.hora_salida] : []),
      payload.reserva.id_estado_reserva,
      payload.reserva.total,
      payload.reserva.id_metodo_pago,
      payload.reserva.id_habitacion
    ];
    const [result] = await connection.query(
      `
        INSERT INTO reservas (${insertColumns.join(", ")})
        VALUES (${insertColumns.map(() => "?").join(", ")})
      `,
      insertValues
    );

    await guardarDetalles(connection, result.insertId, payload.paquetes, payload.servicios);
    await connection.commit();

    return obtenerPorId(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function actualizar(id, data) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const reservationColumns = await getReservationColumns();
    const [existingRows] = await connection.query(
      "SELECT id_reserva, fecha_reserva FROM reservas WHERE id_reserva = ? LIMIT 1",
      [id]
    );

    if (!existingRows.length) {
      throw buildError("La reserva no existe", 404);
    }

    const payload = await validarReserva(connection, data, {
      fechaReserva: normalizeDate(existingRows[0].fecha_reserva)
    });
    const hasHoraEntrada = reservationColumns.has("hora_entrada");
    const hasHoraSalida = reservationColumns.has("hora_salida");
    const updateParts = [
      "id_cliente = ?",
      "nr_documento = ?",
      "fecha_reserva = ?",
      "fecha_inicio = ?",
      "fecha_fin = ?",
      ...(hasHoraEntrada ? ["hora_entrada = ?"] : []),
      ...(hasHoraSalida ? ["hora_salida = ?"] : []),
      "id_estado_reserva = ?",
      "total = ?",
      "id_metodo_pago = ?",
      "id_habitacion = ?"
    ];
    const updateValues = [
      payload.reserva.id_cliente,
      payload.reserva.nr_documento,
      payload.reserva.fecha_reserva,
      payload.reserva.fecha_inicio,
      payload.reserva.fecha_fin,
      ...(hasHoraEntrada ? [payload.reserva.hora_entrada] : []),
      ...(hasHoraSalida ? [payload.reserva.hora_salida] : []),
      payload.reserva.id_estado_reserva,
      payload.reserva.total,
      payload.reserva.id_metodo_pago,
      payload.reserva.id_habitacion,
      id
    ];

    await connection.query(
      `
        UPDATE reservas
        SET ${updateParts.join(", ")}
        WHERE id_reserva = ?
      `,
      updateValues
    );

    await connection.query("DELETE FROM detalledereservapaquetes WHERE id_reserva = ?", [id]);
    await connection.query("DELETE FROM detallereservaservicio WHERE IDReserva = ?", [id]);

    await guardarDetalles(connection, id, payload.paquetes, payload.servicios);
    await connection.commit();

    return obtenerPorId(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function eliminar(id) {
  const [result] = await db.query(
    `
      UPDATE reservas
      SET id_estado_reserva = ?
      WHERE id_reserva = ?
    `,
    [ESTADO_CANCELADA, id]
  );

  return result;
}

module.exports = {
  obtener,
  obtenerPorId,
  obtenerPorUsuario,
  crear,
  actualizar,
  eliminar
};
