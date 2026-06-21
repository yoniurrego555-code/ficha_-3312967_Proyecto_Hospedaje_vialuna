import { logout, isClientSession, getSession } from "../../dashboard/core/authGuard.js";
import { getReservas, cancelarReserva, getPaquetes, getServicios, actualizarReserva } from "../../dashboard/core/api.js";
import { showAlert } from "../../dashboard/modules/ui-utils.js";

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
    const canEdit = ["Pendiente", "Confirmada", "En curso"].includes(estadoTexto);
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
    const habPrecio = reserva.habitacion ? Number(reserva.habitacion.precio || reserva.habitacion.Costo || 0) : 0;
    document.getElementById('detailModalHabitacion').innerHTML = `${getHabitacionName(reserva)} <br><span style="font-size:0.85rem;color:#6b7280;">(${formatMoney(habPrecio)} / noche)</span>`;
    document.getElementById('detailModalEntrada').textContent = formatDate(getStartDate(reserva));
    document.getElementById('detailModalSalida').textContent = formatDate(getEndDate(reserva));
    document.getElementById('detailModalEstado').textContent = getStatusText(getEstadoValue(reserva), reserva);
    document.getElementById('detailModalTotal').textContent = formatMoney(reserva.total || reserva.Total || reserva.TotalPagado || 0);

    // Extras (paquetes y servicios)
    const paquetes = Array.isArray(reserva.paquetes) && reserva.paquetes.length
        ? reserva.paquetes.map((item) => `<div>• ${item.nombre} <span style="color:#258a60;font-size:0.85em;">(${formatMoney(item.precio || item.total)})</span></div>`).join("")
        : "";
    const servicios = Array.isArray(reserva.servicios) && reserva.servicios.length
        ? reserva.servicios.map((item) => `<div>• ${item.nombre} <span style="color:#258a60;font-size:0.85em;">(${formatMoney(item.costo || item.precioGuardado || item.Precio)})</span></div>`).join("")
        : "";
    const extrasHtml = paquetes || servicios ? `<div style="display:flex;flex-direction:column;gap:4px;">${paquetes}${servicios}</div>` : "Sin extras";
    document.getElementById('detailModalExtras').innerHTML = extrasHtml;

    // Mostrar motivo de cancelación si aplica
    const motivoContainer = document.getElementById('detailModalMotivoContainer');
    const motivoEl = document.getElementById('detailModalMotivo');
    if (motivoContainer) {
        const estadoText = getStatusText(getEstadoValue(reserva), reserva).toLowerCase();
        if (estadoText === 'cancelada' && reserva.motivo_cancelacion) {
            motivoContainer.style.display = 'block';
            if (motivoEl) motivoEl.textContent = reserva.motivo_cancelacion;
        } else {
            motivoContainer.style.display = 'none';
        }
    }

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

let allPaquetesCatalog = [];
let allServiciosCatalog = [];

function calcularNuevoTotal(reserva) {
    const editClientFechaInicio = document.getElementById('editClientFechaInicio').value;
    const editClientFechaFin = document.getElementById('editClientFechaFin').value;
    const precioHab = Number(document.getElementById('editClientHabitacionPrice').value || 0);

    let noches = getNights(editClientFechaInicio, editClientFechaFin);
    const totalHab = precioHab * noches;

    let totalPaq = 0;
    let paqHtml = '';
    const paqChecks = document.querySelectorAll('input[name="clientEditPaquetes"]:checked');
    paqChecks.forEach(cb => {
        totalPaq += Number(cb.getAttribute('data-price') || 0);
        paqHtml += `<div style="font-size:0.8rem;color:#6b7280;margin-left:12px;">• ${cb.getAttribute('data-name')} (${formatMoney(cb.getAttribute('data-price') || 0)})</div>`;
    });

    let totalSvc = 0;
    let svcHtml = '';
    const svcChecks = document.querySelectorAll('input[name="clientEditServicios"]:checked');
    svcChecks.forEach(cb => {
        totalSvc += Number(cb.getAttribute('data-price') || 0);
        svcHtml += `<div style="font-size:0.8rem;color:#6b7280;margin-left:12px;">• ${cb.getAttribute('data-name')} (${formatMoney(cb.getAttribute('data-price') || 0)})</div>`;
    });

    const totalNuevo = totalHab + totalPaq + totalSvc;
    const totalAnterior = Number(reserva.total || reserva.Total || reserva.TotalPagado || 0);
    const diferencia = totalNuevo - totalAnterior;

    const breakdownEl = document.getElementById('editClientBreakdown');
    if (breakdownEl) {
        let diffHtml = '';
        if (diferencia > 0) {
            diffHtml = `<div style="display:flex;justify-content:space-between;padding:6px 0;">
                <span style="font-size:0.85rem;color:#b45309;font-weight:700;">⚠️ Diferencia a pagar:</span>
                <span style="font-weight:800;color:#b45309;">+${formatMoney(diferencia)}</span>
            </div>`;
        } else if (diferencia < 0) {
            diffHtml = `<div style="display:flex;justify-content:space-between;padding:6px 0;">
                <span style="font-size:0.85rem;color:#065f46;font-weight:700;">✅ Saldo a favor del cliente:</span>
                <span style="font-weight:800;color:#065f46;">${formatMoney(Math.abs(diferencia))}</span>
            </div>`;
        }

        let anteriorHtml = totalAnterior > 0 ? `
            <div style="display:flex;justify-content:space-between;padding:10px;background:#f8fafc;border-radius:8px;margin-bottom:10px;border:1px solid #e2e8f0;">
                <span style="font-size:0.95rem;color:#475569;font-weight:700;">Total pagado / anterior:</span>
                <span style="font-weight:800;color:#475569;">${formatMoney(totalAnterior)}</span>
            </div>
            <div style="font-size:0.85rem;font-weight:700;color:#173029;margin-bottom:6px;">Detalle de la Reserva Actualizada:</div>
        ` : '';

        breakdownEl.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:6px;">
                ${anteriorHtml}
                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f3f4f6;">
                    <span style="font-size:0.85rem;color:#6b7280;">🛏 Habitación (${noches} noches × ${formatMoney(precioHab)}):</span>
                    <span style="font-weight:700;color:#173029;">${formatMoney(totalHab)}</span>
                </div>
                <div style="display:flex;flex-direction:column;padding:8px 0;border-bottom:1px solid #f3f4f6;">
                    <div style="display:flex;justify-content:space-between;">
                        <span style="font-size:0.85rem;color:#6b7280;">🎁 Paquetes (${paqChecks.length}):</span>
                        <span style="font-weight:700;color:#173029;">${formatMoney(totalPaq)}</span>
                    </div>
                    ${paqHtml}
                </div>
                <div style="display:flex;flex-direction:column;padding:8px 0;border-bottom:1px solid #f3f4f6;">
                    <div style="display:flex;justify-content:space-between;">
                        <span style="font-size:0.85rem;color:#6b7280;">🔧 Servicios extra (${svcChecks.length}):</span>
                        <span style="font-weight:700;color:#173029;">${formatMoney(totalSvc)}</span>
                    </div>
                    ${svcHtml}
                </div>
                <div style="display:flex;justify-content:space-between;padding:10px 0;margin-top:4px;border-bottom:1px dashed #e5e7eb;">
                    <strong style="color:#173029;font-size:1rem;">TOTAL NUEVO:</strong>
                    <strong style="color:#258a60;font-size:1.25rem;">${formatMoney(totalNuevo)}</strong>
                </div>
                ${diffHtml}
            </div>
        `;
    }

    return totalNuevo;
}

window.editarReserva = async (id) => {
    const reserva = allReservas.find((item) => String(getReservaId(item)) === String(id));
    if (!reserva) return;

    const modal = document.getElementById('editModal');
    if (!modal) return;

    if (!allPaquetesCatalog.length) allPaquetesCatalog = await getPaquetes();
    if (!allServiciosCatalog.length) allServiciosCatalog = await getServicios();

    document.getElementById('editClientHabitacionName').textContent = getHabitacionName(reserva);
    document.getElementById('editClientHabitacionId').value = reserva.id_habitacion || reserva.IDHabitacion || (reserva.habitacion ? reserva.habitacion.id : null);
    
    // Extraer costo habitación
    const hab = reserva.habitacion;
    const precioHab = hab ? Number(hab.precio || hab.Precio || hab.Costo || 0) : 0;
    document.getElementById('editClientHabitacionPrice').value = precioHab;

    const fi = document.getElementById('editClientFechaInicio');
    const ff = document.getElementById('editClientFechaFin');
    
    fi.value = getStartDate(reserva).split('T')[0];
    ff.value = getEndDate(reserva).split('T')[0];
    
    // No permitir reducir fecha de llegada o adelantar checkout
    ff.min = ff.value;

    const pkGrid = document.getElementById('editClientPaquetesGrid');
    const svGrid = document.getElementById('editClientServiciosGrid');

    const pqReservados = reserva.paquetes || [];
    const svReservados = reserva.servicios || [];

    pkGrid.innerHTML = allPaquetesCatalog.filter(p => p.Estado == 1 || String(p.Estado).toLowerCase() === 'activo').map(p => {
        const pid = String(p.id_paquete || p.IDPaquete || '');
        const currentPq = pqReservados.find(pr => String(pr.id_paquete || pr.IDPaquete || pr.id || '') === pid);
        const precio = Number((currentPq && (currentPq.precio || currentPq.total)) || p.precio || p.Precio || 0);
        const checked = !!currentPq;
        const disabled = checked ? 'disabled' : '';

        return `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;cursor:${checked?'default':'pointer'};background:${checked?'rgba(37,138,96,0.06)':'#f9fafb'};border:1px solid ${checked?'#258a60':'#e5e7eb'};">
            <input type="checkbox" name="clientEditPaquetes" value="${pid}" data-price="${precio}" data-name="${p.nombre || p.Nombre || p.NombrePaquete || 'Paquete'}" ${checked?'checked':''} ${disabled} style="width:16px;height:16px;accent-color:#258a60;">
            <div style="flex:1;">
                <div style="font-size:0.9rem;font-weight:600;color:#173029;">${p.nombre || p.Nombre || p.NombrePaquete}</div>
                <div style="font-size:0.85rem;color:#258a60;font-weight:700;">${formatMoney(precio)}</div>
            </div>
        </label>`;
    }).join("");

    svGrid.innerHTML = allServiciosCatalog.filter(s => s.Estado == 1 || String(s.Estado).toLowerCase() === 'activo').map(s => {
        const sid = String(s.id_servicio || s.IDServicio || '');
        const currentSv = svReservados.find(sr => String(sr.id_servicio || sr.IDServicio || sr.id || '') === sid);
        const precio = Number((currentSv && (currentSv.precioGuardado || currentSv.costo || currentSv.Precio)) || s.precio || s.Precio || s.Costo || 0);
        const checked = !!currentSv;
        const disabled = checked ? 'disabled' : '';

        return `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;cursor:${checked?'default':'pointer'};background:${checked?'rgba(37,138,96,0.06)':'#f9fafb'};border:1px solid ${checked?'#258a60':'#e5e7eb'};">
            <input type="checkbox" name="clientEditServicios" value="${sid}" data-price="${precio}" data-name="${s.nombre || s.Nombre || s.NombreServicio || 'Servicio'}" ${checked?'checked':''} ${disabled} style="width:16px;height:16px;accent-color:#258a60;">
            <div style="flex:1;">
                <div style="font-size:0.9rem;font-weight:600;color:#173029;">${s.nombre || s.Nombre || s.NombreServicio}</div>
                <div style="font-size:0.85rem;color:#258a60;font-weight:700;">${formatMoney(precio)}</div>
            </div>
        </label>`;
    }).join("");

    calcularNuevoTotal(reserva);

    // Eventos
    const recalc = () => calcularNuevoTotal(reserva);
    document.querySelectorAll('input[name="clientEditPaquetes"], input[name="clientEditServicios"]').forEach(el => el.addEventListener('change', recalc));
    ff.addEventListener('change', recalc);
    fi.addEventListener('change', recalc);

    const form = document.getElementById('editReservaClientForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        try {
            const btn = document.getElementById('btnSaveClientEdit');
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
            btn.disabled = true;

            const newTotal = calcularNuevoTotal(reserva);
            const paquetesArr = Array.from(document.querySelectorAll('input[name="clientEditPaquetes"]:checked')).map(cb => parseInt(cb.value));
            const serviciosArr = Array.from(document.querySelectorAll('input[name="clientEditServicios"]:checked')).map(cb => parseInt(cb.value));

            const payload = {
                id_cliente: String(reserva.nr_documento || reserva.cliente?.nroDocumento || reserva.cliente?.NroDocumento || reserva.id_cliente || reserva.IDCliente || (reserva.cliente ? reserva.cliente.id : null)),
                id_habitacion: parseInt(document.getElementById('editClientHabitacionId').value),
                fecha_inicio: fi.value,
                fecha_fin: ff.value,
                hora_entrada: reserva.hora_entrada || reserva.HoraEntrada || '14:00',
                hora_salida: reserva.hora_salida || reserva.HoraSalida || '12:00',
                id_metodo_pago: reserva.id_metodo_pago || reserva.IDMetodoPago || (reserva.metodoPago ? reserva.metodoPago.id : 1),
                id_estado_reserva: parseInt(reserva.id_estado_reserva || reserva.estado?.id || reserva.estado || 1), // Se mantiene igual
                total: newTotal,
                paquetes: paquetesArr,
                servicios: serviciosArr
            };

            await actualizarReserva(id, payload);
            showAlert('Éxito', "Reserva actualizada correctamente", 'success');
            setTimeout(() => location.reload(), 1500);
        } catch (error) {
            showAlert('Error', "No se pudo actualizar: " + error.message, 'error');
            const btn = document.getElementById('btnSaveClientEdit');
            btn.innerHTML = 'Guardar Cambios';
            btn.disabled = false;
        }
    };

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');

    const closeModal = () => {
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
    };

    document.getElementById('closeEditModal').onclick = closeModal;
    document.getElementById('closeEditModalBtn').onclick = closeModal;
    document.getElementById('editModalBackdrop').onclick = closeModal;
};

window.cancelar = async (id) => {
    const reserva = allReservas.find((item) => String(getReservaId(item)) === String(id));
    let warningMsg = `¿Estás seguro de que deseas cancelar la reserva #${id}?`;

    if (reserva) {
        const start = new Date(getStartDate(reserva));
        const now = new Date();
        const diffMs = start - now;
        const diffHours = diffMs / (1000 * 60 * 60);
        
        if (diffHours >= 0 && diffHours < 24) {
            warningMsg = `¡ADVERTENCIA! Estás cancelando con menos de 24 horas de antelación. Se aplicarán cargos según nuestra política de cancelación.\n\n¿Estás seguro de que deseas cancelar la reserva #${id}?`;
        }
    }

    const confirmResult = await Swal.fire({
        title: 'Cancelar Reserva',
        text: warningMsg,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'Volver'
    });

    if (!confirmResult.isConfirmed) return;

    const { value: motivo } = await Swal.fire({
        title: 'Motivo de cancelación',
        input: 'text',
        inputLabel: 'Por favor, indica un motivo (opcional):',
        inputValue: 'Cancelación por el cliente',
        showCancelButton: true,
        confirmButtonText: 'Enviar',
        cancelButtonText: 'Cancelar'
    });

    if (motivo === undefined) return; // Canceló el prompt

    try {
        await cancelarReserva(id, { motivo_cancelacion: motivo });
        showAlert('Éxito', "Reserva cancelada correctamente", 'success');
        location.reload();
    } catch (error) {
        showAlert('Error', "Error al cancelar: " + error.message, 'error');
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
    if (text === "cancelada" || text === "rechazada") return "status-cancelled";
    if (text === "pendiente") return "status-pending";
    return "status-active";
}

function getStatusText(estado, reserva = null) {
    const s = String(estado || "").toLowerCase();
    
    // Auto-completar si la fecha ya pasó
    if (reserva && (["1", "activa", "activo", "confirmada", "confirmado", "reservada", "0", "5", "pendiente", "por confirmar"].includes(s))) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(getEndDate(reserva));
        if (end < today) return "Finalizada";
    }

    if (["2", "cancelada", "cancelado"].includes(s)) return "Cancelada";
    if (["4", "rechazada", "rechazado"].includes(s)) return "Rechazada";
    if (["3", "finalizada", "completada", "completado", "finalizado"].includes(s)) return "Finalizada";
    if (["0", "5", "pendiente", "por confirmar"].includes(s)) return "Pendiente";
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
