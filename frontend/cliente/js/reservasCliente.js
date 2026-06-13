import { logout, isClientSession, getSession } from "../../dashboard/core/authGuard.js";
import { getReservas, cancelarReserva } from "../../dashboard/core/api.js";

let allReservas = [];
const fallbackRoomImage = "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=85";

function getClientName(session) {
    return session?.nombre || session?.NombreCompleto || session?.Nombres || session?.Nombre || "Cliente";
}

function getClientId(session) {
    return session?.id_cliente || session?.IDCliente || session?.NroDocumento || session?.IDUsuario || session?.id;
}

function getReservaId(reserva) {
    return reserva?.id_reserva || reserva?.IDReserva || reserva?.IDReservas || "N/A";
}

function getHabitacionName(reserva) {
    return reserva?.habitacion?.nombre || reserva?.NombreHabitacion || reserva?.Habitacion || reserva?.id_habitacion || reserva?.IDHabitacion || "N/A";
}

function imageFromBlob(value) {
    if (!value) return "";
    if (typeof value === "string") {
        value = value.trim();
        if (value.startsWith('/http')) value = value.substring(1);
        if (value === "[object Object]") return "";
        if (value.startsWith('/') ) return value;
        if (value.startsWith("data:") || value.startsWith("http") || value.startsWith("../") || value.startsWith("./")) return value;
        if (/^[\w\- .]+\.(png|jpg|jpeg|webp|gif)$/i.test(value)) return `/uploads/${value}`;
        if (value.toLowerCase().includes('uploads') && !value.startsWith('/')) return `/${value}`;
        if (!value.includes('base64') && !value.includes('://')) return `/${value}`;
        if (value.length > 80) return `data:image/jpeg;base64,${value}`;
    }
    if (value.data && Array.isArray(value.data)) {
        const bytes = new Uint8Array(value.data);
        let binary = "";
        bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
        if (binary.startsWith("http") || binary.startsWith("data:") || binary.startsWith("../") || binary.startsWith("./")) return binary;
        if (binary === "[object Object]") return "";
        return `data:image/jpeg;base64,${btoa(binary)}`;
    }
    return "";
}

function getRoomImage(reserva) {
    return imageFromBlob(
        reserva?.ImagenHabitacion ||
        reserva?.imagenHabitacion ||
        reserva?.habitacion?.ImagenHabitacion ||
        reserva?.habitacion?.imagen
    ) || fallbackRoomImage;
}

function getEstadoValue(reserva) {
    return reserva?.estado?.nombre || reserva?.estado?.id || reserva?.Estado || reserva?.id_estado_reserva || reserva?.NombreEstadoReserva || reserva?.EstadoReserva || "";
}

function getStartDate(reserva) {
    return reserva?.fecha_inicio || reserva?.FechaInicio || reserva?.FechaEntrada || "";
}

function getEndDate(reserva) {
    return reserva?.fecha_fin || reserva?.FechaFin || reserva?.FechaSalida || "";
}

async function init() {
    try {
        const session = getSession();
        const token = localStorage.getItem("vialuna_token");

        if (!session || !token || !isClientSession(session)) {
            window.location.href = "../auth/login.html";
            return;
        }

        const displayElem = document.getElementById("userNameDisplay");
        const userName = getClientName(session);
        if (displayElem) displayElem.textContent = userName;
        const initialElem = document.getElementById("userInitial");
        if (initialElem) initialElem.textContent = userName.trim().charAt(0).toUpperCase() || "V";

        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) logoutBtn.addEventListener("click", logout);

        const idCliente = getClientId(session);
        if (idCliente) {
            await cargarReservas(idCliente);
        }

        const searchInput = document.getElementById("searchReservas");
        const filterSelect = document.getElementById("filterEstado");

        if (searchInput) searchInput.addEventListener("input", aplicarFiltros);
        if (filterSelect) filterSelect.addEventListener("change", aplicarFiltros);
    } catch (error) {
        console.error("Error en reservas cliente:", error);
    }
}

async function cargarReservas(idCliente) {
    try {
        allReservas = await getReservas({ id_cliente: idCliente });
        aplicarFiltros();
    } catch (error) {
        console.error("Error cargando reservas:", error);
        renderizarGrupos([], "Error al cargar los datos.");
    }
}

function aplicarFiltros() {
    const searchElem = document.getElementById("searchReservas");
    const filterElem = document.getElementById("filterEstado");
    const searchTerm = searchElem ? searchElem.value.toLowerCase() : "";
    const estadoFilter = filterElem ? filterElem.value : "";

    const filtradas = allReservas.filter((r) => {
        const id = String(getReservaId(r)).toLowerCase();
        const habitacion = String(getHabitacionName(r)).toLowerCase();
        const estado = getStatusText(getEstadoValue(r), r).toLowerCase();
        return (id.includes(searchTerm) || habitacion.includes(searchTerm)) && (!estadoFilter || estado === estadoFilter);
    });

    renderizarGrupos(filtradas);
}

function renderizarGrupos(reservas, errorMessage = "") {
    const activeContainer = document.getElementById("activeReservations");
    const upcomingContainer = document.getElementById("upcomingReservations");
    const historyContainer = document.getElementById("historyReservations");
    if (!activeContainer || !upcomingContainer || !historyContainer) return;

    if (errorMessage) {
        const message = `<div class="empty-state">${errorMessage}</div>`;
        activeContainer.innerHTML = message;
        upcomingContainer.innerHTML = message;
        historyContainer.innerHTML = message;
        return;
    }

    if (!reservas.length) {
        const message = '<div class="empty-state">No se encontraron reservas.</div>';
        activeContainer.innerHTML = message;
        upcomingContainer.innerHTML = message;
        historyContainer.innerHTML = message;
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sorted = [...reservas].sort((a, b) => new Date(getStartDate(a)) - new Date(getStartDate(b)));
    const active = sorted.filter((r) => getStatusText(getEstadoValue(r), r) === "En curso");
    const upcoming = sorted.filter((r) => getStatusClass(getEstadoValue(r)) !== "status-cancelled" && new Date(getStartDate(r)) > today);
    const history = sorted.filter((r) => !active.includes(r) && !upcoming.includes(r)).reverse();

    activeContainer.innerHTML = active.length ? active.map((r) => renderReservationCard(r, true)).join("") : '<div class="empty-state">No tienes una reserva activa en este momento.</div>';
    upcomingContainer.innerHTML = upcoming.length ? upcoming.map((r) => renderReservationCard(r)).join("") : '<div class="empty-state">No tienes próximas reservas.</div>';
    historyContainer.innerHTML = history.length ? history.map((r) => renderReservationCard(r)).join("") : '<div class="empty-state">Tu historial aparecerá aquí cuando finalices una estancia.</div>';
}

function renderReservationCard(r, featured = false) {
    const id = getReservaId(r);
    const estado = getEstadoValue(r);
    const estadoTexto = getStatusText(estado, r);
    const canEdit = ["Pendiente", "Confirmada"].includes(estadoTexto);
    const start = getStartDate(r);
    const end = getEndDate(r);
    const nights = getNights(start, end);

    return `
        <article class="guest-reservation-card ${featured ? "is-featured" : ""}">
            <div class="reservation-image">
                <img src="${getRoomImage(r)}" alt="${getHabitacionName(r)}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackRoomImage}'">
            </div>
            <div class="reservation-copy">
                <div class="reservation-top">
                    <span class="reservation-code">Reserva #${id}</span>
                    <span class="status-badge ${getStatusClass(estado, r)}">${estadoTexto}</span>
                </div>
                <div>
                    <h3>${getHabitacionName(r)}</h3>
                    <p class="reservation-date">${formatDate(start)} al ${formatDate(end)}</p>
                </div>
                <div class="reservation-detail-grid">
                    <p class="reservation-detail"><strong>${nights}</strong><br>${nights === 1 ? "noche" : "noches"}</p>
                    <p class="reservation-detail"><strong>${formatMoney(r.total || r.Total || r.TotalPagado || 0)}</strong><br>Total pagado</p>
                    <p class="reservation-detail"><strong>${estadoTexto}</strong><br>Estado</p>
                </div>
                <div class="reservation-actions">
                    <button class="btn-glass light" onclick="verDetalle('${id}')" type="button">Ver detalle</button>
                    ${canEdit ? `<button class="btn-glass light" onclick="editarReserva('${id}')" type="button">Editar</button><button class="package-btn" onclick="cancelar('${id}')" type="button">Cancelar</button>` : ""}
                </div>
            </div>
        </article>
    `;
}

window.verDetalle = (id) => {
    const reserva = allReservas.find((item) => String(getReservaId(item)) === String(id));
    if (!reserva) return;

    const modal = document.getElementById('detailModal');
    if (!modal) return;

    // Poblar datos del modal
    document.getElementById('detailModalId').textContent = getReservaId(reserva);
    document.getElementById('detailModalHabitacion').textContent = getHabitacionName(reserva);
    document.getElementById('detailModalEntrada').textContent = formatDate(getStartDate(reserva));
    document.getElementById('detailModalSalida').textContent = formatDate(getEndDate(reserva));
    document.getElementById('detailModalEstado').textContent = getStatusText(getEstadoValue(reserva), reserva);
    document.getElementById('detailModalTotal').textContent = formatMoney(reserva.total || reserva.Total || reserva.TotalPagado || 0);

    // Extras (paquetes y servicios)
    const paquetes = Array.isArray(reserva.paquetes) && reserva.paquetes.length
        ? reserva.paquetes.map((item) => item.nombre).join(", ")
        : "";
    const servicios = Array.isArray(reserva.servicios) && reserva.servicios.length
        ? reserva.servicios.map((item) => item.nombre).join(", ")
        : "";
    const extrasText = paquetes || servicios ? `${paquetes}${paquetes && servicios ? ", " : ""}${servicios}` : "Sin extras";
    document.getElementById('detailModalExtras').textContent = extrasText;

    // Mostrar modal
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');

    // Configurar botón de cerrar
    const closeBtn = document.getElementById('closeDetailModal');
    const closeBtn2 = document.getElementById('closeDetailModalBtn');
    const backdrop = document.getElementById('detailModalBackdrop');

    const closeModal = () => {
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
    };

    if (closeBtn) closeBtn.onclick = closeModal;
    if (closeBtn2) closeBtn2.onclick = closeModal;
    if (backdrop) backdrop.onclick = closeModal;
};

window.editarReserva = (id) => {
    window.location.hash = `reservar?id=${id}`;
};

window.cancelar = async (id) => {
    const reserva = allReservas.find((item) => String(getReservaId(item)) === String(id));
    if (reserva) {
        const start = new Date(getStartDate(reserva));
        const now = new Date();
        const diffMs = start - now;
        const diffHours = diffMs / (1000 * 60 * 60);
        
        if (diffHours >= 0 && diffHours < 24) {
            if (!confirm(`¡ADVERTENCIA! Estás cancelando con menos de 24 horas de antelación. Se aplicarán cargos según nuestra política de cancelación.\n\n¿Estás seguro de que deseas cancelar la reserva #${id}?`)) return;
        } else {
            if (!confirm(`¿Estás seguro de que deseas cancelar la reserva #${id}?`)) return;
        }
    } else {
        if (!confirm(`¿Estás seguro de que deseas cancelar la reserva #${id}?`)) return;
    }

    try {
        // Enviar motivo al backend para el soft delete
        const motivo = prompt('Por favor, indica un motivo de cancelación (opcional):', 'Cancelación por el cliente');
        if (motivo === null) return; // Canceló el prompt
        
        await cancelarReserva(id, { motivo_cancelacion: motivo });
        alert("Reserva cancelada correctamente");
        location.reload();
    } catch (error) {
        alert("Error al cancelar: " + error.message);
    }
};

function formatMoney(value) {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatDate(value) {
    if (!value) return "N/A";
    return new Date(value).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "2-digit" });
}

function getNights(start, end) {
    const a = new Date(start);
    const b = new Date(end);
    const diff = Math.round((b - a) / 86400000);
    return Number.isFinite(diff) && diff > 0 ? diff : 1;
}

function getStatusClass(estado, reserva = null) {
    const text = getStatusText(estado, reserva).toLowerCase();
    if (text === "en curso" || text === "confirmada") return "status-active";
    if (text === "finalizada") return "status-completed";
    if (text === "cancelada") return "status-cancelled";
    if (text === "pendiente") return "status-pending";
    return "status-active";
}

function getStatusText(estado, reserva = null) {
    const s = String(estado || "").toLowerCase();
    if (["2", "cancelada", "cancelado", "cancelado"].includes(s)) return "Cancelada";
    if (["3", "finalizada", "completada", "completado", "finalizado"].includes(s)) return "Finalizada";
    if (["0", "pendiente", "por confirmar"].includes(s)) return "Pendiente";
    if (["1", "activa", "activo", "confirmada", "confirmado", "reservada"].includes(s)) {
        if (reserva && isCurrentReservation(reserva)) return "En curso";
        return "Confirmada";
    }
    return estado || "Pendiente";
}

function isCurrentReservation(reserva) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(getStartDate(reserva));
    const end = new Date(getEndDate(reserva));
    return start <= today && end >= today;
}

let eventsRegistered = false;
export async function renderReservas() {
    await init();
}
