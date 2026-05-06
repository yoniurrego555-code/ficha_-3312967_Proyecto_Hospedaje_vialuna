import {
  actualizarReserva,
  cancelarReserva,
  crearReserva,
  clienteBelongsToSession,
  getClientes,
  getEstadosReserva,
  getHabitaciones,
  getMetodosPago,
  getPaquetes,
  getReservationOwnershipFilters,
  getReservas,
  getServicios,
  getSession,
  isAdminSession,
  reservationBelongsToSession,
  sessionMatchesValue
} from "../core/api.js";
import { consumeAccessDeniedMessage, getAppUrl, logout } from "../core/authGuard.js";

const TODAY = new Date().toISOString().split("T")[0];
const ESTADO_ACTIVA = 1;
const ESTADO_CANCELADA = 2;
const routeRole = document.body.dataset.routeRole || "";
const session = getSession();
const isAdmin = isAdminSession(session);

const state = {
  clientes: [],
  cliente: null,
  habitaciones: [],
  paquetes: [],
  servicios: [],
  metodosPago: [],
  estados: [],
  reservas: [],
  selectedClientId: "",
  selectedRoomId: "",
  selectedPackageIds: new Set(),
  selectedServiceIds: new Set(),
  editingReservationId: null,
  currentStep: 1
};

const refs = {
  userName: document.getElementById("userName"),
  logoutBtn: document.getElementById("logoutBtn"),
  feedback: document.getElementById("reservaFeedback"),
  reservationsFeedback: document.getElementById("reservasFeedback"),
  form: document.getElementById("reservaForm"),
  formTitle: document.getElementById("formTitle"),
  submitBtn: document.getElementById("submitBtn"),
  resetBtn: document.getElementById("resetBtn"),
  clienteSelect: document.getElementById("cliente"),
  documentoInput: document.getElementById("documento"),
  clienteEmail: document.getElementById("clienteEmail"),
  clienteTelefono: document.getElementById("clienteTelefono"),
  cantidadHuespedes: document.getElementById("cantidadHuespedes"),
  fechaInicio: document.getElementById("fechaInicio"),
  fechaFin: document.getElementById("fechaFin"),
  horaEntrada: document.getElementById("horaEntrada"),
  horaSalida: document.getElementById("horaSalida"),
  metodoPago: document.getElementById("metodoPago"),
  estadoReserva: document.getElementById("estadoReserva"),
  habitacionesGrid: document.getElementById("habitacionesGrid"),
  habitacionDetalle: document.getElementById("habitacionDetalle"),
  paquetesGrid: document.getElementById("paquetesGrid"),
  paqueteDetalle: document.getElementById("paqueteDetalle"),
  serviciosGrid: document.getElementById("serviciosGrid"),
  servicioDetalle: document.getElementById("servicioDetalle"),
  totalReserva: document.getElementById("totalReserva"),
  cantidadHuespedesResumen: document.getElementById("cantidadHuespedesResumen"),
  cantidadNochesResumen: document.getElementById("cantidadNochesResumen"),
  totalHabitacionResumen: document.getElementById("totalHabitacionResumen"),
  detalleHabitacionResumen: document.getElementById("detalleHabitacionResumen"),
  totalPaquetesResumen: document.getElementById("totalPaquetesResumen"),
  totalServiciosResumen: document.getElementById("totalServiciosResumen"),
  clientsTable: document.getElementById("clientsTable"),
  reservasTable: document.getElementById("reservasTable"),
  profile: document.getElementById("clientProfile"),
  statusSummary: document.getElementById("statusSummary"),
  stepPills: document.querySelectorAll("[data-step-pill]"),
  stepViews: document.querySelectorAll(".step-view"),
  nextButtons: document.querySelectorAll("[data-step-next]"),
  prevButtons: document.querySelectorAll("[data-step-prev]")
};

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("es-CO");
}

function getFullName(person) {
  return `${person?.Nombre || person?.nombre || ""} ${person?.Apellido || person?.apellido || ""}`.trim();
}

function getStatusName(reserva) {
  return String(reserva?.estado?.nombre || "Sin estado").trim();
}

function setFormFeedback(message = "", type = "") {
  if (!refs.feedback) {
    return;
  }

  refs.feedback.textContent = message;
  refs.feedback.className = `feedback ${type}`.trim();
}

function setReservationsFeedback(message = "", type = "") {
  if (!refs.reservationsFeedback) {
    return;
  }

  refs.reservationsFeedback.textContent = message;
  refs.reservationsFeedback.className = `feedback ${type}`.trim();
}

function getActiveClientes() {
  return state.clientes.filter((cliente) => Number(cliente.Estado) === 1);
}

function getVisibleClientes() {
  if (isAdmin) {
    return getActiveClientes();
  }

  return getActiveClientes().filter((cliente) => clienteBelongsToSession(cliente, session));
}

function getVisibleReservas() {
  if (isAdmin) {
    return state.reservas;
  }

  return state.reservas.filter((reserva) => reservationBelongsToSession(reserva, session));
}

function getSelectedClient() {
  return getVisibleClientes().find((cliente) => String(cliente.NroDocumento) === String(state.selectedClientId)) || null;
}

function getSelectedRoom() {
  return state.habitaciones.find((habitacion) => String(habitacion.IDHabitacion) === String(state.selectedRoomId)) || null;
}

function getSelectedPackages() {
  return state.paquetes.filter((paquete) => state.selectedPackageIds.has(Number(paquete.IDPaquete)));
}

function getSelectedServices() {
  return state.servicios.filter((servicio) => state.selectedServiceIds.has(Number(servicio.IDServicio)));
}

function getGuestCount() {
  return Math.max(1, Number(refs.cantidadHuespedes?.value || 1));
}

function getStayNights() {
  if (!refs.fechaInicio?.value || !refs.fechaFin?.value) {
    return 0;
  }

  const nights = Math.ceil((new Date(refs.fechaFin.value) - new Date(refs.fechaInicio.value)) / 86400000);
  return nights > 0 ? nights : 0;
}

function getRoomStayTotal(room = getSelectedRoom()) {
  if (!room) {
    return 0;
  }

  const nights = getStayNights();
  const roomPrice = Number(room.Costo || 0);
  return nights > 0 ? nights * roomPrice : roomPrice;
}

function resolveRoomImage(imageName) {
  if (!imageName) {
    return getAppUrl("assets/images/rooms/suite-ejecutiva.svg");
  }

  if (String(imageName).startsWith("http")) {
    return imageName;
  }

  return getAppUrl(`assets/images/rooms/${String(imageName).replace(/^(\.\.\/)+assets\/images\/rooms\//, "")}`);
}

function syncDateLimits() {
  if (!refs.fechaInicio || !refs.fechaFin) {
    return;
  }

  refs.fechaInicio.min = TODAY;
  refs.fechaFin.min = refs.fechaInicio.value || TODAY;

  if (refs.fechaInicio.value && refs.fechaInicio.value < TODAY) {
    refs.fechaInicio.value = TODAY;
  }

  if (refs.fechaFin.value && refs.fechaFin.value < refs.fechaFin.min) {
    refs.fechaFin.value = refs.fechaFin.min;
  }
}

function renderSelectionDetail(target, title, description, meta = []) {
  if (!target) {
    return;
  }

  target.innerHTML = description
    ? `
      <div class="detail-card__content">
        <strong>${title}</strong>
        <p>${description}</p>
        <div class="detail-card__meta">
          ${meta.filter(Boolean).map((item) => `<span class="badge">${item}</span>`).join("")}
        </div>
      </div>
    `
    : '<p class="empty-state">Selecciona un elemento para ver su descripcion.</p>';
}

function validatePackageCompatibility(paquete, room = getSelectedRoom()) {
  if (!paquete || !room) {
    return { compatible: true, message: "" };
  }

  if (paquete.IDHabitacion && String(paquete.IDHabitacion) !== String(room.IDHabitacion)) {
    return {
      compatible: false,
      message: `${paquete.NombrePaquete} solo es compatible con la habitacion ${paquete.HabitacionIncluidaNombre || `#${paquete.IDHabitacion}`}.`
    };
  }

  const packageCapacity = Number(paquete.HabitacionIncluidaCapacidad || 0);
  const roomCapacity = Number(room.CapacidadMaximaPersonas || 0);

  if (packageCapacity && roomCapacity && packageCapacity !== roomCapacity) {
    return {
      compatible: false,
      message: `${paquete.NombrePaquete} esta asociado a habitaciones de ${packageCapacity} persona(s).`
    };
  }

  return { compatible: true, message: "" };
}

function calculateReservationTotal() {
  const room = getSelectedRoom();
  const guestCount = getGuestCount();
  const nights = getStayNights();
  const roomTotal = getRoomStayTotal(room);
  const packageTotal = getSelectedPackages().reduce((sum, paquete) => sum + Number(paquete.Precio || 0), 0);
  const serviceTotal = getSelectedServices().reduce((sum, servicio) => sum + Number(servicio.Costo || 0), 0);
  const total = roomTotal + packageTotal + serviceTotal;

  if (refs.cantidadHuespedesResumen) {
    refs.cantidadHuespedesResumen.textContent = String(guestCount);
  }

  if (refs.cantidadNochesResumen) {
    refs.cantidadNochesResumen.textContent = String(nights);
  }

  if (refs.totalHabitacionResumen) {
    refs.totalHabitacionResumen.textContent = `$${formatCurrency(roomTotal)}`;
  }

  if (refs.detalleHabitacionResumen) {
    refs.detalleHabitacionResumen.textContent = room
      ? `${room.NombreHabitacion}${nights ? ` - ${nights} noche(s)` : ""}`
      : "Sin habitacion seleccionada";
  }

  if (refs.totalPaquetesResumen) {
    refs.totalPaquetesResumen.textContent = `$${formatCurrency(packageTotal)}`;
  }

  if (refs.totalServiciosResumen) {
    refs.totalServiciosResumen.textContent = `$${formatCurrency(serviceTotal)}`;
  }

  if (refs.totalReserva) {
    refs.totalReserva.textContent = `$${formatCurrency(total)}`;
  }

  return total;
}

function renderClientOptions() {
  if (!refs.clienteSelect) {
    return;
  }

  if (isAdmin) {
    refs.clienteSelect.innerHTML = `
      <option value="">Selecciona un cliente</option>
      ${getVisibleClientes().map((cliente) => `
        <option value="${cliente.NroDocumento}">
          ${getFullName(cliente)} - ${cliente.NroDocumento}
        </option>
      `).join("")}
    `;
  } else {
    refs.clienteSelect.innerHTML = state.cliente
      ? `<option value="${state.cliente.NroDocumento}">${getFullName(state.cliente)} - ${state.cliente.NroDocumento}</option>`
      : '<option value="">Cliente no disponible</option>';
    refs.clienteSelect.disabled = true;
  }

  refs.clienteSelect.value = state.selectedClientId;
}

function updateClientSummary() {
  const cliente = isAdmin ? getSelectedClient() : state.cliente;

  if (refs.documentoInput) {
    refs.documentoInput.value = cliente?.NroDocumento || "";
  }

  if (refs.clienteEmail) {
    refs.clienteEmail.value = cliente?.Email || "";
  }

  if (refs.clienteTelefono) {
    refs.clienteTelefono.value = cliente?.Telefono || "";
  }
}

function renderClientsTable() {
  if (!refs.clientsTable) {
    return;
  }

  const clientes = getVisibleClientes();

  if (!clientes.length) {
    refs.clientsTable.innerHTML = '<p class="empty-state">No hay clientes disponibles.</p>';
    return;
  }

  refs.clientsTable.innerHTML = `
    <div class="table-shell">
      <table class="data-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Documento</th>
            <th>Correo</th>
            <th>Telefono</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${clientes.map((cliente) => `
            <tr>
              <td>${getFullName(cliente)}</td>
              <td>${cliente.NroDocumento}</td>
              <td>${cliente.Email}</td>
              <td>${cliente.Telefono}</td>
              <td>
                <button type="button" class="btn-ghost" data-select-client="${cliente.NroDocumento}">Seleccionar</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  refs.clientsTable.querySelectorAll("[data-select-client]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedClientId = button.dataset.selectClient || "";
      refs.clienteSelect.value = state.selectedClientId;
      updateClientSummary();
      setFormFeedback("", "");
    });
  });
}

function renderRooms() {
  if (!refs.habitacionesGrid) {
    return;
  }

  refs.habitacionesGrid.innerHTML = state.habitaciones
    .filter((habitacion) => Number(habitacion.Estado) === 1)
    .map((habitacion) => {
      const selected = String(habitacion.IDHabitacion) === String(state.selectedRoomId);
      const guestCount = getGuestCount();
      const roomCapacity = Number(habitacion.CapacidadMaximaPersonas || 1);
      const roomFitsGuests = guestCount <= roomCapacity;
      const total = selected ? getRoomStayTotal(habitacion) : Number(habitacion.Costo || 0);

      return `
        <article class="selection-card ${selected ? "is-selected" : ""}">
          <div class="selection-card__media">
            <img src="${resolveRoomImage(habitacion.ImagenUrl)}" alt="${habitacion.NombreHabitacion}">
          </div>
          <div class="selection-card__header">
            <h3>${habitacion.NombreHabitacion}</h3>
            <div class="selection-card__price-block">
              <strong>$${formatCurrency(habitacion.Costo)}</strong>
              <span class="selection-card__inline-total">${selected ? `Total: $${formatCurrency(total)}` : "Disponible"}</span>
            </div>
          </div>
          <p>${habitacion.Descripcion || "Sin descripcion registrada."}</p>
          <p class="selection-card__caption">Capacidad: ${roomCapacity} persona(s)</p>
          ${roomFitsGuests ? "" : `<p class="feedback error">No disponible para ${guestCount} huesped(es).</p>`}
          <button type="button" class="${selected ? "btn-secondary" : "btn-primary"}" data-room="${habitacion.IDHabitacion}">
            ${selected ? "Seleccionada" : "Seleccionar"}
          </button>
        </article>
      `;
    })
    .join("");

  refs.habitacionesGrid.querySelectorAll("[data-room]").forEach((button) => {
    button.addEventListener("click", () => {
      const room = state.habitaciones.find((habitacion) => String(habitacion.IDHabitacion) === String(button.dataset.room));

      if (!room) {
        return;
      }

      if (getGuestCount() > Number(room.CapacidadMaximaPersonas || 1)) {
        setFormFeedback(`La habitacion ${room.NombreHabitacion} admite maximo ${room.CapacidadMaximaPersonas} huesped(es).`, "error");
        return;
      }

      const incompatiblePackage = getSelectedPackages().find((paquete) => !validatePackageCompatibility(paquete, room).compatible);

      if (incompatiblePackage) {
        setFormFeedback(validatePackageCompatibility(incompatiblePackage, room).message, "error");
        return;
      }

      state.selectedRoomId = button.dataset.room || "";
      renderRooms();
      renderPackages();
      calculateReservationTotal();
      setFormFeedback("", "");
    });

    button.addEventListener("mouseenter", () => {
      const room = state.habitaciones.find((habitacion) => String(habitacion.IDHabitacion) === String(button.dataset.room));

      renderSelectionDetail(
        refs.habitacionDetalle,
        room?.NombreHabitacion || "Habitacion",
        room?.Descripcion || "",
        [
          room?.Costo ? `$${formatCurrency(room.Costo)} por noche` : "",
          room?.CapacidadMaximaPersonas ? `${room.CapacidadMaximaPersonas} persona(s)` : "",
          Number(room?.Estado) === 1 ? "Disponible" : "No disponible"
        ]
      );
    });
  });

  const room = getSelectedRoom();
  renderSelectionDetail(
    refs.habitacionDetalle,
    room?.NombreHabitacion || "Habitacion",
    room?.Descripcion || "",
    [
      room?.Costo ? `$${formatCurrency(room.Costo)} por noche` : "",
      room?.CapacidadMaximaPersonas ? `${room.CapacidadMaximaPersonas} persona(s)` : "",
      Number(room?.Estado) === 1 ? "Disponible" : "No disponible"
    ]
  );
}

function renderPackages() {
  if (!refs.paquetesGrid) {
    return;
  }

  refs.paquetesGrid.innerHTML = state.paquetes
    .filter((paquete) => Number(paquete.Estado) === 1)
    .map((paquete) => {
      const selected = state.selectedPackageIds.has(Number(paquete.IDPaquete));
      const compatibility = validatePackageCompatibility(paquete);

      return `
        <article class="selection-card ${selected ? "is-selected" : ""}">
          <div class="selection-card__header">
            <h3>${paquete.NombrePaquete}</h3>
            <div class="selection-card__price-block">
              <strong>$${formatCurrency(paquete.Precio)}</strong>
              <span class="selection-card__inline-total">${selected ? "Agregado" : "Disponible"}</span>
            </div>
          </div>
          <p>${paquete.Descripcion || "Paquete sin descripcion registrada."}</p>
          <p class="muted-text">Habitacion: ${paquete.HabitacionIncluidaNombre || "No asignada"}</p>
          <p class="muted-text">Servicio incluido: ${paquete.ServicioIncluidoNombre || "No definido"}</p>
          ${!compatibility.compatible && getSelectedRoom() ? `<p class="feedback error">${compatibility.message}</p>` : ""}
          <button type="button" class="${selected ? "btn-secondary" : "btn-primary"}" data-package="${paquete.IDPaquete}">
            ${selected ? "Quitar" : "Agregar"}
          </button>
        </article>
      `;
    })
    .join("");

  refs.paquetesGrid.querySelectorAll("[data-package]").forEach((button) => {
    button.addEventListener("click", () => {
      const packageId = Number(button.dataset.package);
      const paquete = state.paquetes.find((item) => Number(item.IDPaquete) === packageId);
      const compatibility = validatePackageCompatibility(paquete);

      if (!state.selectedPackageIds.has(packageId) && !compatibility.compatible) {
        setFormFeedback(compatibility.message, "error");
        return;
      }

      if (state.selectedPackageIds.has(packageId)) {
        state.selectedPackageIds.delete(packageId);
      } else {
        state.selectedPackageIds.add(packageId);
      }

      renderPackages();
      calculateReservationTotal();
      setFormFeedback("", "");
    });

    button.addEventListener("mouseenter", () => {
      const paquete = state.paquetes.find((item) => String(item.IDPaquete) === String(button.dataset.package));
      renderSelectionDetail(
        refs.paqueteDetalle,
        paquete?.NombrePaquete || "Paquetes",
        paquete?.Descripcion || "",
        [
          paquete?.Precio ? `$${formatCurrency(paquete.Precio)}` : "",
          paquete?.HabitacionIncluidaNombre ? `Habitacion: ${paquete.HabitacionIncluidaNombre}` : "",
          paquete?.ServicioIncluidoNombre || ""
        ]
      );
    });
  });

  const selectedPackages = getSelectedPackages();
  renderSelectionDetail(
    refs.paqueteDetalle,
    selectedPackages.length ? selectedPackages.map((item) => item.NombrePaquete).join(", ") : "Paquetes",
    selectedPackages.length ? selectedPackages.map((item) => item.Descripcion || "Sin descripcion").join(" | ") : "",
    selectedPackages.map((item) => `$${formatCurrency(item.Precio)}`)
  );
}

function renderServices() {
  if (!refs.serviciosGrid) {
    return;
  }

  refs.serviciosGrid.innerHTML = state.servicios
    .filter((servicio) => Number(servicio.Estado) === 1)
    .map((servicio) => {
      const selected = state.selectedServiceIds.has(Number(servicio.IDServicio));

      return `
        <article class="selection-card ${selected ? "is-selected" : ""}">
          <div class="selection-card__header">
            <h3>${servicio.NombreServicio}</h3>
            <div class="selection-card__price-block">
              <strong>$${formatCurrency(servicio.Costo)}</strong>
              <span class="selection-card__inline-total">${selected ? "Agregado" : "Disponible"}</span>
            </div>
          </div>
          <p>${servicio.Descripcion || "Sin descripcion registrada."}</p>
          <p class="muted-text">Duracion: ${servicio.Duracion || "No definida"}</p>
          <p class="muted-text">Capacidad maxima: ${servicio.CantidadMaximaPersonas || "No definida"}</p>
          <button type="button" class="${selected ? "btn-secondary" : "btn-primary"}" data-service="${servicio.IDServicio}">
            ${selected ? "Quitar" : "Agregar"}
          </button>
        </article>
      `;
    })
    .join("");

  refs.serviciosGrid.querySelectorAll("[data-service]").forEach((button) => {
    button.addEventListener("click", () => {
      const serviceId = Number(button.dataset.service);

      if (state.selectedServiceIds.has(serviceId)) {
        state.selectedServiceIds.delete(serviceId);
      } else {
        state.selectedServiceIds.add(serviceId);
      }

      renderServices();
      calculateReservationTotal();
      setFormFeedback("", "");
    });

    button.addEventListener("mouseenter", () => {
      const servicio = state.servicios.find((item) => String(item.IDServicio) === String(button.dataset.service));
      renderSelectionDetail(
        refs.servicioDetalle,
        servicio?.NombreServicio || "Servicios",
        servicio?.Descripcion || "",
        [
          servicio?.Duracion || "",
          servicio?.CantidadMaximaPersonas ? `${servicio.CantidadMaximaPersonas} persona(s)` : "",
          servicio?.Costo ? `$${formatCurrency(servicio.Costo)}` : ""
        ]
      );
    });
  });

  const selectedServices = getSelectedServices();
  renderSelectionDetail(
    refs.servicioDetalle,
    selectedServices.length ? selectedServices.map((item) => item.NombreServicio).join(", ") : "Servicios",
    selectedServices.length ? selectedServices.map((item) => item.Descripcion || "").join(" | ") : "",
    selectedServices.map((item) => `$${formatCurrency(item.Costo)}`)
  );
}

function renderMetodosPago() {
  if (!refs.metodoPago) {
    return;
  }

  refs.metodoPago.innerHTML = `
    <option value="">Selecciona un metodo</option>
    ${state.metodosPago.map((metodo) => `<option value="${metodo.IdMetodoPago}">${metodo.NomMetodoPago}</option>`).join("")}
  `;
}

function renderEstados() {
  if (!refs.estadoReserva) {
    return;
  }

  refs.estadoReserva.innerHTML = state.estados
    .map((estado) => `<option value="${estado.IdEstadoReserva}">${estado.NombreEstadoReserva}</option>`)
    .join("");

  refs.estadoReserva.value = String(ESTADO_ACTIVA);
  refs.estadoReserva.disabled = !isAdmin;
}

function renderReservasTable() {
  if (!refs.reservasTable) {
    return;
  }

  const reservas = getVisibleReservas();

  if (!reservas.length) {
    refs.reservasTable.innerHTML = `<p class="empty-state">${isAdmin ? "Aun no hay reservas registradas." : "Aun no tienes reservas registradas."}</p>`;
    return;
  }

  refs.reservasTable.innerHTML = `
    <div class="table-shell">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            ${isAdmin ? "<th>Cliente</th>" : ""}
            <th>Habitacion</th>
            <th>Fechas</th>
            <th>Paquetes</th>
            <th>Servicios</th>
            <th>Metodo</th>
            <th>Estado</th>
            <th>Total</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${reservas.map((reserva) => {
            const isCancelled = Number(reserva.estado?.id) === ESTADO_CANCELADA || getStatusName(reserva).toLowerCase().includes("cancel");

            return `
              <tr>
                <td>#${reserva.id_reserva}</td>
                ${isAdmin ? `<td>${reserva.cliente?.nombreCompleto || reserva.nr_documento || "Sin cliente"}</td>` : ""}
                <td>${reserva.habitacion?.nombre || "Sin habitacion"}</td>
                <td>
                  ${reserva.fecha_inicio || "--"} al ${reserva.fecha_fin || "--"}<br>
                  <span class="muted-text">Entrada: ${reserva.hora_entrada || "--:--"} · Salida: ${reserva.hora_salida || "--:--"}</span>
                </td>
                <td>${(reserva.paquetes || []).map((paquete) => paquete.nombre).join(", ") || "Sin paquetes"}</td>
                <td>${(reserva.servicios || []).map((servicio) => servicio.nombre).join(", ") || "Sin servicios"}</td>
                <td>${reserva.metodoPago?.nombre || "Sin metodo"}</td>
                <td><span class="badge">${getStatusName(reserva)}</span></td>
                <td>$${formatCurrency(reserva.total)}</td>
                <td class="table-actions">
                  ${isAdmin ? `<button type="button" class="btn-ghost" data-edit="${reserva.id_reserva}">Editar</button>` : ""}
                  ${isCancelled ? '<span class="muted-text">Sin acciones</span>' : `<button type="button" class="btn-danger" data-delete="${reserva.id_reserva}">Cancelar</button>`}
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;

  refs.reservasTable.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      startEditing(Number(button.dataset.edit));
    });
  });

  refs.reservasTable.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      const reservationId = Number(button.dataset.delete);

      if (!window.confirm("Se cancelara la reserva seleccionada. Deseas continuar?")) {
        return;
      }

      try {
        const reservation = state.reservas.find((item) => Number(item.id_reserva) === reservationId);

        if (!isAdmin && (!reservation || !reservationBelongsToSession(reservation, session))) {
          throw new Error("No tienes permisos para cancelar esta reserva.");
        }

        await cancelarReserva(reservationId);
        setReservationsFeedback("Reserva cancelada correctamente.", "success");
        if (isAdmin) {
          setFormFeedback("Reserva cancelada correctamente.", "success");
        }
        await refreshReservas();
      } catch (error) {
        console.error("Error cancelando reserva:", error);
        setReservationsFeedback(error.message, "error");
        setFormFeedback(error.message, "error");
      }
    });
  });
}

function renderClientProfile() {
  if (!refs.profile || !state.cliente) {
    return;
  }

  refs.profile.innerHTML = `
    <article class="profile-summary__item">
      <span>Nombre</span>
      <strong>${getFullName(state.cliente)}</strong>
    </article>
    <article class="profile-summary__item">
      <span>Documento</span>
      <strong>${state.cliente.NroDocumento || "Sin documento"}</strong>
    </article>
    <article class="profile-summary__item">
      <span>Correo</span>
      <strong>${state.cliente.Email || "Sin correo"}</strong>
    </article>
    <article class="profile-summary__item">
      <span>Telefono</span>
      <strong>${state.cliente.Telefono || "Sin telefono"}</strong>
    </article>
  `;
}

function renderStatusSummary() {
  if (!refs.statusSummary) {
    return;
  }

  const reservas = getVisibleReservas();
  const activas = reservas.filter((reserva) => getStatusName(reserva).toLowerCase().includes("activ"));
  const finalizadas = reservas.filter((reserva) => getStatusName(reserva).toLowerCase().includes("final"));
  const canceladas = reservas.filter((reserva) => getStatusName(reserva).toLowerCase().includes("cancel"));

  refs.statusSummary.innerHTML = `
    <article class="list-card">
      <div>
        <h4>Reservas activas</h4>
        <p>Reservas vigentes asociadas a tu cuenta.</p>
      </div>
      <div class="list-card__meta"><span class="badge badge-soft">${activas.length}</span></div>
    </article>
    <article class="list-card">
      <div>
        <h4>Reservas finalizadas</h4>
        <p>Historial completado de tus estancias.</p>
      </div>
      <div class="list-card__meta"><span class="badge">${finalizadas.length}</span></div>
    </article>
    <article class="list-card">
      <div>
        <h4>Reservas canceladas</h4>
        <p>Reservas que ya no estan activas en tu historial.</p>
      </div>
      <div class="list-card__meta"><span class="badge badge-danger">${canceladas.length}</span></div>
    </article>
  `;
}

function showStep(step) {
  state.currentStep = step;
  refs.stepPills.forEach((pill) => {
    pill.classList.toggle("is-active", Number(pill.dataset.stepPill) === step);
  });
  refs.stepViews.forEach((view) => {
    view.classList.toggle("is-active", view.id === `step-${step}`);
  });
}

function bindStepNavigation() {
  refs.nextButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextStep = Number(button.dataset.stepNext);

      if (nextStep === 2 && !state.selectedRoomId) {
        setFormFeedback("Selecciona una habitacion antes de continuar.", "error");
        return;
      }

      showStep(nextStep);
      setFormFeedback("", "");
    });
  });

  refs.prevButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showStep(Number(button.dataset.stepPrev));
    });
  });
}

function resetForm() {
  state.editingReservationId = null;
  state.selectedPackageIds = new Set();
  state.selectedServiceIds = new Set();
  state.selectedRoomId = "";
  state.selectedClientId = isAdmin
    ? String(getVisibleClientes()[0]?.NroDocumento || "")
    : String(state.cliente?.NroDocumento || "");

  if (refs.formTitle) {
    refs.formTitle.textContent = isAdmin ? "Nueva reserva" : "Confirma tu reserva";
  }

  if (refs.submitBtn) {
    refs.submitBtn.textContent = "Guardar reserva";
  }

  if (refs.clienteSelect) {
    refs.clienteSelect.value = state.selectedClientId;
  }

  if (refs.cantidadHuespedes) {
    refs.cantidadHuespedes.value = "1";
  }

  if (refs.fechaInicio) {
    refs.fechaInicio.value = "";
  }

  if (refs.fechaFin) {
    refs.fechaFin.value = "";
  }

  if (refs.horaEntrada) {
    refs.horaEntrada.value = "";
  }

  if (refs.horaSalida) {
    refs.horaSalida.value = "";
  }

  if (refs.metodoPago) {
    refs.metodoPago.value = "";
  }

  if (refs.estadoReserva) {
    refs.estadoReserva.value = String(ESTADO_ACTIVA);
    refs.estadoReserva.disabled = !isAdmin;
  }

  syncDateLimits();
  updateClientSummary();
  renderRooms();
  renderPackages();
  renderServices();
  calculateReservationTotal();
  setFormFeedback("", "");

  if (!isAdmin) {
    showStep(1);
  }
}

function startEditing(reservationId) {
  if (!isAdmin) {
    return;
  }

  const reserva = state.reservas.find((item) => Number(item.id_reserva) === reservationId);

  if (!reserva) {
    return;
  }

  state.editingReservationId = reservationId;
  state.selectedClientId = String(reserva.cliente?.nroDocumento || reserva.nr_documento || reserva.id_cliente || "");
  state.selectedRoomId = String(reserva.habitacion?.id || "");
  state.selectedPackageIds = new Set((reserva.paquetes || []).map((paquete) => Number(paquete.id)));
  state.selectedServiceIds = new Set((reserva.servicios || []).map((servicio) => Number(servicio.id)));

  refs.formTitle.textContent = `Editar reserva #${reserva.id_reserva}`;
  refs.submitBtn.textContent = "Actualizar reserva";
  refs.clienteSelect.value = state.selectedClientId;
  refs.fechaInicio.value = reserva.fecha_inicio || "";
  refs.fechaFin.value = reserva.fecha_fin || "";
  refs.horaEntrada.value = reserva.hora_entrada || "";
  refs.horaSalida.value = reserva.hora_salida || "";
  refs.metodoPago.value = String(reserva.metodoPago?.id || "");
  refs.estadoReserva.value = String(reserva.estado?.id || ESTADO_ACTIVA);
  refs.estadoReserva.disabled = false;

  updateClientSummary();
  renderRooms();
  renderPackages();
  renderServices();
  calculateReservationTotal();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getPayload() {
  const cliente = isAdmin ? getSelectedClient() : state.cliente;

  return {
    id_cliente: Number(cliente?.IDCliente || cliente?.id_cliente || cliente?.NroDocumento || 0),
    nr_documento: String(cliente?.NroDocumento || ""),
    cantidad_huespedes: getGuestCount(),
    fecha_inicio: refs.fechaInicio.value,
    fecha_fin: refs.fechaFin.value,
    hora_entrada: refs.horaEntrada.value,
    hora_salida: refs.horaSalida.value,
    id_estado_reserva: Number(isAdmin ? refs.estadoReserva.value : ESTADO_ACTIVA),
    id_metodo_pago: Number(refs.metodoPago.value),
    id_habitacion: Number(state.selectedRoomId || 0),
    paquetes: [...state.selectedPackageIds],
    servicios: [...state.selectedServiceIds]
  };
}

async function refreshReservas() {
  state.reservas = isAdmin
    ? await getReservas()
    : await getReservas(getReservationOwnershipFilters(session));
  renderReservasTable();
  renderStatusSummary();
}

function bindCommonEvents() {
  if (refs.logoutBtn) {
    refs.logoutBtn.addEventListener("click", logout);
  }

  if (refs.clienteSelect) {
    refs.clienteSelect.addEventListener("change", () => {
      state.selectedClientId = refs.clienteSelect.value;
      updateClientSummary();
      setFormFeedback("", "");
    });
  }

  if (refs.fechaInicio) {
    refs.fechaInicio.addEventListener("change", () => {
      syncDateLimits();
      renderRooms();
      calculateReservationTotal();
    });
  }

  if (refs.fechaFin) {
    refs.fechaFin.addEventListener("change", () => {
      syncDateLimits();
      renderRooms();
      calculateReservationTotal();
    });
  }

  if (refs.cantidadHuespedes) {
    refs.cantidadHuespedes.addEventListener("input", () => {
      renderRooms();
      renderPackages();
      calculateReservationTotal();
    });
  }

  if (refs.resetBtn) {
    refs.resetBtn.addEventListener("click", resetForm);
  }

  if (refs.form) {
    refs.form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setFormFeedback("", "");

      try {
        const payload = getPayload();
        const room = getSelectedRoom();
        const guestCount = getGuestCount();
        const incompatiblePackage = getSelectedPackages().find((paquete) => !validatePackageCompatibility(paquete).compatible);
        const invalidService = getSelectedServices().find((servicio) => {
          const limit = Number(servicio.CantidadMaximaPersonas || 0);
          return limit > 0 && guestCount > limit;
        });

        if (!payload.id_cliente) {
          throw new Error(isAdmin ? "Selecciona un cliente." : "No fue posible validar tu perfil de cliente.");
        }

        if (!isAdmin && !sessionMatchesValue(payload.id_cliente, session) && !sessionMatchesValue(payload.nr_documento, session)) {
          throw new Error("Solo puedes crear reservas asociadas a tu cuenta.");
        }

        if (!payload.id_habitacion) {
          throw new Error("Selecciona una habitacion.");
        }

        if (!payload.id_metodo_pago) {
          throw new Error("Selecciona un metodo de pago.");
        }

        if (!payload.fecha_inicio || !payload.fecha_fin) {
          throw new Error("Selecciona las fechas de la reserva.");
        }

        if (getStayNights() <= 0) {
          throw new Error("La fecha final debe ser posterior a la fecha inicial.");
        }

        if (!room) {
          throw new Error("Selecciona una habitacion valida.");
        }

        if (guestCount > Number(room.CapacidadMaximaPersonas || 1)) {
          throw new Error(`La habitacion seleccionada admite maximo ${room.CapacidadMaximaPersonas} huesped(es).`);
        }

        if (incompatiblePackage) {
          throw new Error(validatePackageCompatibility(incompatiblePackage).message);
        }

        if (invalidService) {
          throw new Error(`${invalidService.NombreServicio} admite maximo ${invalidService.CantidadMaximaPersonas} huesped(es).`);
        }

        if (!calculateReservationTotal()) {
          throw new Error("No fue posible calcular el total de la reserva.");
        }

        if (isAdmin && state.editingReservationId) {
          await actualizarReserva(state.editingReservationId, payload);
          setFormFeedback("Reserva actualizada correctamente.", "success");
        } else {
          await crearReserva(payload);
          setFormFeedback("Reserva creada correctamente.", "success");
        }

        setReservationsFeedback(isAdmin ? "La tabla fue actualizada con la informacion mas reciente." : "Tu historial fue actualizado con la nueva reserva.", "success");
        await refreshReservas();
        resetForm();
      } catch (error) {
        console.error("Error guardando reserva:", error);
        setFormFeedback(error.message, "error");
      }
    });
  }
}

async function initAdminReservations() {
  const [clientes, habitaciones, paquetes, servicios, metodosPago, estados, reservas] = await Promise.all([
    getClientes(),
    getHabitaciones(),
    getPaquetes(),
    getServicios(),
    getMetodosPago(),
    getEstadosReserva(),
    getReservas()
  ]);

  state.clientes = clientes;
  state.habitaciones = habitaciones;
  state.paquetes = paquetes;
  state.servicios = servicios;
  state.metodosPago = metodosPago;
  state.estados = estados;
  state.reservas = reservas;
  state.selectedClientId = String(getVisibleClientes()[0]?.NroDocumento || "");

  renderClientOptions();
  renderClientsTable();
  renderMetodosPago();
  renderEstados();
  updateClientSummary();
  renderRooms();
  renderPackages();
  renderServices();
  renderReservasTable();
  syncDateLimits();
  calculateReservationTotal();
}

async function initClientReservations() {
  const [clientes, habitaciones, paquetes, servicios, metodosPago, estados, reservas] = await Promise.all([
    getClientes(),
    getHabitaciones(),
    getPaquetes(),
    getServicios(),
    getMetodosPago(),
    getEstadosReserva(),
    getReservas(getReservationOwnershipFilters(session))
  ]);

  state.clientes = clientes;
  state.cliente = getActiveClientes().find((cliente) => clienteBelongsToSession(cliente, session)) || null;
  state.habitaciones = habitaciones;
  state.paquetes = paquetes;
  state.servicios = servicios;
  state.metodosPago = metodosPago;
  state.estados = estados;
  state.reservas = reservas.filter((reserva) => reservationBelongsToSession(reserva, session));
  state.selectedClientId = String(state.cliente?.NroDocumento || "");

  if (!state.cliente) {
    throw new Error("No fue posible encontrar un perfil de cliente asociado a la sesion.");
  }

  renderClientOptions();
  renderClientProfile();
  renderStatusSummary();
  renderMetodosPago();
  renderEstados();
  updateClientSummary();
  renderRooms();
  renderPackages();
  renderServices();
  renderReservasTable();
  syncDateLimits();
  calculateReservationTotal();
  bindStepNavigation();
  showStep(1);
}

async function init() {
  if (!session) {
    return;
  }

  if (refs.userName) {
    refs.userName.textContent = getFullName(session) || (isAdmin ? "Administrador" : "Cliente");
  }

  const deniedMessage = consumeAccessDeniedMessage();
  if (deniedMessage) {
    setFormFeedback(deniedMessage, "error");
    setReservationsFeedback(deniedMessage, "error");
  }

  bindCommonEvents();

  try {
    if (routeRole === "admin") {
      await initAdminReservations();
      return;
    }

    await initClientReservations();
  } catch (error) {
    console.error("Error inicializando reservas:", error);
    setFormFeedback(error.message || "No fue posible cargar el modulo de reservas.", "error");
    setReservationsFeedback(error.message || "No fue posible cargar el modulo de reservas.", "error");
  }
}

init();
