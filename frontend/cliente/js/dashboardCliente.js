import { logout, isClientSession, isAdminSession, getSession } from "../../dashboard/core/authGuard.js";
import { getReservas, getHabitaciones, getPaquetes, getServicios } from "../../dashboard/core/api.js";

const fallbackRoomImage = "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1100&q=85";
const fallbackPackageImage = "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=900&q=85";

let habitacionesCache = [];
let paquetesCache = [];
let serviciosCache = [];

function getClientName(session) {
    return session?.nombre || session?.NombreCompleto || session?.Nombres || session?.Nombre || "Cliente";
}

function getClientId(session) {
    return session?.id_cliente || session?.IDCliente || session?.NroDocumento || session?.IDUsuario || session?.id;
}

function getHabitacionName(reserva) {
    return reserva?.habitacion?.nombre || reserva?.NombreHabitacion || reserva?.Habitacion || reserva?.id_habitacion || reserva?.IDHabitacion || "Habitacion Via Luna";
}

function normalizeText(text) {
    return String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function imageFromBlob(value) {
    if (!value) return "";
    if (typeof value === "string") {
        if (value === "[object Object]") return "";
        if (value.startsWith("data:") || value.startsWith("http") || value.startsWith("../") || value.startsWith("./")) return value;
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

function imageForRoom(room) {
    const dbImage = imageFromBlob(room.ImagenUrl || room.ImagenHabitacion || room.imagen || room.imagenHabitacion);
    if (dbImage) return dbImage;
    const text = normalizeText(`${room.NombreHabitacion || room.nombre || ""} ${room.Descripcion || room.descripcion || ""}`);
    if (text.includes("familiar")) return "../assets/images/rooms/familiar.png";
    if (text.includes("pareja") || text.includes("doble")) return "../assets/images/rooms/parejas.png";
    if (text.includes("individual") || text.includes("sencilla")) return "../assets/images/rooms/individual.png";
    return fallbackRoomImage;
}

function imageForPackage(pack) {
    return imageFromBlob(pack.ImagenUrl || pack.ImagenPaquete || pack.imagen || pack.imagenPaquete) || fallbackPackageImage;
}

function isActive(item) {
    const value = String(item?.Estado ?? item?.estado ?? "").toLowerCase();
    return ["", "1", "true", "activo", "activa", "disponible"].includes(value);
}

function getRoomId(room) {
    return room.IDHabitacion || room.id_habitacion || room.id || "";
}

function getPackageId(pack) {
    return pack.IDPaquete || pack.id || "";
}

function getServiceId(service) {
    return service.IDServicio || service.id || "";
}

function getRoomCapacity(room) {
    return room.CapacidadMaximaPersonas || room.capacidadMaximaPersonas || room.Capacidad || room.capacidad || "";
}

function getRoomBeds(room) {
    return room.cantidad_camas || room.CantidadCamas || room.camas || room.Camas || "";
}

function getRoomBedType(room) {
    return room.tipo_camas || room.TipoCamas || room.tipo_cama || room.TipoCama || "";
}

async function init() {
    try {
        const session = getSession();
        const token = localStorage.getItem("vialuna_token");

        if (!session || !token) {
            window.location.href = "../auth/login.html";
            return;
        }

        if (isAdminSession(session)) {
            window.location.href = "../admin/dashboard-admin.html";
            return;
        }

        if (!isClientSession(session)) {
            window.location.href = "../auth/login.html";
            return;
        }

        const userName = getClientName(session);
        setText("userNameDisplay", userName);
        setText("welcomeName", userName);
        setText("userInitial", userName.trim().charAt(0).toUpperCase() || "V");

        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", (event) => {
                event.preventDefault();
                logout();
            });
        }

        registrarEventosDetalle();

        const idCliente = getClientId(session);
        await Promise.all([
            idCliente ? cargarReservas(idCliente) : Promise.resolve(),
            cargarHabitaciones(),
            cargarPaquetes(),
            cargarServicios()
        ]);
    } catch (error) {
        console.error("Error critico en dashboard cliente:", error);
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

async function cargarReservas(idCliente) {
    try {
        const reservas = await getReservas({ id_cliente: idCliente });
        const list = Array.isArray(reservas) ? reservas : [];
        const todayStr = new Date().toISOString().split("T")[0];

        const enCurso = list.find((r) => {
            const fechaInicio = String(r.fecha_inicio || r.FechaInicio || "").split("T")[0];
            const fechaFin = String(r.fecha_fin || r.FechaFin || "").split("T")[0];
            return fechaInicio <= todayStr && fechaFin >= todayStr;
        });

        if (enCurso) {
            renderizarProximaReserva(enCurso);
            return;
        }

        const proxima = list
            .filter((r) => String(r.fecha_inicio || r.FechaInicio || "").split("T")[0] >= todayStr)
            .sort((a, b) => String(a.fecha_inicio || a.FechaInicio || "").localeCompare(String(b.fecha_inicio || b.FechaInicio || "")))[0];

        renderizarProximaReserva(proxima || null);
    } catch (error) {
        console.error("Error cargando reservas:", error);
        renderizarProximaReserva(null);
    }
}

function renderizarProximaReserva(reserva) {
    const container = document.getElementById("nextReservationCard");
    if (!container) return;

    if (!reserva) {
        container.innerHTML = `
            <div class="stay-icon" aria-hidden="true">VL</div>
            <div class="stay-info">
                <span>Proxima estancia</span>
                <h2>No tienes reservas activas.</h2>
                <p>Reserva una nueva experiencia cuando quieras volver.</p>
            </div>
            <a class="stay-arrow" href="nueva-reserva.html" aria-label="Reservar ahora">></a>
            <div class="stay-actions">
                <a class="btn-primary" href="nueva-reserva.html">Reservar ahora</a>
                <a class="btn-glass" href="reservas.html">Ver historial</a>
            </div>
        `;
        return;
    }

    const start = String(reserva.fecha_inicio || reserva.FechaInicio || "").split("T")[0];
    const end = String(reserva.fecha_fin || reserva.FechaFin || "").split("T")[0];
    const nights = getNights(start, end);
    const room = getHabitacionName(reserva);
    const estado = reserva?.estado?.nombre || reserva?.Estado || reserva?.NombreEstadoReserva || "Confirmada";
    const total = formatMoney(reserva.total || reserva.Total || reserva.TotalPagado || 0);

    container.innerHTML = `
        <div class="stay-icon" aria-hidden="true">VL</div>
        <div class="stay-info">
            <span>Proxima estancia</span>
            <h2>${formatLongDate(start)}</h2>
            <p>${nights} ${nights === 1 ? "noche" : "noches"} · ${room}</p>
        </div>
        <a class="stay-arrow" href="reservas.html" aria-label="Ver reserva">></a>
        <div class="stay-stay-details">
            <span class="stay-detail-item"><strong>Salida:</strong> ${formatLongDate(end)}</span>
            <span class="stay-detail-item"><strong>Estado:</strong> ${estado}</span>
            <span class="stay-detail-item"><strong>Total:</strong> ${total}</span>
        </div>
        <div class="stay-actions">
            <a class="btn-primary" href="reservas.html">Ver historial</a>
            <a class="btn-glass" href="nueva-reserva.html">Reservar ahora</a>
        </div>
    `;
}

async function cargarHabitaciones() {
    const grid = document.getElementById("roomsGrid");
    if (!grid) return;

    try {
        const habitaciones = await getHabitaciones();
        habitacionesCache = (Array.isArray(habitaciones) ? habitaciones : []).filter(isActive);
        const visibles = habitacionesCache.slice(0, 3);

        if (!visibles.length) {
            grid.innerHTML = '<article class="empty-state">No hay habitaciones disponibles por ahora.</article>';
            return;
        }

        grid.innerHTML = visibles.map((room, index) => {
            const title = room.NombreHabitacion || room.nombre || "Habitacion Via Luna";
            const price = room.Costo || room.Precio || room.precio || 0;
            const capacity = getRoomCapacity(room);
            const beds = getRoomBeds(room);
            const bedType = getRoomBedType(room);

            return `
                <article class="room-card">
                    <div class="room-media">
                        <img src="${imageForRoom(room)}" alt="${title}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackRoomImage}'">
                        ${index === 0 ? '<span class="room-badge">Mas popular</span>' : ""}
                    </div>
                    <div class="room-content">
                        <h3>${title}</h3>
                        <p>${room.Descripcion || room.descripcion || "Descripcion pendiente de actualizar."}</p>
                        <div class="room-tags">
                            ${capacity ? `<span>Capacidad: ${capacity} personas</span>` : ""}
                            ${beds ? `<span>${beds} camas</span>` : ""}
                            ${bedType ? `<span>${bedType}</span>` : ""}
                        </div>
                        <div class="room-footer">
                            <div class="room-price"><strong>${formatMoney(price)}</strong><small>por noche</small></div>
                            <button class="room-btn" type="button" data-detail-type="habitacion" data-detail-id="${getRoomId(room)}">Ver detalle</button>
                        </div>
                    </div>
                </article>
            `;
        }).join("");
    } catch (error) {
        console.error("Error cargando habitaciones:", error);
        grid.innerHTML = '<article class="empty-state">No fue posible cargar habitaciones.</article>';
    }
}

async function cargarPaquetes() {
    const list = document.getElementById("packagesList");
    if (!list) return;

    try {
        const paquetes = await getPaquetes();
        paquetesCache = (Array.isArray(paquetes) ? paquetes : []).filter(isActive);
        const visibles = paquetesCache.slice(0, 3);

        if (!visibles.length) {
            list.innerHTML = '<div class="empty-state">No hay paquetes disponibles por ahora.</div>';
            return;
        }

        list.innerHTML = visibles.map((pack) => {
            const title = pack.NombrePaquete || pack.nombre || "Paquete Via Luna";
            const desc = pack.Descripcion || pack.descripcion || "Experiencia especial para complementar tu estadia.";
            const price = pack.Precio || pack.precio || 0;
            return `
                <article class="package-item">
                    <img src="${imageForPackage(pack)}" alt="${title}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackPackageImage}'">
                    <div class="package-copy">
                        <h3>${title}</h3>
                        <p>${desc}</p>
                        <strong>${formatMoney(price)}</strong>
                    </div>
                    <button class="package-btn" type="button" data-detail-type="paquete" data-detail-id="${getPackageId(pack)}">Ver detalle</button>
                </article>
            `;
        }).join("");
    } catch (error) {
        console.error("Error cargando paquetes:", error);
        list.innerHTML = '<div class="empty-state">No fue posible cargar paquetes.</div>';
    }
}

async function cargarServicios() {
    const grid = document.getElementById("servicesGrid");
    if (!grid) return;

    try {
        const servicios = await getServicios();
        serviciosCache = (Array.isArray(servicios) ? servicios : []).filter(isActive);
        const visibles = serviciosCache.slice(0, 3);
        const icons = ["SPA", "Tour", "VIP"];

        if (!visibles.length) {
            grid.innerHTML = '<div class="empty-state">No hay servicios disponibles por ahora.</div>';
            return;
        }

        grid.innerHTML = visibles.map((service, index) => {
            const title = service.NombreServicio || service.nombre || "Servicio";
            const desc = service.Descripcion || service.descripcion || "Disponible";
            const price = service.Costo || service.Precio || service.precio || 0;
            const duracion = service.Duracion ? `${service.Duracion} min` : "";
            const personas = service.CantidadMaximaPersonas ? `Max ${service.CantidadMaximaPersonas} personas` : "";
            return `
                <article class="service-item">
                    <span class="service-icon">${icons[index % icons.length]}</span>
                    <div class="service-content">
                        <h3>${title}</h3>
                        <p>${desc}</p>
                        <small>${[duracion, personas].filter(Boolean).join(" · ")}</small>
                        <strong>${price ? formatMoney(price) : "Incluido"}</strong>
                    </div>
                    <button class="package-btn" type="button" data-detail-type="servicio" data-detail-id="${getServiceId(service)}">Ver detalle</button>
                </article>
            `;
        }).join("");
    } catch (error) {
        console.error("Error cargando servicios:", error);
        grid.innerHTML = '<div class="empty-state">No fue posible cargar servicios.</div>';
    }
}

function detailItem(label, value) {
    if (value === undefined || value === null || value === "") return "";
    return `
        <div class="detail-modal-item">
            <dt>${label}</dt>
            <dd>${value}</dd>
        </div>
    `;
}

function openDetailModal(title, items) {
    const modal = document.getElementById("detailModal");
    const modalTitle = document.getElementById("detailModalTitle");
    const grid = document.getElementById("detailModalGrid");
    if (!modal || !modalTitle || !grid) return;

    modalTitle.textContent = title;
    grid.innerHTML = items.filter(Boolean).join("");
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
}

function closeDetailModal() {
    const modal = document.getElementById("detailModal");
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
}

function registrarEventosDetalle() {
    document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-detail-type][data-detail-id]");
        if (!button) return;

        const { detailType, detailId } = button.dataset;
        if (detailType === "habitacion") {
            const room = habitacionesCache.find((item) => String(getRoomId(item)) === String(detailId));
            if (room) mostrarDetalleHabitacion(room);
        }
        if (detailType === "paquete") {
            const pack = paquetesCache.find((item) => String(getPackageId(item)) === String(detailId));
            if (pack) mostrarDetallePaquete(pack);
        }
        if (detailType === "servicio") {
            const service = serviciosCache.find((item) => String(getServiceId(item)) === String(detailId));
            if (service) mostrarDetalleServicio(service);
        }
    });

    document.querySelectorAll("[data-close-detail]").forEach((element) => {
        element.addEventListener("click", closeDetailModal);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeDetailModal();
    });
}

function mostrarDetalleHabitacion(room) {
    openDetailModal(room.NombreHabitacion || room.nombre || "Habitacion", [
        detailItem("Nombre", room.NombreHabitacion || room.nombre),
        detailItem("Descripcion", room.Descripcion || room.descripcion),
        detailItem("Costo", formatMoney(room.Costo || room.Precio || room.precio || 0)),
        detailItem("Capacidad", getRoomCapacity(room) ? `${getRoomCapacity(room)} personas` : ""),
        detailItem("Cantidad de camas", getRoomBeds(room) ? `${getRoomBeds(room)} camas` : ""),
        detailItem("Tipo de camas", getRoomBedType(room))
    ]);
}

function mostrarDetallePaquete(pack) {
    openDetailModal(pack.NombrePaquete || pack.nombre || "Paquete", [
        detailItem("Nombre", pack.NombrePaquete || pack.nombre),
        detailItem("Descripcion", pack.Descripcion || pack.descripcion),
        detailItem("Precio", formatMoney(pack.Precio || pack.precio || 0))
    ]);
}

function mostrarDetalleServicio(service) {
    openDetailModal(service.NombreServicio || service.nombre || "Servicio", [
        detailItem("Nombre", service.NombreServicio || service.nombre),
        detailItem("Descripcion", service.Descripcion || service.descripcion),
        detailItem("Duracion", service.Duracion ? `${service.Duracion} minutos` : ""),
        detailItem("Cantidad maxima de personas", service.CantidadMaximaPersonas || service.capacidadMaximaPersonas || ""),
        detailItem("Costo", formatMoney(service.Costo || service.Precio || service.precio || 0))
    ]);
}

function getNights(start, end) {
    const a = new Date(start);
    const b = new Date(end);
    const diff = Math.round((b - a) / 86400000);
    return Number.isFinite(diff) && diff > 0 ? diff : 1;
}

function formatLongDate(value) {
    if (!value) return "Fecha por confirmar";
    return new Date(value).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
}

function formatMoney(value) {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(value || 0));
}

init();
