import { getHabitaciones, getPaquetes, getServicios } from "../../dashboard/core/api.js";
import { filterActive, sanitizeRoom, formatPrice, resolveServiceImage } from "../../dashboard/modules/ui-utils.js";

const fallbackRoomImage = "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1100&q=85";
const fallbackPackageImage = "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=900&q=85";

let cacheHabitaciones = [];
let cachePaquetes = [];
let cacheServicios = [];

function imageFromBlob(value) {
    if (!value) return "";
    if (Array.isArray(value)) return imageFromBlob(value[0]);
    if (typeof value === "string") {
        value = value.trim();
        if (value.startsWith('/http')) value = value.substring(1);
        if (value === "[object Object]") return "";
        if (value.startsWith('/')) return value;
        if (value.startsWith("data:") || value.startsWith("http") || value.startsWith("../") || value.startsWith("./")) return value;
        if (/^[\w\- .]+\.(png|jpg|jpeg|webp|gif)$/i.test(value)) return `/uploads/${value}`;
        if (value.toLowerCase().includes('uploads') && !value.startsWith('/')) return `/${value}`;
        if (!value.includes('base64') && !value.includes('://')) return `/${value}`;
        if (value.length > 80) return `data:image/jpeg;base64,${value}`;
    }
    return "";
}

// ---------------- HABITACIONES ----------------
export async function renderHabitaciones() {
    const grid = document.getElementById("fullRoomsGrid");
    if (!grid) return;

    try {
        const habitaciones = await getHabitaciones();
        cacheHabitaciones = filterActive(habitaciones).map(sanitizeRoom);

        if (!cacheHabitaciones.length) {
            grid.innerHTML = '<article class="empty-state">No hay habitaciones disponibles por ahora.</article>';
            return;
        }

        grid.innerHTML = cacheHabitaciones.map((room) => {
            const title = room.NombreHabitacion || "Habitación Via Luna";
            const description = room.Descripcion || "Sin descripción";
            const price = room.Costo || room.Precio || 0;
            const capacity = room.CapacidadMaximaPersonas || "";
            const beds = room.cantidad_camas || "";
            const bedType = room.tipo_camas || "";

            return `
                <article class="room-card">
                    <div class="room-media">
                        <img src="${room.ImagenUrl || imageFromBlob(room.imagenes || room.imagen) || fallbackRoomImage}" alt="${title}" loading="lazy" />
                    </div>
                    <div class="room-content">
                        <h3>${title}</h3>
                        <p>${description}</p>
                        <div class="room-tags">
                            ${capacity ? `<span data-tooltip="Capacidad">${capacity} personas</span>` : ""}
                            ${beds ? `<span data-tooltip="Camas">${beds} camas</span>` : ""}
                            ${bedType ? `<span data-tooltip="Tipo de camas">${bedType}</span>` : ""}
                        </div>
                        <div class="room-footer">
                            <div class="room-price"><strong>${formatPrice(price)}</strong><small>por noche</small></div>
                            <button class="room-btn" type="button" onclick="window.verDetalleCatalogo('habitacion', '${room.IDHabitacion || room.id_habitacion || room.id}')">Ver detalle</button>
                        </div>
                    </div>
                </article>
            `;
        }).join("");
    } catch (error) {
        grid.innerHTML = '<article class="empty-state">No fue posible cargar habitaciones.</article>';
    }
}

// ---------------- PAQUETES ----------------
export async function renderPaquetes() {
    const grid = document.getElementById("fullPackagesGrid");
    if (!grid) return;

    try {
        const paquetes = await getPaquetes();
        cachePaquetes = filterActive(paquetes).map(sanitizeRoom);

        if (!cachePaquetes.length) {
            grid.innerHTML = '<article class="empty-state">No hay paquetes disponibles por ahora.</article>';
            return;
        }

        grid.innerHTML = cachePaquetes.map((pack) => {
            const title = pack.NombrePaquete || "Paquete Via Luna";
            const description = pack.Descripcion || "Sin descripción";
            const price = pack.Precio || 0;

            return `
                <article class="room-card">
                    <div class="room-media">
                        <img src="${pack.ImagenUrl || imageFromBlob(pack.imagenes || pack.imagen) || fallbackPackageImage}" alt="${title}" loading="lazy" />
                    </div>
                    <div class="room-content">
                        <h3>${title}</h3>
                        <p>${description}</p>
                        <div class="room-footer" style="margin-top:auto; padding-top:15px;">
                            <div class="room-price"><strong>${formatPrice(price)}</strong><small>paquete</small></div>
                            <button class="room-btn" type="button" onclick="window.verDetalleCatalogo('paquete', '${pack.IDPaquete || pack.id}')">Ver detalle</button>
                        </div>
                    </div>
                </article>
            `;
        }).join("");
    } catch (error) {
        grid.innerHTML = '<article class="empty-state">No fue posible cargar paquetes.</article>';
    }
}

// ---------------- SERVICIOS ----------------
export async function renderServicios() {
    const grid = document.getElementById("fullServicesGrid");
    if (!grid) return;

    try {
        const servicios = await getServicios();
        cacheServicios = filterActive(servicios).map(sanitizeRoom);
        const icons = ["SPA", "Tour", "VIP", "Wifi"];

        if (!cacheServicios.length) {
            grid.innerHTML = '<article class="empty-state">No hay servicios disponibles por ahora.</article>';
            return;
        }

        grid.innerHTML = cacheServicios.map((service, index) => {
            const title = service.NombreServicio || "Servicio";
            const description = service.Descripcion || "Sin descripción";
            const price = service.Costo || 0;
            const duration = service.Duracion ? `${service.Duracion} min` : "";
            const persons = service.CantidadMaximaPersonas ? `Max ${service.CantidadMaximaPersonas} personas` : "";

            return `
                <article class="service-item">
                    <span class="service-icon">${icons[index % icons.length]}</span>
                    <div class="service-content">
                        <h3>${title}</h3>
                        <p>${description}</p>
                        <small>${[duration, persons].filter(Boolean).join(" · ")}</small>
                        <strong>${price ? formatPrice(price) : "Incluido"}</strong>
                    </div>
                    <button class="package-btn" type="button" onclick="window.verDetalleCatalogo('servicio', '${service.IDServicio || service.id}')">Ver detalle</button>
                </article>
            `;
        }).join("");
    } catch (error) {
        grid.innerHTML = '<article class="empty-state">No fue posible cargar servicios.</article>';
    }
}

// ---------------- MODAL LOGIC ----------------
function detailItem(label, value) {
    if (value === undefined || value === null || value === "") return "";
    return `
        <div class="detail-modal-item">
            <dt>${label}</dt>
            <dd>${value}</dd>
        </div>
    `;
}

window.verDetalleCatalogo = (tipo, id) => {
    let item = null;
    let modalSuffix = "";
    let items = [];

    if (tipo === "habitacion") {
        item = cacheHabitaciones.find(x => String(x.IDHabitacion || x.id_habitacion || x.id) === String(id));
        if (item) {
            modalSuffix = "Habitacion";
            items = [
                detailItem("Nombre", item.NombreHabitacion || item.nombre),
                detailItem("Descripción", item.Descripcion || item.descripcion),
                detailItem("Precio", formatPrice(item.Costo || item.Precio || 0)),
                detailItem("Capacidad", item.CapacidadMaximaPersonas ? `${item.CapacidadMaximaPersonas} personas` : ""),
                detailItem("Camas", item.cantidad_camas ? `${item.cantidad_camas} camas` : ""),
                detailItem("Tipo", item.tipo_camas || item.tipo_cama)
            ];
            document.getElementById("btnReservarHabitacion").href = `#reservar?habitacion=${id}`;
        }
    } else if (tipo === "paquete") {
        item = cachePaquetes.find(x => String(x.IDPaquete || x.id) === String(id));
        if (item) {
            modalSuffix = "Paquete";
            items = [
                detailItem("Nombre", item.NombrePaquete || item.nombre),
                detailItem("Descripción", item.Descripcion || item.descripcion),
                detailItem("Precio", formatPrice(item.Precio || item.precio || 0))
            ];
            document.getElementById("btnReservarPaquete").href = `#reservar?paquete=${id}`;
        }
    } else if (tipo === "servicio") {
        item = cacheServicios.find(x => String(x.IDServicio || x.id) === String(id));
        if (item) {
            modalSuffix = "Servicio";
            items = [
                detailItem("Nombre", item.NombreServicio || item.nombre),
                detailItem("Descripción", item.Descripcion || item.descripcion),
                detailItem("Precio", formatPrice(item.Costo || item.precio || 0)),
                detailItem("Duración", item.Duracion ? `${item.Duracion} min` : ""),
                detailItem("Capacidad Max", item.CantidadMaximaPersonas || "")
            ];
        }
    }

    if (!item) return;

    const modal = document.getElementById(`detailModal${modalSuffix}`);
    const title = document.getElementById(`detailModalTitle${modalSuffix}`);
    const grid = document.getElementById(`detailModalGrid${modalSuffix}`);

    if (title && grid) {
        title.textContent = item.NombreHabitacion || item.NombrePaquete || item.NombreServicio || item.nombre || "Detalle";
        grid.innerHTML = items.filter(Boolean).join("");
    }

    if (modal) {
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
    }
};

document.addEventListener("click", (e) => {
    if (e.target.matches("[data-close-detail-hab]")) {
        const m = document.getElementById("detailModalHabitacion");
        if(m) m.classList.remove("show");
    }
    if (e.target.matches("[data-close-detail-paq]")) {
        const m = document.getElementById("detailModalPaquete");
        if(m) m.classList.remove("show");
    }
    if (e.target.matches("[data-close-detail-srv]")) {
        const m = document.getElementById("detailModalServicio");
        if(m) m.classList.remove("show");
    }
});
