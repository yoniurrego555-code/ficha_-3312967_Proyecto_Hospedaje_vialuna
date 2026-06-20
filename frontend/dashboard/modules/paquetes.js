import { createCrudModule } from './shared/crud-module.js';
import { apiUrl } from '../../js/shared/api-config.js';
import { showAlert, renderPremiumPagination } from './ui-utils.js';

const crud = createCrudModule({
    itemName: 'Paquetes',
    primaryKey: 'IDPaquete',
    baseUrl: apiUrl('paquetes'),
    elements: {
        form: null,
        formTitle: null,
        submitButton: null,
        mensaje: null,
        contenedor: null,
        buscador: null,
        btnCancelarEdicion: null,
        btnNuevo: null,
        paqueteModal: null,
        filtroEstado: null,
        btnLimpiarFiltros: null,
        metricTotal: null,
        metricDisponibles: null,
        metricAgotados: null,
        
        // Detalle elements mapping
        paqueteDetalleModal: null,
        detalleNombre: null,
        detalleID: null,
        detalleCostoBadge: null,
        detalleDescripcion: null
    },
    formCreateTitle: 'Nuevo Paquete',
    formEditTitle: (item) => `Editando paquete #${item.id || item.IDPaquete}`,
    submitCreateText: 'Guardar paquete',
    submitEditText: 'Actualizar paquete',
    
    getPayload: (form) => {
        const formData = new FormData(form);
        return {
            NombrePaquete: String(formData.get('nombre') || '').trim(),
            Descripcion: String(formData.get('descripcion') || '').trim(),
            Precio: Number(formData.get('precio')),
            Estado: parseInt(formData.get('estado')),
            IDServicio: formData.getAll('idServicio').length > 0 ? formData.getAll('idServicio').join(',') : null,
            IDHabitacion: formData.get('idHabitacion') ? parseInt(formData.get('idHabitacion')) : null,
            ImagenUrl: String(formData.get('imagenUrl') || '').trim() || null
        };
    },
    searchText: (item) => String(item.nombre || item.NombrePaquete || '').toLowerCase(),
    fillForm: (item) => {
        document.getElementById('paqueteId').value = item.id || item.IDPaquete;
        document.getElementById('nombre').value = item.nombre || item.NombrePaquete || '';
        document.getElementById('descripcion').value = item.descripcion || item.Descripcion || '';
        document.getElementById('precio').value = item.precio || item.Precio || '';
        document.getElementById('estado').value = item.estado !== undefined ? item.estado : (item.Estado !== undefined ? item.Estado : 1);
        
        const servContainer = document.getElementById('serviciosCheckboxes');
        if (servContainer) {
            const serviciosStr = item.IDServicio ? String(item.IDServicio) : '';
            const serviciosArr = serviciosStr.split(',').filter(Boolean);
            servContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = serviciosArr.includes(cb.value);
            });
        }
        
        const habEl = document.getElementById('idHabitacion');
        if (habEl) habEl.value = item.IDHabitacion || '';
        
        const imgEl = document.getElementById('imagenUrl');
        if (imgEl) imgEl.value = item.ImagenUrl || item.ImagenPaquete || '';
    },
    onResetForm: () => {
        document.getElementById('paqueteId').value = '';
        document.getElementById('estado').value = '1';
    },
    renderResumen: (items, elements) => {
        if (elements.metricTotal) elements.metricTotal.textContent = items.length;
        if (elements.metricDisponibles) elements.metricDisponibles.textContent = items.filter((item) => (item.estado == 1 || item.Estado == 1)).length;
        if (elements.metricAgotados) elements.metricAgotados.textContent = items.filter((item) => (item.estado == 0 || item.Estado == 0)).length;
        // Reservados: estado 2 si la API usa ese código, si no quedará en 0
        if (elements.metricReservados) elements.metricReservados.textContent = items.filter((item) => (item.estado == 2 || item.Estado == 2)).length;
    },
    renderCard: (item, { escapeHtml, formatMoney }) => {
        const itemId = item.id || item.IDPaquete || item.ID || 'N/A';
        const itemNameRaw = item.nombre || item.NombrePaquete || item.Nombre || 'Paquete';
        const itemPrice = item.precio || item.Precio || 0;
        const itemDesc = item.descripcion || item.Descripcion || 'Paquete especial con servicios seleccionados.';
        const itemEstado = item.estado !== undefined ? item.estado : (item.Estado !== undefined ? item.Estado : 1);

        const statusText = itemEstado == 1 ? 'Disponible' : 'Agotado';
        const statusColor = itemEstado == 1 ? 'var(--ok)' : '#ef4444';

        const imgSrc = item.ImagenUrl || item.Imagen || item.imagen || null;

        const hasService = !!(item.IDServicio || item.ServicioIncluidoNombre || item.servicio);

        return `
        <article class="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col">
            <!-- Top media -->
            <div class="h-48 w-full overflow-hidden relative bg-gray-50">
                ${imgSrc ? `<img src="${imgSrc}" alt="${escapeHtml(itemNameRaw)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">` : `<div class="w-full h-full flex items-center justify-center text-6xl opacity-40">🎁</div>`}

                <!-- Modern Status Switch on Card -->
                <div class="absolute top-4 right-4 bg-white/95 backdrop-blur-md rounded-full shadow-lg px-3 py-1.5 flex items-center gap-3 transition-all duration-300">
                    <label class="relative inline-block w-8 h-4 m-0 cursor-pointer shrink-0">
                        <input type="checkbox" class="sr-only peer" ${itemEstado == 1 ? 'checked' : ''} 
                               onchange="window.paquetesModule.changeStatusFromCard('${itemId}', this.checked ? 1 : 0)">
                        <span class="absolute inset-0 rounded-full bg-slate-200 peer-checked:bg-emerald-500 transition-colors duration-300 before:content-[''] before:absolute before:h-3 before:w-3 before:left-[2px] before:bottom-[2px] before:bg-white before:rounded-full before:transition-transform before:duration-300 peer-checked:before:translate-x-4"></span>
                    </label>
                    <span class="text-[9px] font-extrabold uppercase tracking-wider transition-all duration-300 shrink-0 ${itemEstado == 1 ? 'text-emerald-700' : 'text-red-600'}">
                        ${itemEstado == 1 ? 'Disponible' : 'Agotado'}
                    </span>
                </div>
            </div>

            <!-- Content -->
            <div class="p-6 flex-1 flex flex-col gap-4">
                <div class="flex flex-col gap-1.5">
                    <div class="flex items-center justify-between gap-2">
                        <h4 class="text-brand-deep font-bold text-lg m-0 tracking-tight group-hover:text-brand transition-colors duration-200 line-clamp-1">${escapeHtml(itemNameRaw)}</h4>
                        <span class="text-[10px] font-bold text-muted bg-gray-100 px-2 py-0.5 rounded-md shrink-0">ID: #${itemId}</span>
                    </div>
                    <p class="text-muted text-xs leading-relaxed m-0 min-h-[58px] line-clamp-3">
                        ${escapeHtml(itemDesc)}
                    </p>
                </div>

                <!-- Icons metadata -->
                <div class="flex items-center gap-4 text-xs font-semibold text-muted bg-gray-50/50 p-2.5 rounded-xl border border-gray-100/50">
                    <span class="flex items-center gap-1.5" title="Servicio Incluido"><i class="fa-solid fa-spa ${hasService ? 'text-brand' : 'text-gray-300'}"></i> <span class="truncate">${hasService ? 'Servicio incl.' : 'Sin Servicio'}</span></span>
                </div>

                <!-- Price and Actions Layout Orderly and Logical -->
                <div class="mt-auto flex flex-col gap-3 pt-4 border-t border-gray-100">
                    <div class="flex justify-between items-baseline">
                        <span class="text-xs font-bold text-muted">Precio Paquete</span>
                        <span class="text-lg font-bold text-brand-deep">${formatMoney(itemPrice)}</span>
                    </div>

                    <!-- Clean CRUD Actions -->
                    <div class="flex flex-col gap-2">
                        <button class="w-full h-10 rounded-xl bg-brand text-white font-semibold flex items-center justify-center gap-2 hover:bg-brand-deep transition-colors shadow-sm cursor-pointer border-none" type="button" data-action="detalle" data-id="${itemId}">
                            <i class="fa-solid fa-eye"></i> Ver detalle
                        </button>
                        <div class="grid grid-cols-2 gap-2">
                            <button class="h-10 rounded-xl bg-slate-50 text-brand-deep border border-slate-200 font-semibold flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors cursor-pointer" type="button" data-action="editar" data-id="${itemId}">
                                <i class="fa-solid fa-pen text-sm"></i> Editar
                            </button>
                            <button class="h-10 rounded-xl bg-red-50 text-red-600 border border-transparent font-semibold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors cursor-pointer" type="button" data-action="eliminar" data-id="${itemId}">
                                <i class="fa-solid fa-trash text-sm"></i> Eliminar
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
    const modal = crud.elements.paqueteModal;
    if (modal) {
        modal.classList.remove('hidden');
        loadServiciosSelect();
        loadHabitacionesSelect();
    }
}

function closeModal() {
    const modal = crud.elements.paqueteModal;
    if (modal) {
        modal.classList.add('hidden');
    }
}

function mostrarDetallePaquete(item) {
    if (!crud.elements.paqueteDetalleModal) return;

    const itemId = item.id || item.IDPaquete || item.ID || '';
    const itemNameRaw = item.nombre || item.NombrePaquete || item.Nombre || 'Paquete';
    const itemPrice = item.precio || item.Precio || 0;
    const itemDesc = item.descripcion || item.Descripcion || 'Paquete especial con servicios seleccionados.';

    let fullDesc = itemDesc;
    const servNombre = item.ServiciosIncluidosNombres || item.ServicioIncluidoNombre || '';
    
    if (servNombre) {
        fullDesc += '\n\n—\nINCLUYE:';
        const serviciosLista = servNombre.split(',').map(s => s.trim());
        serviciosLista.forEach(s => {
            fullDesc += `\n✨ Servicio: ${s}`;
        });
    }

    crud.elements.detalleNombre.textContent = itemNameRaw;
    crud.elements.detalleID.textContent = `ID: #${itemId}`;
    crud.elements.detalleCostoBadge.textContent = `COP $${Number(itemPrice).toLocaleString()}`;
    crud.elements.detalleDescripcion.textContent = fullDesc;

    const imgPrincipal = crud.elements.paqueteDetalleModal.querySelector('#detalleImagenPrincipal');
    const iconFallback = crud.elements.paqueteDetalleModal.querySelector('#detalleIconFallback');
    const imgSrc = item.ImagenUrl || item.ImagenPaquete || null;
    if (imgPrincipal && iconFallback) {
        if (imgSrc) {
            imgPrincipal.src = imgSrc;
            imgPrincipal.classList.remove('hidden');
            iconFallback.classList.add('hidden');
        } else {
            imgPrincipal.src = '';
            imgPrincipal.classList.add('hidden');
            iconFallback.classList.remove('hidden');
        }
    }

    crud.elements.paqueteDetalleModal.classList.remove('hidden');
}

export function renderPaquetes(container) {
    crud.elements = {
        form: container.querySelector('#paqueteForm'),
        formTitle: container.querySelector('#formTitle'),
        submitButton: container.querySelector('#submitButton'),
        mensaje: container.querySelector('#mensaje'),
        contenedor: container.querySelector('#contenedor'),
        buscador: container.querySelector('#buscador'),
        btnCancelarEdicion: container.querySelector('#btnCancelarEdicion'),
        btnNuevo: container.querySelector('#btnNuevoPaquete'),
        paqueteModal: container.querySelector('#paqueteModal'),
        filtroEstado: container.querySelector('#filtroEstado'),
        btnLimpiarFiltros: container.querySelector('#btnLimpiarFiltros'),
        metricTotal: container.querySelector('#metricTotal'),
        metricDisponibles: container.querySelector('#metricDisponibles'),
        metricAgotados: container.querySelector('#metricAgotados'),
        
        // Detalle elements mapping
        paqueteDetalleModal: container.querySelector('#paqueteDetalleModal'),
        detalleNombre: container.querySelector('#detalleNombre'),
        detalleID: container.querySelector('#detalleID'),
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

    if (crud.elements.buscador) {
        crud.elements.buscador.addEventListener('input', () => {
            crud.onRender(crud.state.items);
        });
    }

    if (crud.elements.filtroEstado) {
        crud.elements.filtroEstado.onchange = () => {
            crud.onRender(crud.state.items);
        };
    }

    // Image preview handler for paquete modal
    const paqueteImagenInput = container.querySelector('#imagenUrl');
    const paqueteImagenPreview = container.querySelector('#paqueteImagenPreview');
    if (paqueteImagenInput && paqueteImagenPreview) {
        paqueteImagenInput.addEventListener('input', () => {
            const url = paqueteImagenInput.value.trim();
            if (!url) { paqueteImagenPreview.textContent = 'Vista previa'; return; }
            const img = new Image();
            img.onload = () => {
                paqueteImagenPreview.innerHTML = '';
                img.className = 'w-full h-full object-cover';
                paqueteImagenPreview.appendChild(img);
            };
            img.onerror = () => {
                paqueteImagenPreview.innerHTML = '<span class="text-xs text-muted">URL inválida</span>';
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

    crud.onRender = (items) => {
        let filtrados = items;
        const query = crud.elements.buscador?.value.toLowerCase();
        const estado = crud.elements.filtroEstado?.value;

        if (query) {
            filtrados = filtrados.filter(it => crud.searchText(it).toLowerCase().includes(query));
        }

        if (estado && estado !== 'todos') {
            filtrados = filtrados.filter(it => String(it.estado || it.Estado) === estado);
        }

        const cont = crud.elements.contenedor;
        if (!cont) return;

        if (!filtrados.length) {
            cont.innerHTML = `
                <div class="col-span-full py-16 px-6 text-center bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3">
                    <span class="text-4xl">📭</span>
                    <h4 class="text-brand-deep font-bold text-lg m-0">No se encontraron paquetes</h4>
                    <p class="text-muted text-sm max-w-sm m-0">Intenta cambiar los filtros de búsqueda o agrega un nuevo paquete desde el panel superior.</p>
                </div>
            `;
            return;
        }

        const totalPages = Math.ceil(filtrados.length / crud.state.itemsPerPage) || 1;
        if (crud.state.currentPage > totalPages) crud.state.currentPage = totalPages;
        
        const start = (crud.state.currentPage - 1) * crud.state.itemsPerPage;
        const end = start + crud.state.itemsPerPage;
        const paginatedData = filtrados.slice(start, end);

        cont.innerHTML = paginatedData.map(item => crud.renderCard(item, {
            escapeHtml: (str) => String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])),
            formatMoney: (num) => `$${Number(num).toLocaleString()}`
        })).join('');

        crud.renderResumen(items, crud.elements);
        renderPremiumPagination('paquetesPaginationContainer', crud.state, filtrados.length, 'paquetesModule');
    };

    window.paquetesModule = {
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
            const item = crud.findById(id);
            if (!item) return;

            if (nuevoEstado === 0) {
                try {
                    const { getReservas } = await import('../core/api.js');
                    const reservas = await getReservas();
                    const isReserved = reservas.some(r => {
                        const noTerminada = String(r.EstadoReserva || r.estado).toLowerCase() !== 'completado' && String(r.EstadoReserva || r.estado).toLowerCase() !== 'cancelado';
                        if (!noTerminada) return false;
                        if (Array.isArray(r.paquetes)) {
                            return r.paquetes.some(p => (p.id_paquete || p.IDPaquete || p.id) == id);
                        }
                        return false; // Depende de la API
                    });
                    if (isReserved) {
                        showAlert('Advertencia', 'No se puede desactivar el paquete porque está incluido en una reserva activa.', 'warning');
                        crud.onRender(crud.state.items);
                        return;
                    }
                } catch (e) {
                    console.error('Error verificando reservas', e);
                }
            }

            try {
                const payload = {
                    NombrePaquete: item.nombre || item.NombrePaquete,
                    Descripcion: item.descripcion || item.Descripcion,
                    Precio: Number(item.precio || item.Precio),
                    Estado: nuevoEstado,
                    IDServicio: item.IDServicio || item.servicio || null,
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

    let paginationDiv = document.getElementById('paquetesPaginationContainer');
    if (!paginationDiv) {
        paginationDiv = document.createElement('div');
        paginationDiv.id = 'paquetesPaginationContainer';
        const cont = crud.elements.contenedor;
        if (cont && cont.parentNode) {
            cont.parentNode.insertBefore(paginationDiv, cont.nextSibling);
        }
    }

    const originalEdit = crud.edit;
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
                    crud.onRender(crud.state.items);
                }, 1000);
            } catch (err) {
                console.error(err);
            }
        };
    }

    crud.init();

    // Event listener for actions in container (Edit/Delete/Detalle)
    if (crud.elements.contenedor) {
        crud.elements.contenedor.addEventListener('click', async (e) => {
            if (e.target.closest('input[type="checkbox"]')) return;

            const btn = e.target.closest('button[data-action]');
            if (!btn) return;

            const action = btn.dataset.action;
            const id = btn.dataset.id;
            const item = crud.findById(id);

            if (!item) return;

            if (action === 'detalle') {
                mostrarDetallePaquete(item);
                return;
            }

            if (action === 'editar') {
                crud.edit(id);
                return;
            }

            if (action === 'eliminar') {
                const confirmRes = await Swal.fire({
                  title: '¿Eliminar Paquete?',
                  text: `¿Deseas eliminar el paquete "${item.nombre || item.NombrePaquete}"?`,
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonText: 'Sí, eliminar',
                  cancelButtonText: 'Cancelar'
                });
                const confirmar = confirmRes.isConfirmed;
                if (!confirmar) return;

                try {
                    await crud.remove(id);
                    crud.onRender(crud.state.items);
                } catch (error) {
                    showAlert('Error', `Error al eliminar: ${error.message}`, 'error');
                }
            }
        });
    }
}

async function loadHabitacionesSelect() {
    try {
        const { getHabitaciones } = await import('../core/api.js');
        const resp = await getHabitaciones();
        const habitaciones = Array.isArray(resp) ? resp : (Array.isArray(resp.data) ? resp.data : []);
        const select = document.getElementById('idHabitacion');
        if (select) {
            const currentVal = select.value;
            select.innerHTML = '<option value="" selected>Sin habitación</option>' + 
                habitaciones.map(h => `<option value="${h.IDHabitacion || h.id || ''}">${h.NombreHabitacion || h.nombre || 'Habitación'}</option>`).join('');
            if (currentVal) select.value = currentVal;
        }
    } catch (e) {
        console.error('Error loading habitaciones para paquetes', e);
    }
}

async function loadServiciosSelect() {
    try {
        const { getServicios } = await import('../core/api.js');
        const resp = await getServicios();
        const servicios = Array.isArray(resp) ? resp : (Array.isArray(resp.data) ? resp.data : []);
        const container = document.getElementById('serviciosCheckboxes');
        if (container) {
            const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
            if (servicios.length === 0) {
                container.innerHTML = '<span class="text-xs text-muted py-1">No hay servicios disponibles</span>';
            } else {
                container.innerHTML = servicios.map(s => `
                    <label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-100 p-1.5 rounded transition-colors">
                        <input type="checkbox" name="idServicio" value="${s.IDServicio || s.id || ''}" class="w-4 h-4 text-brand rounded focus:ring-brand/50 border-gray-300" ${checkboxes.includes(String(s.IDServicio || s.id)) ? 'checked' : ''}>
                        ${s.NombreServicio || s.nombre || 'Servicio sin nombre'}
                    </label>
                `).join('');
            }
        }
    } catch (e) {
        console.error('Error loading servicios para paquetes', e);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    crud.init();
    loadServiciosSelect();
    loadHabitacionesSelect();
});