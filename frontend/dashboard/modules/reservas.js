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
import { renderPremiumPagination, showAlert } from "./ui-utils.js";

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
  selectedServiceIds: new Set(),
  editingReservationId: null,
  currentStep: 1,
  currentPage: 1,
  itemsPerPage: 10
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
  reservasTable: document.getElementById("reservationsTableBody"),
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
  if (typeof reserva?.estado === 'object' && reserva.estado !== null) {
    return String(reserva.estado.nombre || reserva.estado.NombreEstadoReserva || "Sin estado").trim();
  }
  if (reserva?.estado == 1) return 'Activa';
  if (reserva?.estado == 2) return 'Cancelada';
  if (reserva?.estado == 3) return 'Finalizada';
  return String(reserva?.estado || "Sin estado").trim();
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

window.reservasModule = {
  goToPage: (page) => {
    state.currentPage = page;
    renderReservasTable();
  },
  changeItemsPerPage: (newSize) => {
    state.itemsPerPage = Number(newSize);
    state.currentPage = 1;
    renderReservasTable();
  }
};

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
    return getAppUrl("assets/images/rooms/doble-confort.svg");
  }

  if (String(imageName).startsWith("http")) {
    return imageName;
  }

  return getAppUrl(`assets/images/rooms/${String(imageName).replace(/^(\.\.\/)+assets\/images\/rooms\//, "")}`);
}

function resolveServiceImage(servicio) {
  const itemNameRaw = servicio.nombre || servicio.NombreServicio || servicio.Nombre || '';
  const itemDesc = servicio.descripcion || servicio.Descripcion || '';
  const fullText = `${itemNameRaw} ${itemDesc}`.toLowerCase();

  if (fullText.includes('spa') || fullText.includes('masaje') || fullText.includes('relajacion')) {
    return getAppUrl('assets/images/service/SPA.png');
  } else if (fullText.includes('caballo') || fullText.includes('cabalgata')) {
    return getAppUrl('assets/images/service/cabalgata.png');
  } else if (fullText.includes('caminata') || fullText.includes('guiado') || fullText.includes('recorrido')) {
    return getAppUrl('assets/images/service/caminata.png');
  }
  return getAppUrl('assets/images/service/SPA.png');
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


if (refs.clienteEmail) {
  refs.clienteEmail.value = cliente?.Email || "";
}

if (refs.clienteTelefono) {
  refs.clienteTelefono.value = cliente?.Telefono || "";
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

      const imgSrc = paquete.ImagenUrl || paquete.Imagen || paquete.imagen || paquete.ImagenPaquete || getAppUrl('assets/images/placeholder.png');

      return `
        <article class="selection-card ${selected ? "is-selected" : ""}" style="display: flex; flex-direction: column; overflow: hidden; border-radius: 12px; border: 1px solid rgba(0,0,0,0.1); background: white;">
          <div style="height: 120px; overflow: hidden; width: 100%; background: #f9fafb;">
            <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='${getAppUrl('assets/images/placeholder.png')}'">
          </div>
          <div style="padding: 15px; flex-grow: 1; display: flex; flex-direction: column;">
            <div class="selection-card__header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
              <h3 style="margin: 0; font-size: 1.1rem;">${paquete.NombrePaquete}</h3>
              <div class="selection-card__price-block" style="text-align: right;">
                <strong style="color: var(--brand); display: block;">$${formatCurrency(paquete.Precio)}</strong>
                <span class="selection-card__inline-total" style="font-size: 0.75rem; color: var(--muted);">${selected ? "Agregado" : "Disponible"}</span>
              </div>
            </div>
            <p style="font-size: 0.85rem; color: var(--muted); line-height: 1.4; margin: 0 0 10px 0; flex-grow: 1;">${paquete.Descripcion || "Paquete sin descripcion registrada."}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; font-size: 0.8rem;">
              <span class="muted-text">Habitacion: ${paquete.HabitacionIncluidaNombre || "No asignada"}</span>
              <span class="muted-text">Servicio: ${paquete.ServicioIncluidoNombre || "No definido"}</span>
            </div>
            ${!compatibility.compatible && getSelectedRoom() ? `<p class="feedback error" style="margin-bottom: 10px;">${compatibility.message}</p>` : ""}
            <button type="button" class="${selected ? "btn-secondary" : "btn-primary"}" data-package="${paquete.IDPaquete}" style="width: 100%; padding: 8px; border-radius: 8px; font-weight: bold; cursor: pointer; border: none; background: ${selected ? '#f8fafc' : 'var(--brand)'}; color: ${selected ? 'var(--ink)' : 'white'};">
              ${selected ? "Quitar" : "Agregar"}
            </button>
          </div>
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
        <article class="selection-card ${selected ? "is-selected" : ""}" style="display: flex; flex-direction: column; overflow: hidden; border-radius: 12px; border: 1px solid rgba(0,0,0,0.1); background: white;">
          <div style="height: 120px; overflow: hidden; width: 100%;">
            <img src="${resolveServiceImage(servicio)}" alt="${servicio.NombreServicio}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
          <div style="padding: 15px; flex-grow: 1; display: flex; flex-direction: column;">
            <div class="selection-card__header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
              <h3 style="margin: 0; font-size: 1.1rem;">${servicio.NombreServicio}</h3>
              <div class="selection-card__price-block" style="text-align: right;">
                <strong style="color: var(--brand); display: block;">$${formatCurrency(servicio.Costo)}</strong>
                <span class="selection-card__inline-total" style="font-size: 0.75rem; color: var(--muted);">${selected ? "Agregado" : "Disponible"}</span>
              </div>
            </div>
            <p style="font-size: 0.85rem; color: var(--muted); line-height: 1.4; margin: 0 0 10px 0; flex-grow: 1;">${servicio.Descripcion || "Sin descripcion registrada."}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; font-size: 0.8rem;">
              <span class="muted-text">Duracion: ${servicio.Duracion || "No definida"}</span>
              <span class="muted-text">Max: ${servicio.CantidadMaximaPersonas || "No definida"} Pers</span>
            </div>
            <button type="button" class="${selected ? "btn-secondary" : "btn-primary"}" data-service="${servicio.IDServicio}" style="width: 100%; padding: 8px; border-radius: 8px; font-weight: bold; cursor: pointer; border: none; background: ${selected ? '#f8fafc' : 'var(--brand)'}; color: ${selected ? 'var(--ink)' : 'white'};">
              ${selected ? "Quitar" : "Agregar"}
            </button>
          </div>
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

  const searchInput = document.getElementById('searchReservations');
  const statusFilter = document.getElementById('filterStatus');
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  const filterStatus = statusFilter ? statusFilter.value : '';

  let reservas = getVisibleReservas();

  // Filtros
  if (searchTerm) {
    reservas = reservas.filter(r =>
      String(r.id_reserva).toLowerCase().includes(searchTerm) ||
      (r.cliente?.nombreCompleto || '').toLowerCase().includes(searchTerm) ||
      (r.nr_documento || '').toLowerCase().includes(searchTerm) ||
      (r.habitacion?.nombre || '').toLowerCase().includes(searchTerm)
    );
  }

  if (filterStatus) {
    reservas = reservas.filter(r => {
      // 1: Confirmada, 2: Cancelada, 3: Finalizada
      const statusId = r.estado?.id || r.estado || '';
      return String(statusId) === String(filterStatus);
    });
  }

  if (!reservas.length) {
    refs.reservasTable.innerHTML = `<tr><td colspan="10" class="px-6 py-10 text-center text-muted font-semibold">${isAdmin ? "No hay reservas registradas." : "No tienes reservas registradas."}</td></tr>`;
    renderPremiumPagination('reservasPaginationContainer', state, 0, 'reservasModule');
    return;
  }

  const totalItems = reservas.length;
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const paginated = reservas.slice(startIndex, startIndex + state.itemsPerPage);

  refs.reservasTable.innerHTML = paginated.map((reserva) => {
    const isCancelled = Number(reserva.estado?.id) === ESTADO_CANCELADA || getStatusName(reserva).toLowerCase().includes("cancel");
    const statusName = getStatusName(reserva);
    let statusClass = "bg-gray-100 text-gray-700";
    if (statusName.toLowerCase().includes("activ") || statusName.toLowerCase().includes("confirm")) statusClass = "bg-emerald-100 text-emerald-700";
    else if (statusName.toLowerCase().includes("cancel")) statusClass = "bg-rose-100 text-rose-700";
    else if (statusName.toLowerCase().includes("finaliz")) statusClass = "bg-blue-100 text-blue-700";

    return `
      <tr class="hover:bg-gray-50/50 transition-colors group">
        <td class="px-6 py-4 font-semibold text-brand-deep">#${reserva.id_reserva}</td>
        ${isAdmin ? `<td class="px-6 py-4 font-medium text-ink"><div class="flex flex-col"><span>${reserva.cliente?.nombreCompleto || "Sin cliente"}</span><span class="text-[10px] text-muted">${reserva.nr_documento || ""}</span></div></td>` : ""}
        <td class="px-6 py-4 font-medium text-ink">${reserva.habitacion?.nombre || "Sin hab."}</td>
        <td class="px-6 py-4">
          <div class="flex flex-col text-xs">
            <span class="font-semibold text-ink">${reserva.fecha_inicio || "--"} <i class="fa-solid fa-arrow-right text-brand mx-1"></i> ${reserva.fecha_fin || "--"}</span>
            <span class="text-muted">E: ${reserva.hora_entrada || "--:--"} · S: ${reserva.hora_salida || "--:--"}</span>
          </div>
        </td>
        <td class="px-6 py-4 font-bold text-brand-deep">$${formatCurrency(reserva.total)}</td>
        <td class="px-6 py-4"><span class="px-3 py-1 rounded-full text-xs font-bold ${statusClass}">${statusName}</span></td>
        <td class="px-6 py-4">
          <div class="flex gap-2 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" class="w-8 h-8 rounded-lg bg-gray-100 hover:bg-brand hover:text-white text-brand-deep flex items-center justify-center transition-colors cursor-pointer border-none" data-detail="${reserva.id_reserva}" title="Ver Detalle"><i class="fa-solid fa-eye"></i></button>
            ${isAdmin ? `<button type="button" class="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-500 hover:text-white text-blue-600 flex items-center justify-center transition-colors cursor-pointer border-none" data-edit="${reserva.id_reserva}" title="Editar"><i class="fa-solid fa-pen"></i></button>` : ""}
            ${isCancelled ? '' : `<button type="button" class="w-8 h-8 rounded-lg bg-gray-100 hover:bg-rose-500 hover:text-white text-rose-600 flex items-center justify-center transition-colors cursor-pointer border-none" data-delete="${reserva.id_reserva}" title="Cancelar"><i class="fa-solid fa-ban"></i></button>`}
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // Inject pagination container if it doesn't exist
  let paginationDiv = document.getElementById('reservasPaginationContainer');
  if (!paginationDiv) {
    paginationDiv = document.createElement('div');
    paginationDiv.id = 'reservasPaginationContainer';
    const section = document.getElementById('reservationsListSection');
    if (section) section.appendChild(paginationDiv);
  }

  renderPremiumPagination('reservasPaginationContainer', state, totalItems, 'reservasModule');

  refs.reservasTable.querySelectorAll("[data-detail]").forEach((button) => {
    button.addEventListener("click", () => {
      mostrarDetalleReserva(Number(button.dataset.detail));
    });
  });

  refs.reservasTable.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      startEditing(Number(button.dataset.edit));
    });
  });

  refs.reservasTable.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      const reservationId = Number(button.dataset.delete);

      const confirmRes = await Swal.fire({
        title: '¿Cancelar Reserva?',
        text: 'Se cancelara la reserva seleccionada. Deseas continuar?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'No'
      });
      if (!confirmRes.isConfirmed) {
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

function mostrarDetalleReserva(id) {
  const reserva = state.reservas.find((item) => Number(item.id_reserva) === id);
  if (!reserva) return;

  const modal = document.getElementById('reservaDetalleModal');
  if (!modal) return;

  // Llenar datos básicos
  document.getElementById('detalleReservaID').textContent = `ID: #${reserva.id_reserva}`;
  document.getElementById('detResClienteNombre').textContent = reserva.cliente?.nombreCompleto || reserva.nr_documento || "Cliente Anónimo";
  document.getElementById('detResClienteDoc').textContent = `Doc: ${reserva.nr_documento || "--"}`;
  document.getElementById('detResClienteEmail').textContent = `Email: ${reserva.cliente?.email || "--"}`;
  document.getElementById('detResClienteTel').textContent = `Tel: ${reserva.cliente?.telefono || "--"}`;

  document.getElementById('detResHabNombre').textContent = reserva.habitacion?.nombre || "Sin habitación";
  document.getElementById('detResHabPrecio').textContent = reserva.habitacion?.costo ? `COP $${formatCurrency(reserva.habitacion.costo)} / noche` : "--";

  document.getElementById('detResFechaInicio').textContent = reserva.fecha_inicio || "--";
  document.getElementById('detResFechaFin').textContent = reserva.fecha_fin || "--";

  document.getElementById('detResMetodoPago').textContent = reserva.metodoPago?.nombre || "Sin método";

  const statusName = getStatusName(reserva);
  let statusClass = "bg-gray-100 text-gray-700";
  if (statusName.toLowerCase().includes("activ") || statusName.toLowerCase().includes("confirm")) statusClass = "bg-emerald-100 text-emerald-700";
  else if (statusName.toLowerCase().includes("cancel")) statusClass = "bg-rose-100 text-rose-700";
  else if (statusName.toLowerCase().includes("finaliz")) statusClass = "bg-blue-100 text-blue-700";

  const badge = document.getElementById('detResEstadoBadge');
  badge.textContent = statusName;
  badge.className = `inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 ${statusClass}`;

  document.getElementById('detResTotal').textContent = `$${formatCurrency(reserva.total)}`;

  // Grid de servicios y paquetes
  const gridContainer = document.getElementById('detResServiciosGrid');
  let extrasHtml = '';

  if (reserva.paquetes && reserva.paquetes.length > 0) {
    reserva.paquetes.forEach(p => {
      extrasHtml += `<div class="p-3 bg-white rounded-xl border border-gray-100 flex items-center gap-2 shadow-sm"><div class="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center text-sm"><i class="fa-solid fa-gift"></i></div><span>${p.nombre}</span></div>`;
    });
  }
  if (reserva.servicios && reserva.servicios.length > 0) {
    reserva.servicios.forEach(s => {
      extrasHtml += `<div class="p-3 bg-white rounded-xl border border-gray-100 flex items-center gap-2 shadow-sm"><div class="w-8 h-8 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center text-sm"><i class="fa-solid fa-wand-magic-sparkles"></i></div><span>${s.nombre}</span></div>`;
    });
  }

  if (!extrasHtml) {
    extrasHtml = `<div class="col-span-full p-3 bg-white rounded-xl border border-gray-100 text-center italic">No incluye paquetes ni servicios adicionales.</div>`;
  }

  gridContainer.innerHTML = extrasHtml;

  // Mostrar modal
  modal.classList.remove('hidden');
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
