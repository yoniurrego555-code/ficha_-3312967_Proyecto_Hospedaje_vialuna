const db = require("../config/db");

const ESTADO_RECHAZADA = 6;
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
  // Usar fecha LOCAL del servidor para evitar discrepancias de zona horaria.
  // new Date().toISOString() devuelve UTC, lo que puede dar una fecha
  // diferente a la local si son las 11pm-5am en horarios UTC-X.
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const dd   = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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
  const hasMotivoCancelacion = reservationColumns.has("motivo_cancelacion");
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
        c.Telefono AS ClienteTelefono,
        ${hasMotivoCancelacion ? "r.motivo_cancelacion," : "NULL AS motivo_cancelacion,"}
        r.estado_pago,
        r.comprobante_url,
        r.fecha_pago,
        r.observacion_pago
      FROM reservas r
      LEFT JOIN clientes c
        ON c.NroDocumento = r.nr_documento
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
    motivo_cancelacion: row.motivo_cancelacion || null,
    estado: {
      id: row.id_estado_reserva,
      nombre: row.NombreEstadoReserva || "Sin estado"
    },
    id_estado_reserva: row.id_estado_reserva,
    estado_pago: row.estado_pago || 'Pendiente',
    comprobante_url: row.comprobante_url || null,
    fecha_pago: row.fecha_pago ? normalizeDate(row.fecha_pago) : null,
    observacion_pago: row.observacion_pago || null,
    id_metodo_pago: row.id_metodo_pago,
    id_habitacion: row.id_habitacion,
    metodoPago: {
      id: row.id_metodo_pago,
      nombre: row.NomMetodoPago || "Sin metodo"
    },
    habitacion: row.id_habitacion
      ? {
          id: row.id_habitacion,
          id_habitacion: row.id_habitacion,
          IDHabitacion: row.id_habitacion,
          nombre: row.NombreHabitacion,
          NombreHabitacion: row.NombreHabitacion,
          descripcion: row.DescripcionHabitacion,
          costo: Number(row.CostoHabitacion || 0),
          precio: Number(row.CostoHabitacion || 0),
          Costo: Number(row.CostoHabitacion || 0)
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

  // ── Comparación de fechas segura en zona horaria ─────────────────────────
  // new Date("YYYY-MM-DD") parsea como UTC midnight.
  // new Date("YYYY-MM-DDT00:00:00") (sin Z) parsea como hora LOCAL.
  // Mezclar ambos provoca falsos positivos de "fechas pasadas".
  // Solución: comparar como cadenas YYYY-MM-DD (lexicográficamente equivalente).
  const fechaInicioStr = String(data.fecha_inicio || '').slice(0, 10);
  const fechaFinStr    = String(data.fecha_fin    || '').slice(0, 10);
  const fechaHoyStr    = getTodayDateString(); // fecha local del servidor

  // Crear Date objects a mediodía para cálculo de noches (evita problemas de DST)
  const fechaInicio = new Date(`${fechaInicioStr}T12:00:00`);
  const fechaFin    = new Date(`${fechaFinStr}T12:00:00`);



  if (Number.isNaN(fechaInicio.getTime()) || Number.isNaN(fechaFin.getTime())) {
    throw buildError("Las fechas de la reserva no son validas");
  }

  // Comparación como string YYYY-MM-DD: '2026-06-05' < '2026-06-10' → true
  if (!options.isUpdate && fechaInicioStr < fechaHoyStr) {
    throw buildError("No se pueden crear reservas en fechas pasadas");
  }

  if (fechaFinStr <= fechaInicioStr) {
    throw buildError("La fecha final debe ser mayor a la fecha inicial");
  }

  // VALIDACIÓN DE CONFLICTOS DE HABITACIÓN
  if ([1, 2, 3, 4].includes(idEstadoReserva)) {
    let queryConflictos = `
      SELECT id_reserva
      FROM reservas
      WHERE id_habitacion = ?
        AND id_estado_reserva IN (1, 2, 3, 4)
        AND fecha_inicio < ?
        AND fecha_fin > ?
    `;
    let paramsConflictos = [idHabitacion, fechaFinStr, fechaInicioStr];

    if (options.isUpdate && options.reservationId) {
      queryConflictos += " AND id_reserva != ?";
      paramsConflictos.push(options.reservationId);
    }

    const [conflictosRows] = await connection.query(queryConflictos, paramsConflictos);

    if (conflictosRows.length > 0) {
      throw buildError("La habitacion no esta disponible para las fechas seleccionadas");
    }
  }

  let queryCliente = "SELECT * FROM clientes WHERE NroDocumento = ?";
  if (!options.isUpdate) queryCliente += " AND Estado = 1";
  queryCliente += " LIMIT 1";

  let queryHabitacion = "SELECT * FROM habitacion WHERE IDHabitacion = ?";
  if (!options.isUpdate) queryHabitacion += " AND Estado = 1";
  queryHabitacion += " LIMIT 1";

  const [clientes] = await connection.query(queryCliente, [String(idCliente)]);
  const [habitaciones] = await connection.query(queryHabitacion, [idHabitacion]);
  const [metodosPago] = await connection.query(
    "SELECT * FROM metodopago WHERE IdMetodoPago = ? LIMIT 1",
    [idMetodoPago]
  );
  const [estadosReserva] = await connection.query(
    "SELECT * FROM estadosreserva WHERE IdEstadoReserva = ? LIMIT 1",
    [idEstadoReserva]
  );

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
      `,
      paquetesIds
    );

    if (rows.length !== paquetesIds.length) {
      throw buildError("Uno o mas paquetes seleccionados no existen", 404);
    }

    let prevPaqMap = new Map();
    if (options.isUpdate && options.reservationId) {
      const [prev] = await connection.query(`SELECT IDPaquete, sub_total, cantidad FROM detalledereservapaquetes WHERE id_reserva = ?`, [options.reservationId]);
      prev.forEach(p => prevPaqMap.set(p.IDPaquete, Number(p.sub_total) / (Number(p.cantidad) || 1)));
    }

    paquetes = rows.map((row) => ({
      id: row.IDPaquete,
      nombre: row.NombrePaquete,
      descripcion: row.Descripcion,
      precio: prevPaqMap.has(row.IDPaquete) ? prevPaqMap.get(row.IDPaquete) : Number(row.Precio || 0),
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
      `,
      serviciosIds
    );

    if (rows.length !== serviciosIds.length) {
      throw buildError("Uno o mas servicios seleccionados no existen", 404);
    }

    let prevSvcMap = new Map();
    if (options.isUpdate && options.reservationId) {
      const [prev] = await connection.query(`SELECT IDServicio, Precio FROM detallereservaservicio WHERE IDReserva = ?`, [options.reservationId]);
      prev.forEach(s => prevSvcMap.set(s.IDServicio, Number(s.Precio)));
    }

    servicios = rows.map((row) => ({
      id: row.IDServicio,
      nombre: row.NombreServicio,
      descripcion: row.Descripcion,
      duracion: row.Duracion,
      cantidadMaximaPersonas: row.CantidadMaximaPersonas,
      costo: prevSvcMap.has(row.IDServicio) ? prevSvcMap.get(row.IDServicio) : Number(row.Costo || 0)
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
  const totalHabitacion = noches > 0 ? (noches * Number(habitacion.Costo || 0)) : 0;
  const totalPaquetes = paquetes.reduce((acc, paquete) => acc + paquete.precio, 0);
  const totalServicios = servicios.reduce((acc, servicio) => acc + servicio.costo, 0);
  const totalCalculado = totalHabitacion + totalPaquetes + totalServicios;

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
      total: data.total !== undefined ? Number(data.total) : totalCalculado
    },
    paquetes,
    servicios
  };
}

async function guardarDetalles(connection, reservationId, paquetes, servicios) {
  if (paquetes.length) {
    for (const paquete of paquetes) {
      await connection.query(
        `
          INSERT INTO detalledereservapaquetes
            (sub_total, id_reserva, cantidad, IDPaquete)
          VALUES (?, ?, ?, ?)
        `,
        [paquete.precio, reservationId, 1, paquete.id]
      );
    }
  }

  if (servicios.length) {
    for (const servicio of servicios) {
      await connection.query(
        `
          INSERT INTO detallereservaservicio
            (IDReserva, Cantidad, Precio, Estado, IDServicio, NombreServicio)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [reservationId, 1, servicio.costo, "Activo", servicio.id, servicio.nombre]
      );
    }
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
    const hasAceptaTerminos = reservationColumns.has("acepta_terminos");
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
      "id_habitacion",
      "estado_pago",
      "comprobante_url",
      "fecha_pago",
      "observacion_pago",
      ...(hasAceptaTerminos ? ["acepta_terminos"] : [])
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
      payload.reserva.id_habitacion,
      data.estado_pago || 'Pendiente',
      data.comprobante_url || null,
      data.fecha_pago || null,
      data.observacion_pago || null,
      ...(hasAceptaTerminos ? [data.acepta_terminos || 0] : [])
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
      "SELECT id_reserva, fecha_reserva, id_estado_reserva FROM reservas WHERE id_reserva = ? LIMIT 1",
      [id]
    );

    if (!existingRows.length) {
      throw buildError("La reserva no existe", 404);
    }

    const currentState = Number(existingRows[0].id_estado_reserva);
    const newState = Number(data.id_estado_reserva || currentState);

    if (currentState !== newState) {
        if (currentState === 1 && ![2, 6, 7].includes(newState)) {
            throw buildError("Desde Pendiente solo se puede pasar a Confirmada, Rechazada o Cancelada");
        } else if (currentState === 2 && ![3, 6, 7].includes(newState)) {
            throw buildError("Desde Confirmada solo se puede pasar a En Proceso, Rechazada o Cancelada");
        } else if (currentState === 3 && newState !== 4) {
            throw buildError("Desde En Proceso solo se puede pasar a Completada");
        } else if (currentState === 4 && newState !== 5) {
            throw buildError("Desde Completada solo se puede pasar a Finalizada");
        } else if (currentState === 5) {
            throw buildError("Una reserva Finalizada no puede cambiar de estado");
        } else if (currentState === 6 && newState !== 1) {
            throw buildError("Una reserva Rechazada solo puede volver a Pendiente");
        } else if (currentState === 7) {
            throw buildError("Una reserva Cancelada no puede cambiar de estado");
        }
    }

    const payload = await validarReserva(connection, data, {
      fechaReserva: normalizeDate(existingRows[0].fecha_reserva),
      isUpdate: true,
      reservationId: id
    });
    const hasHoraEntrada = reservationColumns.has("hora_entrada");
    const hasHoraSalida = reservationColumns.has("hora_salida");
    const hasAceptaTerminos = reservationColumns.has("acepta_terminos");
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
      "id_habitacion = ?",
      "estado_pago = ?",
      "comprobante_url = ?",
      "fecha_pago = ?",
      "observacion_pago = ?",
      ...(hasAceptaTerminos && data.acepta_terminos !== undefined ? ["acepta_terminos = ?"] : [])
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
      data.estado_pago !== undefined ? data.estado_pago : existingRows[0].estado_pago,
      data.comprobante_url !== undefined ? data.comprobante_url : existingRows[0].comprobante_url,
      data.fecha_pago !== undefined ? data.fecha_pago : existingRows[0].fecha_pago,
      data.observacion_pago !== undefined ? data.observacion_pago : existingRows[0].observacion_pago,
      ...(hasAceptaTerminos && data.acepta_terminos !== undefined ? [data.acepta_terminos || 0] : []),
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

    // Si la reserva pasa a estado 5 (Finalizada), liberar la habitación
    if (Number(payload.reserva.id_estado_reserva) === 5) {
      await connection.query("UPDATE habitacion SET Estado = 1 WHERE IDHabitacion = ?", [payload.reserva.id_habitacion]);
    }

    await connection.commit();

    return obtenerPorId(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function eliminar(id, motivo = null) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const reservationColumns = await getReservationColumns();
    const hasMotivoCancelacion = reservationColumns.has("motivo_cancelacion");
    
    // Soft delete: actualizar el estado a 6 (Rechazada/Cancelada) y guardar el motivo
    let updateQuery;
    let updateParams;
    
    // Intentaremos guardar el motivo si la base de datos lo soporta, o simplemente actualizamos el estado.
    if (motivo && hasMotivoCancelacion) {
      updateQuery = "UPDATE reservas SET id_estado_reserva = 2, motivo_cancelacion = ? WHERE id_reserva = ?";
      updateParams = [motivo, id];
    } else {
      updateQuery = "UPDATE reservas SET id_estado_reserva = 2 WHERE id_reserva = ?";
      updateParams = [id];
    }
    
    const [result] = await connection.query(updateQuery, updateParams);
    
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  obtener,
  obtenerPorId,
  obtenerPorUsuario,
  crear,
  actualizar,
  eliminar
};
