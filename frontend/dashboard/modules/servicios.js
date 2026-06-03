import { createCrudModule } from './shared/crud-module.js';
import { apiUrl } from './shared/api-config.js';
import { showAlert, renderPremiumPagination } from './ui-utils.js';
import { getAppUrl } from '../core/authGuard.js';

// Helper to resolve high-quality image for each service
function resolveServiceImage(item) {
    const itemNameRaw = item.nombre || item.NombreServicio || item.Nombre || '';
    const itemDesc = item.descripcion || item.Descripcion || '';
    const fullText = `${itemNameRaw} ${itemDesc}`.toLowerCase();
    
    if (fullText.includes('spa') || fullText.includes('masaje') || fullText.includes('relajacion') || fullText.includes('terapia')) {
        return getAppUrl('assets/images/service/SPA.png');
    } else if (fullText.includes('caballo') || fullText.includes('cabalgata') || fullText.includes('equino')) {
        return getAppUrl('assets/images/service/cabalgata.png');
    } else if (fullText.includes('caminata') || fullText.includes('guiado') || fullText.includes('recorrido') || fullText.includes('ecoturismo')) {
        return getAppUrl('assets/images/service/caminata.png');
    }
    
    return getAppUrl('assets/images/service/SPA.png');
}

// Helper to resolve dynamic service label
function resolveServiceLabel(item) {
    const itemNameRaw = item.nombre || item.NombreServicio || item.Nombre || 'Servicio';
    const fullText = itemNameRaw.toLowerCase();
    
    if (fullText === 'servicio') {
        const desc = (item.descripcion || item.Descripcion || '').toLowerCase();
        const combined = `${fullText} ${desc}`;
        if (combined.includes('spa') || combined.includes('masaje')) return 'Spa & Relajación';
        if (combined.includes('caballo') || combined.includes('cabalgata')) return 'Cabalgata Guiada';
        if (combined.includes('caminata') || combined.includes('senderismo')) return 'Caminata Ecológica';
    }
    return itemNameRaw;
}

const crud = createCrudModule({
    itemName: 'Servicios',
    primaryKey: 'IDServicio',
    baseUrl: apiUrl('servicios'),
    elements: {
        form: null,
        formTitle: null,
        submitButton: null,
        mensaje: null,
        contenedor: null,
        buscador: null,
        btnCancelarEdicion: null,
        btnNuevo: null,
        servicioModal: null,
        filtroEstado: null,
        btnLimpiarFiltros: null,
        metricTotal: null,
        metricActivos: null,
        metricInactivos: null,
        
        // Detalle elements mapping
        servicioDetalleModal: null,
        detalleNombre: null,
        detalleID: null,
        detalleImagenPrincipal: null,
        detalleCostoBadge: null,
        detalleDescripcion: null
    },
    formCreateTitle: 'Nuevo Servicio',
    formEditTitle: (item) => `Editar Servicio #${item.id || item.IDServicio}`,
    submitCreateText: 'Guardar servicio',
    submitEditText: 'Actualizar servicio',
    
    getPayload: (form) => {
        const formData = new FormData(form);
        return {
            NombreServicio: String(formData.get('nombre') || '').trim(),
            Descripcion: String(formData.get('descripcion') || 'Servicio de Via Luna').trim(),
            Costo: Number(formData.get('precio')),
            Estado: parseInt(formData.get('estado')),
            Duracion: Number(formData.get('duracion')) || 120,
            DuracionMinutos: Number(formData.get('duracion')) || 120,
            CantidadMaximaPersonas: Number(formData.get('capacidad')) || 10,
            CapacidadMaxima: Number(formData.get('capacidad')) || 10,
            EdadMinima: Number(formData.get('edadMinima')) || null,
            EdadMaxima: Number(formData.get('edadMaxima')) || null,
            DescripcionExtra: String(formData.get('descripcionExtra') || '').trim() || null,
            ImagenUrl: String(formData.get('imagenUrl') || '').trim() || null
        };
    },
    fillForm: (item) => {
        document.getElementById('servicioId').value = item.id || item.IDServicio;
        document.getElementById('nombre').value = item.nombre || item.NombreServicio || '';
        
        const descEl = document.getElementById('descripcion');
        if (descEl) descEl.value = item.descripcion || item.Descripcion || '';
        
        document.getElementById('precio').value = item.precio || item.Costo || '';
        document.getElementById('estado').value = item.estado !== undefined ? item.estado : (item.Estado !== undefined ? item.Estado : 1);
        
        const duracionEl = document.getElementById('duracion');
        if (duracionEl) duracionEl.value = item.DuracionMinutos || item.Duracion || '';
        
        const capacidadEl = document.getElementById('capacidad');
        if (capacidadEl) capacidadEl.value = item.CapacidadMaxima || item.CantidadMaximaPersonas || '';
        
        const edadMinEl = document.getElementById('edadMinima');
        if (edadMinEl) edadMinEl.value = item.EdadMinima || '';

        const edadMaxEl = document.getElementById('edadMaxima');
        if (edadMaxEl) edadMaxEl.value = item.EdadMaxima || '';

        const descExtraEl = document.getElementById('descripcionExtra');
        if (descExtraEl) descExtraEl.value = item.DescripcionExtra || '';

        const imgUrlEl = document.getElementById('imagenUrl');
        if (imgUrlEl) imgUrlEl.value = item.ImagenUrl || '';
    },
    onResetForm: () => {
        document.getElementById('servicioId').value = '';
        document.getElementById('estado').value = '1';
    },
    renderResumen: (items, elements) => {
        if (elements.metricTotal) elements.metricTotal.textContent = items.length;
        if (elements.metricActivos) elements.metricActivos.textContent = items.filter((item) => (item.estado == 1 || item.Estado == 1)).length;
        if (elements.metricInactivos) elements.metricInactivos.textContent = items.filter((item) => (item.estado == 0 || item.Estado == 0)).length;
    },
    renderCard: (item, { escapeHtml, formatMoney }) => {
        const itemId = item.id || item.IDServicio || item.ID || 'N/A';
        const displayTitle = resolveServiceLabel(item);
        const itemPrice = item.precio || item.Costo || item.Precio || 0;
        const itemDesc = item.descripcion || item.Descripcion || 'Servicio rústico exclusivo para complementar tu estadía en el hotel.';
        const itemEstado = item.estado !== undefined ? item.estado : (item.Estado !== undefined ? item.Estado : 1);
        const serviceImg = item.ImagenUrl || item.Imagen || resolveServiceImage(item);
        
        let statusBg = itemEstado == 1 ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white';

        return `
        <article class="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col">
            <!-- Service Image -->
            <div class="h-44 w-full overflow-hidden relative bg-gray-50">
                <img src="${serviceImg}" alt="Servicio" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                
                <!-- Modern Status Switch on Card -->
                <div class="absolute top-4 right-4 bg-white/95 backdrop-blur-md rounded-full shadow-lg px-3 py-1.5 flex items-center gap-3 transition-all duration-300">
                    <label class="relative inline-block w-8 h-4 m-0 cursor-pointer shrink-0">
                        <input type="checkbox" class="sr-only peer" ${itemEstado == 1 ? 'checked' : ''} 
                               onchange="window.serviciosModule.changeStatusFromCard('${itemId}', this.checked ? 1 : 0)">
                        <span class="absolute inset-0 rounded-full bg-slate-200 peer-checked:bg-emerald-500 transition-colors duration-300 before:content-[''] before:absolute before:h-3 before:w-3 before:left-[2px] before:bottom-[2px] before:bg-white before:rounded-full before:transition-transform before:duration-300 peer-checked:before:translate-x-4"></span>
                    </label>
                    <span class="text-[9px] font-extrabold uppercase tracking-wider transition-all duration-300 shrink-0 ${itemEstado == 1 ? 'text-emerald-700' : 'text-red-600'}">
                        ${itemEstado == 1 ? 'Activo' : 'Inactivo'}
                    </span>
                </div>
            </div>

            <!-- Service Content -->
            <div class="p-5 flex-1 flex flex-col gap-4">
                <div class="flex flex-col gap-1">
                    <div class="flex items-center justify-between gap-2">
                        <h4 class="text-brand-deep font-bold text-base m-0 tracking-tight group-hover:text-brand transition-colors duration-200 line-clamp-1">${escapeHtml(displayTitle)}</h4>
                        <span class="text-[10px] font-bold text-muted bg-gray-100 px-2 py-0.5 rounded-md shrink-0">ID: #${itemId}</span>
                    </div>
                    <p class="text-muted text-xs leading-relaxed m-0 h-8 line-clamp-2">
                        ${escapeHtml(itemDesc)}
                    </p>
                </div>

                <!-- Price and Actions Layout Orderly and Logical -->
                <div class="mt-auto flex flex-col gap-3 pt-3 border-t border-gray-100">
                    <div class="flex justify-between items-baseline">
                        <span class="text-[10px] font-bold text-muted">Tarifa base</span>
                        <span class="text-base font-bold text-brand-deep">${formatMoney(itemPrice)}</span>
                    </div>

                    <!-- Clean CRUD Actions -->
                    <div class="flex flex-col gap-2">
                        <button style="min-height: 40px; border-radius: 10px; background: var(--brand); color: white; border: none; font-weight: 600; cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;" type="button" data-action="detalle" data-id="${itemId}">
                            <i class="fa-solid fa-eye"></i> Ver detalle
                        </button>
                        <div class="card-actions" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <button class="button secondary" style="min-height: 40px; border-radius: 10px; background: #f8fafc; font-weight: 600; cursor: pointer; border: 1px solid rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center; gap: 6px;" type="button" data-action="editar" data-id="${itemId}">
                                <i class="fa-solid fa-pen"></i> Editar
                            </button>
                            <button class="button danger" style="min-height: 40px; border-radius: 10px; background: #fef2f2; color: #ef4444; border: none; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;" type="button" data-action="eliminar" data-id="${itemId}">
                                <i class="fa-solid fa-trash"></i> Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </article>
        `;
    }
});

function openModal() {
    const modal = crud.elements.servicioModal;
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeModal() {
    const modal = crud.elements.servicioModal;
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Function to open dynamic service detail modal
function mostrarDetalleServicio(item) {
    if (!crud.elements.servicioDetalleModal) return;

    const itemId = item.id || item.IDServicio || item.ID || '';
    const displayTitle = resolveServiceLabel(item);
    const itemPrice = item.precio || item.Costo || 0;
    const itemDesc = item.descripcion || item.Descripcion || 'Experiencia exclusiva diseñada para regalarle una inmersión completa en la tranquilidad, rodeado de la naturaleza idílica de Via Luna.';
    const serviceImg = item.ImagenUrl || resolveServiceImage(item);
    const duracionStr = item.DuracionMinutos ? `${item.DuracionMinutos} min` : (item.Duracion || item.duracion ? `${item.Duracion || item.duracion} min` : 'No definida');
    const capacidadStr = item.CapacidadMaxima ? `${item.CapacidadMaxima} pers.` : (item.CantidadMaximaPersonas || item.cantidadMaximaPersonas ? `${item.CantidadMaximaPersonas || item.cantidadMaximaPersonas} pers.` : 'No definida');
    const edadStr = (item.EdadMinima || item.EdadMaxima) ? `${item.EdadMinima || 0} - ${item.EdadMaxima || 99} años` : 'Para todas las edades';
    const extraDesc = item.DescripcionExtra ? `\n\nNotas Extra: ${item.DescripcionExtra}` : '';

    // Populate standard text fields
    crud.elements.detalleNombre.textContent = displayTitle;
    crud.elements.detalleID.textContent = `ID: #${itemId}`;
    crud.elements.detalleCostoBadge.textContent = `COP $${Number(itemPrice).toLocaleString()}`;
    crud.elements.detalleDescripcion.textContent = itemDesc + extraDesc;
    crud.elements.detalleImagenPrincipal.src = serviceImg;
    
    const statsContainer = crud.elements.servicioDetalleModal.querySelector('.grid.grid-cols-2.gap-3');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="p-3 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
                <i class="fa-solid fa-stopwatch text-indigo-500 mb-1 text-lg"></i>
                <span class="block text-[9px] text-muted font-bold uppercase tracking-wider">Duración</span>
                <strong class="block text-xs text-brand-deep mt-0.5">${duracionStr}</strong>
            </div>
            <div class="p-3 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
                <i class="fa-solid fa-users text-blue-500 mb-1 text-lg"></i>
                <span class="block text-[9px] text-muted font-bold uppercase tracking-wider">Capacidad</span>
                <strong class="block text-xs text-brand-deep mt-0.5">${capacidadStr}</strong>
            </div>
            <div class="col-span-2 p-3 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
                <i class="fa-solid fa-child text-emerald-500 mb-1 text-lg"></i>
                <span class="block text-[9px] text-muted font-bold uppercase tracking-wider">Rango de Edad</span>
                <strong class="block text-xs text-brand-deep mt-0.5">${edadStr}</strong>
            </div>
        `;
    }

    // Display Detail Modal
    crud.elements.servicioDetalleModal.classList.remove('hidden');
}

// Event handler for direct status dropdown update
async function manejarCambioEstadoRapido(event) {
    const select = event.target.closest('.service-status-select');
    if (!select) return;

    const id = select.dataset.id;
    const nuevoEstado = parseInt(select.value);
    const item = crud.findById(id);

    if (!item) return;

    try {
        select.disabled = true;
        const payload = {
            NombreServicio: item.nombre || item.NombreServicio,
            Descripcion: item.descripcion || item.Descripcion,
            Costo: Number(item.precio || item.Costo),
            Estado: nuevoEstado,
            Duracion: item.duracion || item.Duracion || 120,
            DuracionMinutos: item.DuracionMinutos || item.duracion || item.Duracion || 120,
            CantidadMaximaPersonas: item.cantidadMaximaPersonas || item.CantidadMaximaPersonas || 10,
            CapacidadMaxima: item.CapacidadMaxima || item.cantidadMaximaPersonas || item.CantidadMaximaPersonas || 10,
            EdadMinima: item.EdadMinima || null,
            EdadMaxima: item.EdadMaxima || null,
            DescripcionExtra: item.DescripcionExtra || null,
            ImagenUrl: item.ImagenUrl || null
        };

        await crud.update(id, payload);
        
        // Update local item
        item.Estado = nuevoEstado;
        item.estado = nuevoEstado;
        
        // Render success and counters
        crud.onRender(crud.state.items);
    } catch (error) {
        showAlert('Error', `Error al actualizar estado: ${error.message}`, 'error');
        crud.onRender(crud.state.items); // Reset
    }
}

// Card Click delegation handler (Solves the disconnected CRUD buttons bug!)
async function manejarClickEnContenedor(event) {
    // Dropdown change shouldn't trigger button action
    if (event.target.closest('.service-status-select')) return;

    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;
    const item = crud.findById(id);

    if (!item) return;

    if (action === 'detalle') {
        mostrarDetalleServicio(item);
        return;
    }

    if (action === 'editar') {
        crud.edit(id);
        return;
    }

    if (action === 'eliminar') {
        const confirmRes = await Swal.fire({
          title: '¿Eliminar Servicio?',
          text: `¿Deseas eliminar el servicio "${item.nombre || item.NombreServicio}"?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, eliminar',
          cancelButtonText: 'Cancelar'
        });
        const confirmar = confirmRes.isConfirmed;
        if (!confirmar) return;

        try {
            await crud.remove(id);
            crud.onRender(crud.state.items); // Refresh list
        } catch (error) {
            showAlert('Error', `Error al eliminar: ${error.message}`, 'error');
        }
    }
}

export function renderServicios(container) {
    crud.elements = {
        form: container.querySelector('#servicioForm'),
        formTitle: container.querySelector('#formTitle'),
        submitButton: container.querySelector('#submitButton'),
        mensaje: container.querySelector('#mensaje'),
        contenedor: container.querySelector('#serviciosContainer'),
        buscador: container.querySelector('#buscador'),
        btnCancelarEdicion: container.querySelector('#btnCancelarEdicion'),
        btnNuevo: container.querySelector('#btnNuevoServicio'),
        servicioModal: container.querySelector('#servicioModal'),
        filtroEstado: container.querySelector('#filtroEstado'),
        btnLimpiarFiltros: container.querySelector('#btnLimpiarFiltros'),
        metricTotal: container.querySelector('#metricTotal'),
        metricActivos: container.querySelector('#metricActivos'),
        metricInactivos: container.querySelector('#metricInactivos'),
        
        // Detalle elements mapping
        servicioDetalleModal: container.querySelector('#servicioDetalleModal'),
        detalleNombre: container.querySelector('#detalleNombre'),
        detalleID: container.querySelector('#detalleID'),
        detalleImagenPrincipal: container.querySelector('#detalleImagenPrincipal'),
        detalleCostoBadge: container.querySelector('#detalleCostoBadge'),
        detalleDescripcion: container.querySelector('#detalleDescripcion')
    };

    // Eventos específicos
    if (crud.elements.btnNuevo) {
        crud.elements.btnNuevo.onclick = () => {
            crud.state.editandoId = null;
            crud.onResetForm();
            if (crud.elements.form) crud.elements.form.reset();
            crud.elements.formTitle.textContent = crud.formCreateTitle;
            crud.elements.submitButton.textContent = crud.submitCreateText;
            openModal();
        };
    }

    if (crud.elements.btnCancelarEdicion) {
        crud.elements.btnCancelarEdicion.onclick = closeModal;
    }

    if (crud.elements.filtroEstado) {
        crud.elements.filtroEstado.onchange = () => {
            crud.onRender(crud.state.items);
        };
    }

    // Image preview handler for servicio modal
    const servicioImagenInput = container.querySelector('#imagenUrl');
    const servicioImagenPreview = container.querySelector('#servicioImagenPreview');
    if (servicioImagenInput && servicioImagenPreview) {
        servicioImagenInput.addEventListener('input', () => {
            const url = servicioImagenInput.value.trim();
            if (!url) { servicioImagenPreview.textContent = 'Vista previa'; return; }
            const img = new Image();
            img.onload = () => {
                servicioImagenPreview.innerHTML = '';
                img.className = 'w-full h-full object-cover';
                servicioImagenPreview.appendChild(img);
            };
            img.onerror = () => {
                servicioImagenPreview.innerHTML = '<span class="text-xs text-muted">URL inválida</span>';
            };
            img.src = url;
        });
    }

    if (crud.elements.btnLimpiarFiltros) {
        crud.elements.btnLimpiarFiltros.onclick = () => {
            if (crud.elements.buscador) crud.elements.buscador.value = '';
            if (crud.elements.filtroEstado) crud.elements.filtroEstado.value = 'todos';
            crud.state.currentPage = 1;
            crud.onRender(crud.state.items);
        };
    }

    crud.state.currentPage = 1;
    crud.state.itemsPerPage = 10;

    // Attach Delegation Handlers directly on the container
    if (crud.elements.contenedor) {
        crud.elements.contenedor.addEventListener('click', manejarClickEnContenedor);
        crud.elements.contenedor.addEventListener('change', manejarCambioEstadoRapido);
    }
    
    // Sobrescribir onRender para filtros
    crud.onRender = (items) => {
        let filtrados = items;
        const query = crud.elements.buscador?.value.toLowerCase();
        const estado = crud.elements.filtroEstado?.value;

        if (query) {
            filtrados = filtrados.filter(it => {
                const nameText = String(it.nombre || it.NombreServicio || '').toLowerCase();
                const descText = String(it.descripcion || it.Descripcion || '').toLowerCase();
                return nameText.includes(query) || descText.includes(query);
            });
        }

        if (estado && estado !== 'todos') {
            filtrados = filtrados.filter(it => {
                const currentStatus = it.estado !== undefined ? it.estado : (it.Estado !== undefined ? it.Estado : 1);
                return String(currentStatus) === String(estado);
            });
        }

        const cont = crud.elements.contenedor;
        if (!cont) return;

        if (!filtrados.length) {
            cont.innerHTML = `
                <div class="col-span-full py-16 px-6 text-center bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3">
                    <span class="text-4xl">📭</span>
                    <h4 class="text-brand-deep font-bold text-lg m-0">No se encontraron servicios</h4>
                    <p class="text-muted text-sm max-w-sm m-0">Intenta cambiar los filtros de búsqueda o agrega un nuevo servicio desde el panel superior.</p>
                </div>
            `;
            const paginationDiv = document.getElementById('serviciosPaginationContainer');
            if (paginationDiv) paginationDiv.innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(filtrados.length / crud.state.itemsPerPage) || 1;
        if (crud.state.currentPage > totalPages) crud.state.currentPage = totalPages;
        
        const start = (crud.state.currentPage - 1) * crud.state.itemsPerPage;
        const end = start + crud.state.itemsPerPage;
        const paginatedData = filtrados.slice(start, end);

        cont.innerHTML = paginatedData.map(item => crud.renderCard(item, {
            escapeHtml: (str) => String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])),
            formatMoney: (num) => `$${Number(num).toLocaleString()} COP`
        })).join('');

        crud.renderResumen(items, crud.elements);
        renderPremiumPagination('serviciosPaginationContainer', crud.state, filtrados.length, 'serviciosModule');
    };

    // Attach to Window for globals usage (card buttons & pagination)
    window.serviciosModule = {
        goToPage: (page) => {
            crud.state.currentPage = page;
            crud.onRender(crud.state.items);
        },
        changeItemsPerPage: (newSize) => {
            crud.state.itemsPerPage = Number(newSize);
            crud.state.currentPage = 1;
            crud.onRender(crud.state.items);
        },
        changeStatusFromCard: async (id, nuevoEstado) => {
            const select = { dataset: { id }, value: nuevoEstado, disabled: false };
            manejarCambioEstadoRapido({ target: { closest: () => select } });
        }
    };

    let paginationDiv = document.getElementById('serviciosPaginationContainer');
    if (!paginationDiv) {
        paginationDiv = document.createElement('div');
        paginationDiv.id = 'serviciosPaginationContainer';
        const cont = crud.elements.contenedor;
        if (cont && cont.parentNode) {
            cont.parentNode.insertBefore(paginationDiv, cont.nextSibling);
        }
    }

    // Al editar, abrir modal
    crud.edit = async (id) => {
        const item = crud.findById(id);
        if (item) {
            crud.fillForm(item);
            crud.state.editandoId = id;
            crud.elements.formTitle.textContent = typeof crud.formEditTitle === 'function' ? crud.formEditTitle(item) : crud.formEditTitle;
            crud.elements.submitButton.textContent = crud.submitEditText;
            openModal();
        }
    };

    // Form submit wiring
    if (crud.elements.form) {
        crud.elements.form.onsubmit = async (e) => {
            e.preventDefault();
            const payload = crud.getPayload(crud.elements.form);
            try {
                if (crud.state.editandoId) {
                    await crud.update(crud.state.editandoId, payload);
                } else {
                    await crud.create(payload);
                }
                setTimeout(() => {
                    closeModal();
                    crud.onRender(crud.state.items); // Force re-render list with new items
                }, 1000);
            } catch (err) {
                console.error(err);
            }
        };
    }

    // Listar y renderizar
    crud.init();

    window.serviciosModule = {
        ...crud,
        goToPage: (page) => {
            crud.state.currentPage = page;
            crud.onRender(crud.state.items);
        },
        changeStatusFromCard: async (id, nuevoEstado) => {
            const item = crud.findById(id);
            if (!item) return;

            try {
                const payload = {
                    NombreServicio: item.nombre || item.NombreServicio,
                    Descripcion: item.descripcion || item.Descripcion,
                    Costo: Number(item.precio || item.Costo),
                    Estado: nuevoEstado,
                    Duracion: item.duracion || item.Duracion || 120,
                    DuracionMinutos: item.DuracionMinutos || item.duracion || item.Duracion || 120,
                    CantidadMaximaPersonas: item.cantidadMaximaPersonas || item.CantidadMaximaPersonas || 10,
                    CapacidadMaxima: item.CapacidadMaxima || item.cantidadMaximaPersonas || item.CantidadMaximaPersonas || 10,
                    EdadMinima: item.EdadMinima || null,
                    EdadMaxima: item.EdadMaxima || null,
                    DescripcionExtra: item.DescripcionExtra || null,
                    ImagenUrl: item.ImagenUrl || null
                };

                await crud.update(id, payload);
                item.Estado = nuevoEstado;
                item.estado = nuevoEstado;
                crud.onRender(crud.state.items);
            } catch (error) {
                showAlert('Error', `Error al actualizar estado: ${error.message}`, 'error');
                crud.onRender(crud.state.items);
            }
        }
    };
}

document.addEventListener('DOMContentLoaded', crud.init);