import { logout, isClientSession, getSession } from "../../dashboard/core/authGuard.js";
import { getReservas, cancelarReserva, getPaquetes, getServicios, actualizarReserva } from "../../dashboard/core/api.js";
import { showAlert, renderPremiumPagination } from "../../dashboard/modules/ui-utils.js";

let allReservas = [];
let filteredReservas = [];
const statePagination = {
  currentPage: 1,
  itemsPerPage: 10
};
window.reservasPublicModule = {
  goToPage: (page) => { statePagination.currentPage = page; renderPage(); },
  changeItemsPerPage: (newSize) => { statePagination.itemsPerPage = Number(newSize); statePagination.currentPage = 1; renderPage(); }
};
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
        const token = sessionStorage.getItem("vialuna_token");

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
        const container = document.getElementById("allReservationsContainer");
        if (container) container.innerHTML = '<div class="empty-state">Error al cargar los datos.</div>';
    }
}

function aplicarFiltros() {
    const searchElem = document.getElementById("searchReservas");
    const filterElem = document.getElementById("filterEstado");
    const searchTerm = searchElem ? searchElem.value.toLowerCase() : "";
    const estadoFilter = filterElem ? filterElem.value : "";

    filteredReservas = allReservas.filter((r) => {
        const id = String(getReservaId(r)).toLowerCase();
        const habitacion = String(getHabitacionName(r)).toLowerCase();
        const estado = getStatusText(getEstadoValue(r), r).toLowerCase();
        return (id.includes(searchTerm) || habitacion.includes(searchTerm)) && (!estadoFilter || estado === estadoFilter);
    });

    statePagination.currentPage = 1;
    renderPage();
}

window.renderPage = function renderPage() {
    const container = document.getElementById("allReservationsContainer");
    if (!container) return;

    if (!filteredReservas.length) {
        container.innerHTML = '<div class="empty-state">No se encontraron reservas.</div>';
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const sorted = [...filteredReservas].sort((a, b) => new Date(getStartDate(b)) - new Date(getStartDate(a))); // Orden más reciente primero

    const pageSize = Number(statePagination.itemsPerPage) || 10;
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (statePagination.currentPage > totalPages) statePagination.currentPage = totalPages;

    const start = (statePagination.currentPage - 1) * pageSize;
    const pageItems = sorted.slice(start, start + pageSize);

    container.innerHTML = pageItems.map((r) => renderReservationCard(r, getStatusText(getEstadoValue(r), r) === "En curso")).join("");

    renderPremiumPagination('paginationContainer', statePagination, total, 'reservasPublicModule');
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
    const total = reserva.total || reserva.Total || reserva.TotalPagado || 0;
    let montoPagado = (reserva.monto_pagado !== undefined && reserva.monto_pagado !== null) ? Number(reserva.monto_pagado) : total;
    const saldoPendiente = (reserva.saldo_pendiente !== undefined && reserva.saldo_pendiente !== null) ? Number(reserva.saldo_pendiente) : 0;
    
    // Fix for older reservations where monto_pagado might be 0 in DB despite having been paid initially
    if (montoPagado === 0 && saldoPendiente > 0 && total > saldoPendiente) {
        montoPagado = total - saldoPendiente;
    }
    
    document.getElementById('detailModalTotal').textContent = formatMoney(total);
    
    const desgloseContainer = document.getElementById('totalesDesgloseContainer');
    
    if (desgloseContainer) {
        if (montoPagado > 0 && saldoPendiente > 0) {
            desgloseContainer.style.display = 'block';
            document.getElementById('detailModalMontoPagado').textContent = formatMoney(montoPagado);
            document.getElementById('detailModalSaldoPendiente').textContent = formatMoney(saldoPendiente);
            
            const rowExtras = document.getElementById('rowClientServiciosExtras');
            if (rowExtras) {
                rowExtras.style.display = 'flex';
            }
            
            const uploaderLabel = document.getElementById('comprobanteUploaderLabel');
            if (uploaderLabel) {
                uploaderLabel.textContent = 'Subir Comprobante por Servicios Extras';
            }
        } else {
            desgloseContainer.style.display = 'none';
            const uploaderLabel = document.getElementById('comprobanteUploaderLabel');
            if (uploaderLabel) {
                uploaderLabel.textContent = 'Subir / Actualizar Comprobante';
            }
        }
    }

    // Estado de Pago
    let estadoPagoText = reserva.estado_pago || 'Pendiente';
    const estadoReserva = String(getEstadoValue(reserva)).toLowerCase();
    
    // Si la reserva está confirmada, asumimos que el pago fue aceptado/confirmado
    if ((estadoReserva === '2' || estadoReserva === 'confirmada') && (estadoPagoText === 'En revisión' || estadoPagoText === 'Pendiente')) {
        estadoPagoText = 'Confirmado';
    }

    const estadoPagoBadge = document.getElementById('detailModalEstadoPago');
    if (estadoPagoBadge) {
        estadoPagoBadge.textContent = estadoPagoText;
        if (estadoPagoText === 'Pagado' || estadoPagoText === 'Confirmado') {
            estadoPagoBadge.style.backgroundColor = '#dcfce7';
            estadoPagoBadge.style.color = '#166534';
        } else if (estadoPagoText === 'En revisión') {
            estadoPagoBadge.style.backgroundColor = '#e0f2fe';
            estadoPagoBadge.style.color = '#075985';
        } else if (estadoPagoText === 'Rechazado') {
            estadoPagoBadge.style.backgroundColor = '#fee2e2';
            estadoPagoBadge.style.color = '#991b1b';
        } else {
            estadoPagoBadge.style.backgroundColor = '#fef08a';
            estadoPagoBadge.style.color = '#854d0e';
        }
    }

    // Comprobante UI
    const comprobanteViewer = document.getElementById('comprobanteViewer');
    const comprobanteLink = document.getElementById('comprobanteLink');
    const comprobanteUploader = document.getElementById('comprobanteUploader');

    if (reserva.comprobante_url) {
        comprobanteViewer.style.display = 'flex';
        const baseUrl = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "" 
            ? "http://localhost:10000"
            : "https://ficha-3312967-proyecto-hospedaje-vialuna.onrender.com";
        comprobanteLink.href = baseUrl + reserva.comprobante_url; // Adjust based on host
        
        // Populate status
        const statusEl = document.getElementById('comprobanteStatus');
        if (statusEl) {
            statusEl.innerHTML = `Estado del comprobante: <strong>${estadoPagoText}</strong>`;
            if (estadoPagoText === 'Pagado' || estadoPagoText === 'Confirmado') {
                statusEl.style.backgroundColor = '#dcfce7';
                statusEl.style.color = '#166534';
            } else if (estadoPagoText === 'Rechazado') {
                statusEl.style.backgroundColor = '#fee2e2';
                statusEl.style.color = '#991b1b';
            } else {
                statusEl.style.backgroundColor = '#e0f2fe';
                statusEl.style.color = '#075985';
            }
        }
        
        comprobanteUploader.style.display = (estadoPagoText === 'Pagado' || estadoPagoText === 'Confirmado' || estadoPagoText === 'En revisión') ? 'none' : 'flex';
    } else {
        comprobanteViewer.style.display = 'none';
        comprobanteUploader.style.display = 'flex';
    }

    const btnDeleteComprobante = document.getElementById('btnDeleteComprobante');
    if (btnDeleteComprobante) {
        const newBtnDelete = btnDeleteComprobante.cloneNode(true);
        btnDeleteComprobante.parentNode.replaceChild(newBtnDelete, btnDeleteComprobante);
        
        if (estadoPagoText === 'En revisión') {
            newBtnDelete.style.display = 'inline-block';
            newBtnDelete.onclick = async () => {
                const result = await Swal.fire({
                    title: '¿Retirar comprobante?',
                    text: 'Esto cambiará el estado de pago nuevamente a Pendiente.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    confirmButtonText: 'Sí, retirar',
                    cancelButtonText: 'Cancelar'
                });
                
                if (result.isConfirmed) {
                    newBtnDelete.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Retirando...';
                    newBtnDelete.disabled = true;
                    
                    try {
                        const token = sessionStorage.getItem("vialuna_token");
                        const baseUrl = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "" 
                            ? "http://localhost:10000"
                            : "https://ficha-3312967-proyecto-hospedaje-vialuna.onrender.com";
                        const apiUrl = `${baseUrl}/api/reservas/${id}/comprobante`;

                        const res = await fetch(apiUrl, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });

                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Error al retirar comprobante');

                        Swal.fire('¡Éxito!', data.mensaje, 'success').then(() => location.reload());
                    } catch (error) {
                        showAlert('Error', error.message, 'error');
                        newBtnDelete.innerHTML = '<i class="fa-solid fa-trash-can"></i> Retirar Comprobante';
                        newBtnDelete.disabled = false;
                    }
                }
            };
        } else {
            newBtnDelete.style.display = 'none';
        }
    }


    if ((estadoPagoText === 'Pagado' || estadoPagoText === 'En revisión' || estadoPagoText === 'Aprobado') && saldoPendiente <= 0) {
        comprobanteUploader.style.display = 'none';
    } else {
        comprobanteUploader.style.display = 'block';
    }

    // Setup uploader events for this reservation
    const comprobanteInput = document.getElementById('comprobanteInput');
    const btnSendComprobante = document.getElementById('btnSendComprobante');

    if (btnSendComprobante && comprobanteInput) {
        // Remove old listeners by cloning elements
        const newBtnSend = btnSendComprobante.cloneNode(true);
        btnSendComprobante.parentNode.replaceChild(newBtnSend, btnSendComprobante);
        const newInput = comprobanteInput.cloneNode(true);
        comprobanteInput.parentNode.replaceChild(newInput, comprobanteInput);

        newInput.value = ''; // reset
        newBtnSend.onclick = async () => {
            const file = newInput.files[0];
            if (!file) {
                Swal.fire('Atención', 'Por favor, selecciona un archivo (JPG, PNG, PDF) para subir.', 'warning');
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                showAlert('Error', 'El archivo no debe pesar más de 5MB.', 'error');
                return;
            }
            
            newBtnSend.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Subiendo...';
            newBtnSend.disabled = true;

            const formData = new FormData();
            formData.append('comprobante', file);

            try {
                const token = sessionStorage.getItem("vialuna_token");
                const baseUrl = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "" 
                    ? "http://localhost:10000"
                    : "https://ficha-3312967-proyecto-hospedaje-vialuna.onrender.com";
                
                const isPagoAdicional = (montoPagado > 0 && saldoPendiente > 0);
                const apiUrl = isPagoAdicional
                    ? `${baseUrl}/api/reservas/${id}/pago_adicional`
                    : `${baseUrl}/api/reservas/${id}/comprobante`;

                const res = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Error al subir comprobante');

                Swal.fire('¡Éxito!', data.mensaje, 'success').then(() => {
                    location.reload();
                });
            } catch (error) {
                showAlert('Error', error.message, 'error');
                newBtnSend.innerHTML = '<i class="fa-solid fa-upload"></i> Subir';
                newBtnSend.disabled = false;
            }
        };
    }

    // Historial Pagos Adicionales
    const pagosLista = document.getElementById('detailModalPagosAdicionalesLista');
    const pagosWrap = document.getElementById('detailModalPagosAdicionalesWrap');
    if (pagosWrap && pagosLista) {
        if (reserva.pagos_adicionales && reserva.pagos_adicionales.length > 0) {
            pagosWrap.style.display = 'block';
            const baseUrl = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "" 
                    ? "http://localhost:10000"
                    : "https://ficha-3312967-proyecto-hospedaje-vialuna.onrender.com";
            pagosLista.innerHTML = reserva.pagos_adicionales.map(p => {
                let badgeColor = '#fef08a'; let badgeText = '#854d0e';
                if (p.estado === 'Aprobado') { badgeColor = '#dcfce7'; badgeText = '#166534'; }
                if (p.estado === 'Rechazado') { badgeColor = '#fee2e2'; badgeText = '#991b1b'; }
                return `
                <div style="background:white; padding:8px; border-radius:6px; border:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="color:#173029;">${formatMoney(p.monto)}</strong>
                        <span style="font-size:0.8em; color:#64748b; margin-left:8px;">${p.fecha_pago ? formatDate(p.fecha_pago) : ''}</span>
                        <br>
                        <span class="status-badge" style="font-size:0.7em; padding:2px 6px; background:${badgeColor}; color:${badgeText};">${p.estado}</span>
                    </div>
                    ${p.comprobante_url ? `<a href="${baseUrl}${p.comprobante_url}" target="_blank" style="font-size:0.85em; color:#0284c7; text-decoration:none;"><i class="fa-solid fa-file-invoice"></i> Ver</a>` : ''}
                </div>
            `}).join("");
        } else {
            pagosWrap.style.display = 'none';
            pagosLista.innerHTML = '';
        }
    }

    // Botón Agregar más servicios
    const estadoTextoVer = getStatusText(getEstadoValue(reserva), reserva);
    const canEditVer = ["Pendiente", "Confirmada", "En curso"].includes(estadoTextoVer);

    const btnAgregarServicios = document.getElementById('btnAgregarServicios');
    if (btnAgregarServicios) {
        if (canEditVer) {
            btnAgregarServicios.style.display = 'inline-block';
            const newBtnAg = btnAgregarServicios.cloneNode(true);
            btnAgregarServicios.parentNode.replaceChild(newBtnAg, btnAgregarServicios);
            newBtnAg.onclick = () => {
                closeModal();
                editarReserva(id);
            };
        } else {
            btnAgregarServicios.style.display = 'none';
        }
    }

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
        const svcId = cb.value;
        const countEl = document.querySelector(`.svc-count-display-client-edit[data-svc-id="${svcId}"]`);
        const qty = countEl ? parseInt(countEl.textContent, 10) : 1;
        const unitPrice = Number(cb.getAttribute('data-price') || 0);
        const subSvc = unitPrice * qty;
        
        totalSvc += subSvc;
        svcHtml += `<div style="font-size:0.8rem;color:#6b7280;margin-left:12px;">• ${cb.getAttribute('data-name')} (${qty} persona${qty>1?'s':''} × ${formatMoney(unitPrice)}) = ${formatMoney(subSvc)}</div>`;
    });

    const totalNuevo = totalHab + totalPaq + totalSvc;
    if (window._clientInitialTotalNuevo === undefined) {
        window._clientInitialTotalNuevo = totalNuevo;
    }
    const costoAdicional = Math.max(0, totalNuevo - window._clientInitialTotalNuevo);
    const totalAnterior = Number(reserva.total || reserva.Total || reserva.TotalPagado || 0);
    const diferencia = totalNuevo - totalAnterior;

    const breakdownEl = document.getElementById('editClientBreakdown');
    if (breakdownEl) {
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
                    <strong style="color:#258a60;font-size:1.25rem;">${formatMoney(costoAdicional)}</strong>
                </div>
            </div>
        `;
    }

    return totalNuevo;
}

window.editarReserva = async (id) => {
    const reserva = allReservas.find((item) => String(getReservaId(item)) === String(id));
    if (!reserva) return;
    
    // Funciones globales de detalle
    window.verDetallePaqueteClient = (pid) => {
        const pkg = allPaquetesCatalog.find(p => (p.id_paquete || p.IDPaquete) == pid);
        if (!pkg) return;
        let imgSrc = pkg.ImagenUrl || pkg.imagenUrl || pkg.Imagen || pkg.imagen || pkg.ImagenPaquete || null;
        if (imgSrc && typeof imgSrc === 'object' && imgSrc.type === 'Buffer') imgSrc = String.fromCharCode.apply(null, imgSrc.data);
        if (imgSrc === 'null') imgSrc = null;
        if (typeof imgSrc === 'string' && imgSrc.trim()) {
            imgSrc = imgSrc.trim();
            if (imgSrc.startsWith('/http')) imgSrc = imgSrc.substring(1);
            if (!imgSrc.startsWith('http') && /^[\w\- .]+\.(png|jpg|jpeg|webp|gif)$/i.test(imgSrc)) imgSrc = `/uploads/${imgSrc}`;
            else if (!imgSrc.startsWith('http') && imgSrc.toLowerCase().includes('uploads') && !imgSrc.startsWith('/')) imgSrc = `/${imgSrc}`;
        }
        Swal.fire({
            title: `<h3 style="color:var(--brand-deep);margin:0;font-weight:800">${pkg.nombre || pkg.Nombre || pkg.NombrePaquete}</h3>`,
            html: `
                <div style="text-align:left;font-size:0.95rem;color:var(--muted);line-height:1.5;">
                  ${imgSrc ? `<img src="${imgSrc}" style="width:100%;height:200px;object-fit:cover;border-radius:12px;margin-bottom:16px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">` : ''}
                  <p><strong>Descripción:</strong><br>${pkg.descripcion || pkg.Descripcion || 'Sin descripción'}</p>
                  <div style="background:#f8fafc;padding:12px;border-radius:8px;margin-top:16px;border:1px solid #e2e8f0;display:flex;justify-content:space-between;">
                    <span style="font-weight:700;">Precio del Paquete:</span>
                    <span style="color:var(--brand);font-weight:800;font-size:1.1rem;">${formatMoney(pkg.precio || pkg.Precio || 0)}</span>
                  </div>
                </div>
            `,
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#258a60'
        });
    };

    window.verDetalleServicioClient = (sid) => {
        const svc = allServiciosCatalog.find(s => (s.id_servicio || s.IDServicio) == sid);
        if (!svc) return;
        
        let title = svc.nombre || svc.Nombre || svc.NombreServicio || 'Servicio';
        let desc = svc.descripcion || svc.Descripcion || '';
        let fullText = `${title} ${desc}`.toLowerCase();
        let imgSrc = svc.ImagenUrl || svc.imagenUrl || svc.Imagen || svc.imagen || svc.ImagenServicio || null;
        if (imgSrc && typeof imgSrc === 'object' && imgSrc.type === 'Buffer') imgSrc = String.fromCharCode.apply(null, imgSrc.data);
        if (!imgSrc || imgSrc === 'null') {
            if (fullText.includes('spa') || fullText.includes('masaje') || fullText.includes('relax')) imgSrc = '../assets/images/service/SPA.png';
            else if (fullText.includes('caballo') || fullText.includes('cabalgata')) imgSrc = '../assets/images/service/cabalgata.png';
            else if (fullText.includes('caminata') || fullText.includes('guiado') || fullText.includes('senderismo')) imgSrc = '../assets/images/service/caminata.png';
            else imgSrc = '../assets/images/service/SPA.png';
        }
        if (typeof imgSrc === 'string' && imgSrc.trim()) {
            imgSrc = imgSrc.trim();
            if (imgSrc.startsWith('/http')) imgSrc = imgSrc.substring(1);
            if (!imgSrc.startsWith('http') && /^[\w\- .]+\.(png|jpg|jpeg|webp|gif)$/i.test(imgSrc)) imgSrc = `/uploads/${imgSrc}`;
            else if (!imgSrc.startsWith('http') && imgSrc.toLowerCase().includes('uploads') && !imgSrc.startsWith('/')) imgSrc = `/${imgSrc}`;
        }
        
        if (title.toLowerCase() === 'servicio') {
            if (fullText.includes('spa') || fullText.includes('masaje')) title = 'Spa & Relajación';
            else if (fullText.includes('caballo') || fullText.includes('cabalgata')) title = 'Cabalgata Guiada';
            else if (fullText.includes('caminata') || fullText.includes('guiado')) title = 'Caminata Ecológica';
        }

        Swal.fire({
            title: `<h3 style="color:var(--brand-deep);margin:0;font-weight:800">${title}</h3>`,
            html: `
                <div style="text-align:left;font-size:0.95rem;color:var(--muted);line-height:1.5;">
                  ${imgSrc ? `<img src="${imgSrc}" style="width:100%;height:200px;object-fit:cover;border-radius:12px;margin-bottom:16px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">` : ''}
                  <p><strong>Descripción:</strong><br>${desc || 'Sin descripción'}</p>
                  <ul style="padding-left:20px; margin-top:10px;">
                    ${svc.Duracion || svc.duracion ? `<li><strong>Duración:</strong> ${svc.Duracion || svc.duracion} min</li>` : ''}
                    ${svc.CantidadMaximaPersonas || svc.capacidad_maxima ? `<li><strong>Capacidad Max:</strong> ${svc.CantidadMaximaPersonas || svc.capacidad_maxima} personas</li>` : ''}
                  </ul>
                  <div style="background:#f8fafc;padding:12px;border-radius:8px;margin-top:16px;border:1px solid #e2e8f0;display:flex;justify-content:space-between;">
                    <span style="font-weight:700;">Precio por Persona:</span>
                    <span style="color:var(--brand);font-weight:800;font-size:1.1rem;">${formatMoney(svc.precio || svc.Precio || svc.Costo || 0)}</span>
                  </div>
                </div>
            `,
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#258a60'
        });
    };

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

    pkGrid.innerHTML = allPaquetesCatalog.filter(p => Number(p.estado ?? p.Estado ?? 1) === 1).map(pkg => {
        const pid = String(pkg.id_paquete || pkg.IDPaquete || '');
        const currentPq = pqReservados.find(pr => String(pr.id_paquete || pr.IDPaquete || pr.id || '') === pid);
        const precio = Number((currentPq && (currentPq.precio || currentPq.total)) || pkg.precio || pkg.Precio || 0);
        const checked = !!currentPq;

        let imgSrc = pkg.ImagenUrl || pkg.imagenUrl || pkg.Imagen || pkg.imagen || pkg.ImagenPaquete || null;
        if (imgSrc && typeof imgSrc === 'object' && imgSrc.type === 'Buffer') imgSrc = String.fromCharCode.apply(null, imgSrc.data);
        if (imgSrc === 'null') imgSrc = null;
        if (typeof imgSrc === 'string' && imgSrc.trim()) {
            imgSrc = imgSrc.trim();
            if (imgSrc.startsWith('/http')) imgSrc = imgSrc.substring(1);
            if (!imgSrc.startsWith('http') && /^[\w\- .]+\.(png|jpg|jpeg|webp|gif)$/i.test(imgSrc)) imgSrc = `/uploads/${imgSrc}`;
            else if (!imgSrc.startsWith('http') && imgSrc.toLowerCase().includes('uploads') && !imgSrc.startsWith('/')) imgSrc = `/${imgSrc}`;
        }
        const displayTitle = pkg.nombre || pkg.Nombre || pkg.NombrePaquete || 'Paquete';

        return `
        <div class="package-checkbox modern-package" style="position: relative;">
          <input type="checkbox" id="client_edit_pkg_${pid}" name="clientEditPaquetes" value="${pid}" data-price="${precio}" data-name="${displayTitle}" data-original="${checked}" ${checked?'checked':''} class="package-check-input" style="position: absolute; opacity: 0; cursor: pointer;">
          <label for="client_edit_pkg_${pid}" class="package-label ${checked ? 'selected' : ''}" style="display: flex; flex-direction: column; cursor: pointer; border-radius: 16px; overflow: hidden; background: ${checked ? 'rgba(31, 106, 77, 0.05)' : 'white'}; border: 1px solid ${checked ? 'var(--brand)' : 'rgba(0,0,0,0.08)'}; box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: all 0.3s ease; height: 100%;">
            
            <div class="package-image" style="height: 120px; position: relative; background: #f9fafb;">
              ${imgSrc ? `<img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.style.display='none';">` : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 3rem; opacity: 0.4;">🎁</div>`}
              ${checked ? '<div class="checkmark" style="position: absolute; top: 10px; right: 10px; background: var(--brand); color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">✓</div>' : ''}
              
              <button type="button" onclick="event.preventDefault(); event.stopPropagation(); window.verDetallePaqueteClient('${pid}')" style="position: absolute; bottom: 8px; right: 8px; background: rgba(255,255,255,0.9); border: none; border-radius: 8px; padding: 6px 10px; font-size: 0.8rem; font-weight: 700; color: var(--brand-deep); cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 4px; backdrop-filter: blur(4px);">
                <i class="fa-solid fa-eye"></i> Detalle
              </button>
            </div>

            <div class="package-info" style="padding: 15px; display: flex; flex-direction: column; flex-grow: 1;">
              <h4 style="margin: 0 0 8px 0; font-size: 1.1rem; color: var(--brand-deep); line-height: 1.2;">${displayTitle}</h4>
              <p style="margin: 0 0 15px 0; font-size: 0.85rem; color: var(--muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4;">
                ${pkg.descripcion || pkg.Descripcion || 'Incluye servicios especiales para tu estadía.'}
              </p>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                <span class="package-price" style="font-weight: 700; color: var(--brand); font-size: 1.1rem;">${formatMoney(precio)}</span>
                <span style="font-size: 0.8rem; background: var(--paper); padding: 4px 10px; border-radius: 20px; color: var(--muted);">Paquete</span>
              </div>
            </div>
          </label>
        </div>
        `;
    }).join("");

    svGrid.innerHTML = allServiciosCatalog.filter(s => Number(s.estado ?? s.Estado ?? 1) === 1).map(service => {
        const sid = String(service.id_servicio || service.IDServicio || '');
        const currentSv = svReservados.find(sr => String(sr.id_servicio || sr.IDServicio || sr.id || '') === sid);
        const precio = Number((currentSv && (currentSv.precioGuardado || currentSv.costo || currentSv.Precio)) || service.precio || service.Precio || service.Costo || 0);
        const checked = !!currentSv;
        
        const personas = currentSv ? (currentSv._personas || 1) : 1;
        
        let title = service.nombre || service.Nombre || service.NombreServicio || 'Servicio';
        let desc = service.descripcion || service.Descripcion || '';
        let fullText = `${title} ${desc}`.toLowerCase();
        let serviceImg = service.ImagenUrl || service.imagenUrl || service.Imagen || service.imagen || service.ImagenServicio || null;
        if (serviceImg && typeof serviceImg === 'object' && serviceImg.type === 'Buffer') serviceImg = String.fromCharCode.apply(null, serviceImg.data);
        if (!serviceImg || serviceImg === 'null') {
            if (fullText.includes('spa') || fullText.includes('masaje') || fullText.includes('relax')) serviceImg = '../assets/images/service/SPA.png';
            else if (fullText.includes('caballo') || fullText.includes('cabalgata')) serviceImg = '../assets/images/service/cabalgata.png';
            else if (fullText.includes('caminata') || fullText.includes('guiado') || fullText.includes('senderismo')) serviceImg = '../assets/images/service/caminata.png';
            else serviceImg = '../assets/images/service/SPA.png';
        }
        if (typeof serviceImg === 'string' && serviceImg.trim()) {
            serviceImg = serviceImg.trim();
            if (serviceImg.startsWith('/http')) serviceImg = serviceImg.substring(1);
            if (!serviceImg.startsWith('http') && /^[\w\- .]+\.(png|jpg|jpeg|webp|gif)$/i.test(serviceImg)) serviceImg = `/uploads/${serviceImg}`;
            else if (!serviceImg.startsWith('http') && serviceImg.toLowerCase().includes('uploads') && !serviceImg.startsWith('/')) serviceImg = `/${serviceImg}`;
        }
        
        if (title.toLowerCase() === 'servicio') {
            if (fullText.includes('spa') || fullText.includes('masaje')) title = 'Spa & Relajación';
            else if (fullText.includes('caballo') || fullText.includes('cabalgata')) title = 'Cabalgata Guiada';
            else if (fullText.includes('caminata') || fullText.includes('guiado')) title = 'Caminata Ecológica';
        }

        return `
        <div class="service-checkbox modern-service" data-svc-id="${sid}">
          <div style="display:flex; flex-direction:column; border-radius:16px; overflow:hidden;
                      background:${checked ? 'rgba(31,106,77,0.05)' : 'white'};
                      border:1px solid ${checked ? 'var(--brand)' : 'rgba(0,0,0,0.08)'};
                      box-shadow:0 2px 8px rgba(0,0,0,0.04); transition:all 0.3s ease; height:100%;">

            <!-- Imagen -->
            <div class="service-image" style="height:120px; position:relative;">
              <img src="${serviceImg}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'">
              ${checked ? '<div class="checkmark" style="position:absolute; top:10px; right:10px; background:var(--brand); color:white; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; box-shadow:0 2px 6px rgba(0,0,0,.2);">✓</div>' : ''}
              
              <button type="button" onclick="event.preventDefault(); event.stopPropagation(); window.verDetalleServicioClient('${sid}')" style="position: absolute; bottom: 8px; right: 8px; background: rgba(255,255,255,0.9); border: none; border-radius: 8px; padding: 6px 10px; font-size: 0.8rem; font-weight: 700; color: var(--brand-deep); cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 4px; backdrop-filter: blur(4px);">
                <i class="fa-solid fa-eye"></i> Detalle
              </button>
            </div>

            <!-- Contenido -->
            <div style="padding:14px; display:flex; flex-direction:column; flex-grow:1; gap:8px;">
              <h4 style="margin:0; font-size:1rem; color:var(--brand-deep); line-height:1.2;">${title}</h4>
              <p style="margin:0; font-size:0.8rem; color:var(--muted); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.4;">
                ${desc || 'Servicio adicional para complementar tu estadía.'}
              </p>

              <!-- Precio por persona -->
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.82rem; color:var(--muted); margin-top:auto; padding-top:8px; border-top:1px solid rgba(0,0,0,.06);">
                <span>Precio/persona</span>
                <span style="font-weight:700; color:var(--brand);">${formatMoney(precio)}</span>
              </div>

              <!-- Selección y contador de personas -->
              <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
                <!-- Toggle selección -->
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; flex:1;">
                  <input type="checkbox"
                    name="clientEditServicios"
                    value="${sid}"
                    data-price="${precio}"
                    data-name="${title}"
                    data-original="${checked}"
                    class="service-check-input-client-edit"
                    data-service-id="${sid}"
                    ${checked ? 'checked' : ''}
                    style="width:16px; height:16px; accent-color:var(--brand); cursor:pointer; flex-shrink:0;">
                  <span style="font-size:0.82rem; font-weight:600; color:var(--brand-deep);">Agregar</span>
                </label>

                <!-- Contador personas -->
                <div class="svc-counter-client-edit" data-svc-id="${sid}"
                     style="display:${checked ? 'flex' : 'none'}; align-items:center; gap:4px;">
                  <button type="button" class="svc-dec-client-edit"
                    data-svc-id="${sid}" data-min-qty="${checked ? personas : 1}"
                    style="width:28px; height:28px; border-radius:8px; border:1px solid rgba(0,0,0,.12); background:#f8fafc; font-size:1rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--brand-deep);">−</button>
                  <span class="svc-count-display-client-edit" data-svc-id="${sid}"
                    style="min-width:28px; text-align:center; font-weight:700; font-size:0.95rem; color:var(--brand-deep);">${personas}</span>
                  <button type="button" class="svc-inc-client-edit"
                    data-svc-id="${sid}"
                    style="width:28px; height:28px; border-radius:8px; border:1px solid rgba(0,0,0,.12); background:#f8fafc; font-size:1rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--brand-deep);">+</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        `;
    }).join("");

    window._clientInitialTotalNuevo = undefined;
    calcularNuevoTotal(reserva);
    const recalc = () => calcularNuevoTotal(reserva);

    // Eventos visuales
    document.querySelectorAll('input[name="clientEditPaquetes"], input[name="clientEditServicios"]').forEach(el => {
        el.addEventListener('change', (e) => {
            if(e.target.name === 'clientEditPaquetes') {
                if (!e.target.checked && e.target.getAttribute('data-original') === 'true') {
                    // Prevent unchecking original
                    e.target.checked = true;
                    showAlert('Info', 'No puedes remover paquetes ya confirmados en la reserva', 'info');
                    return;
                }
                const label = e.target.closest('.modern-package').querySelector('.package-label');
                if(label) {
                    if(e.target.checked) {
                        label.style.background = 'rgba(31, 106, 77, 0.05)';
                        label.style.borderColor = 'var(--brand)';
                        const imgDiv = label.querySelector('.package-image');
                        if(imgDiv && !imgDiv.querySelector('.checkmark')) {
                          imgDiv.insertAdjacentHTML('beforeend', '<div class="checkmark" style="position: absolute; top: 10px; right: 10px; background: var(--brand); color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">✓</div>');
                        }
                    } else {
                        label.style.background = 'white';
                        label.style.borderColor = 'rgba(0,0,0,0.08)';
                        const checkmark = label.querySelector('.checkmark');
                        if(checkmark) checkmark.remove();
                    }
                }
            }
            if(e.target.name === 'clientEditServicios') {
                if (!e.target.checked && e.target.getAttribute('data-original') === 'true') {
                    e.target.checked = true;
                    showAlert('Info', 'No puedes remover servicios ya confirmados en la reserva', 'info');
                    return;
                }
                const svcId = e.target.dataset.serviceId;
                const card = e.target.closest('.modern-service').querySelector('div');
                const counter = svGrid.querySelector(`.svc-counter-client-edit[data-svc-id="${svcId}"]`);
                if(e.target.checked) {
                    if(counter) counter.style.display = 'flex';
                    if(card) { card.style.background = 'rgba(31,106,77,0.05)'; card.style.borderColor = 'var(--brand)'; }
                    const imgDiv = card.querySelector('.service-image');
                    if (imgDiv && !imgDiv.querySelector('.checkmark')) {
                      imgDiv.insertAdjacentHTML('beforeend', '<div class="checkmark" style="position:absolute;top:10px;right:10px;background:var(--brand);color:white;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,.2);">✓</div>');
                    }
                } else {
                    if(counter) counter.style.display = 'none';
                    if(card) { card.style.background = 'white'; card.style.borderColor = 'rgba(0,0,0,0.08)'; }
                    const checkmark = card.querySelector('.checkmark');
                    if(checkmark) checkmark.remove();
                    
                    const countEl = svGrid.querySelector(`.svc-count-display-client-edit[data-svc-id="${svcId}"]`);
                    if(countEl) countEl.textContent = '1';
                }
            }
            recalc();
        });
    });
    
    // Contadores de servicios
    svGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.svc-inc-client-edit, .svc-dec-client-edit');
        if (!btn) return;
        const svcId = btn.dataset.svcId;
        const isInc = btn.classList.contains('svc-inc-client-edit');
        const countEl = svGrid.querySelector(`.svc-count-display-client-edit[data-svc-id="${svcId}"]`);
        if (!countEl) return;
        
        let val = parseInt(countEl.textContent || '1', 10);
        const minQty = parseInt(btn.dataset.minQty || '1', 10);
        
        if (isInc) val = Math.min(val + 1, 20);
        else {
            if (val <= minQty && minQty > 1) {
                 showAlert('Info', 'No puedes reducir la cantidad de personas por debajo de lo reservado', 'info');
                 return;
            }
            val = Math.max(val - 1, minQty);
        }
        countEl.textContent = val;
        recalc();
    });

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
    if (text === "completada") return "status-completed";
    if (text === "cancelada" || text === "rechazada") return "status-cancelled";
    if (text === "pendiente") return "status-pending";
    return "status-active";
}

function getStatusText(estado, reserva = null) {
    const s = String(estado || "").toLowerCase();
    
    // Auto-completar si la fecha ya pasó
    // Mapeo exacto con los ID de la BD o por nombres comunes
    if (s === "1" || ["pendiente", "por confirmar"].includes(s)) return "Pendiente";
    if (s === "2" || ["confirmada", "confirmado", "reservada"].includes(s)) {
        if (reserva && isCurrentReservation(reserva)) return "En curso";
        return "Confirmada";
    }
    if (s === "3" || ["en proceso", "en curso", "activa", "activo"].includes(s)) return "En curso";
    if (s === "4" || ["completada", "completado"].includes(s)) return "Completada";
    if (s === "6" || ["rechazada", "rechazado"].includes(s)) return "Rechazada";
    if (["cancelada", "cancelado"].includes(s)) return "Cancelada";

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
