import { apiUrl, getConnectionErrorMessage, getAuthHeaders } from './shared/api-config.js';
import { getAppUrl } from '../core/authGuard.js';

const BASE_URL = apiUrl('habitacion');

const state = {
    habitaciones: [],
    filtro: '',
    editandoId: null
};

const elements = {
    form: null,
    formTitle: null,
    submitButton: null,
    mensaje: null,
    habitacionesContainer: null,
    buscador: null,
    metricTotal: null,
    metricDisponibles: null,
    metricOcupadas: null,
    metricMantenimiento: null,
    btnCancelarEdicion: null,
    btnNuevaHabitacion: null,
    habitacionModal: null,
    filtroEstado: null,
    filtroTipo: null,
    filtroCapacidad: null,
    btnLimpiarFiltros: null,
    
    // Detalle modal elements
    habitacionDetalleModal: null,
    detalleNombre: null,
    detalleID: null,
    detalleTipo: null,
    detalleImagenPrincipal: null,
    detalleGaleriaGrid: null,
    detalleCostoBadge: null,
    detalleCapacidad: null,
    detalleCamas: null,
    detalleDescripcion: null
};

function mostrarMensaje(texto, tipo = 'success') {
    if (elements.mensaje) {
        elements.mensaje.textContent = texto;
        elements.mensaje.className = `p-4 mb-4 rounded-xl text-sm font-medium block ${tipo === 'success' ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' : 'bg-red-50 border border-red-100 text-red-800'}`;
    } else {
        console.log(`Mensaje (${tipo}): ${texto}`);
    }
}

function limpiarMensaje() {
    if (elements.mensaje) {
        elements.mensaje.textContent = '';
        elements.mensaje.className = 'hidden';
    }
}

function mapHabitacionEstado(estado) {
    const map = {
        disponible: 1,
        ocupada: 3,
        mantenimiento: 4,
        activo: 1,
        inactivo: 0,
        '1': 1,
        '3': 3,
        '4': 4
    };

    const normalized = String(estado || 'disponible').trim().toLowerCase();
    const parsedNumber = Number(normalized);

    if (!Number.isNaN(parsedNumber) && normalized !== '') {
        return parsedNumber;
    }

    return map[normalized] ?? 1;
}

function obtenerPayloadDesdeFormulario() {
    if (!elements.form) {
        throw new Error('Formulario no encontrado');
    }
    
    const formData = new FormData(elements.form);

    return {
        NombreHabitacion: String(formData.get('nombre') || '').trim(),
        Descripcion: String(formData.get('descripcion') || '').trim(),
        Costo: Number(formData.get('precio')),
        CapacidadMaximaPersonas: Number(formData.get('capacidad')) || 1,
        Estado: mapHabitacionEstado(formData.get('estado')),
        ImagenHabitacion: null
    };
}

async function request(url, options = {}) {
    let response;

    try {
        response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
                ...(options.headers || {})
            }
        });
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error(getConnectionErrorMessage('la API de habitaciones'));
        }
        throw error;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.ok === false) {
        throw new Error(data.mensaje || data.error || 'No se pudo completar la operaciÃ³n');
    }

    return data;
}

async function listarHabitaciones() {
    const data = await request(BASE_URL);
    state.habitaciones = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
    renderHabitacionesList();
    renderResumen();
}

function getHabitacionBooleanEstado(habitacion) {
    const estado = habitacion.estado || habitacion.Estado;
    if (estado == 1 || String(estado).toLowerCase() === 'disponible') return 'disponible';
    if (estado == 3 || String(estado).toLowerCase() === 'ocupada') return 'ocupada';
    if (estado == 4 || String(estado).toLowerCase() === 'mantenimiento') return 'mantenimiento';
    return 'disponible';
}

function getHabitacionCapacidad(habitacion) {
    return habitacion.capacidad || habitacion.CapacidadMaximaPersonas || habitacion.Capacidad || 1;
}

function renderResumen() {
    if (!elements.metricTotal) return;
    
    const total = state.habitaciones.length;
    const disponibles = state.habitaciones.filter((h) => getHabitacionBooleanEstado(h) === 'disponible').length;
    const ocupadas = state.habitaciones.filter((h) => getHabitacionBooleanEstado(h) === 'ocupada').length;
    const mantenimiento = state.habitaciones.filter((h) => getHabitacionBooleanEstado(h) === 'mantenimiento').length;

    elements.metricTotal.textContent = total;
    elements.metricDisponibles.textContent = disponibles;
    elements.metricOcupadas.textContent = ocupadas;
    elements.metricMantenimiento.textContent = mantenimiento;
}

function obtenerHabitacionesFiltradas() {
    let filtradas = state.habitaciones;

    // BÃºsqueda por texto
    const termino = state.filtro.trim().toLowerCase();
    if (termino) {
        filtradas = filtradas.filter((habitacion) => {
            const texto = [habitacion.nombre, habitacion.NombreHabitacion, habitacion.descripcion]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return texto.includes(termino);
        });
    }

    // Filtro por Estado
    const estadoFiltro = elements.filtroEstado?.value;
    if (estadoFiltro && estadoFiltro !== 'todos') {
        filtradas = filtradas.filter(h => getHabitacionBooleanEstado(h) === estadoFiltro);
    }

    // Filtro por Tipo
    const tipoFiltro = elements.filtroTipo?.value;
    if (tipoFiltro && tipoFiltro !== 'todos') {
        filtradas = filtradas.filter(h => {
            const tipo = (h.nombre || h.NombreHabitacion || '').toLowerCase();
            return tipo.includes(tipoFiltro);
        });
    }

    // Filtro por Capacidad
    const capFiltro = elements.filtroCapacidad?.value;
    if (capFiltro && capFiltro !== 'todos') {
        const minCap = parseInt(capFiltro);
        filtradas = filtradas.filter(h => {
            const cap = getHabitacionCapacidad(h);
            if (minCap === 4) return cap >= 4;
            return cap == minCap;
        });
    }

    return filtradas;
}

function resolveRoomImage(hab) {
    const name = String(hab.nombre || hab.NombreHabitacion || '').toLowerCase();
    const type = String(hab.tipo || hab.Tipo || '').toLowerCase();
    const fullText = `${name} ${type}`;

    if (fullText.includes('familiar')) return getAppUrl('assets/images/rooms/familiar.png');
    if (fullText.includes('pareja') || fullText.includes('doble')) return getAppUrl('assets/images/rooms/parejas.png');
    if (fullText.includes('individual') || fullText.includes('sencilla')) return getAppUrl('assets/images/rooms/individual.png');
    
    return getAppUrl('assets/images/rooms/individual.png');
}

function renderHabitacionesList() {
    const habitaciones = obtenerHabitacionesFiltradas();

    if (!habitaciones.length) {
        elements.habitacionesContainer.innerHTML = `
            <div class="col-span-full py-16 px-6 text-center bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3">
                <span class="text-4xl">ðŸ“­</span>
                <h4 class="text-brand-deep font-bold text-lg m-0">No se encontraron habitaciones</h4>
                <p class="text-muted text-sm max-w-sm m-0">Intenta cambiar los filtros de bÃºsqueda o agrega una nueva habitaciÃ³n desde el panel superior.</p>
            </div>
        `;
        return;
    }

    elements.habitacionesContainer.innerHTML = habitaciones.map((habitacion) => {
        const estadoTexto = getHabitacionBooleanEstado(habitacion);
        const capacidad = getHabitacionCapacidad(habitacion);
        const habitacionId = habitacion.id || habitacion.IDHabitacion || habitacion.ID || '';
        const roomImg = resolveRoomImage(habitacion);
        
        let statusBg = 'bg-emerald-500/90 text-white';
        if (estadoTexto === 'ocupada') statusBg = 'bg-amber-500/90 text-white';
        if (estadoTexto === 'mantenimiento') statusBg = 'bg-red-500/90 text-white';

        return `
        <article class="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col">
            <!-- Room Image Container -->
            <div class="h-52 w-full overflow-hidden relative bg-gray-50">
                <img src="${roomImg}" alt="HabitaciÃ³n" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                
                <!-- Modern Status Switch on Card -->
                <div class="absolute top-4 right-4 bg-white/95 backdrop-blur-md rounded-full shadow-lg px-3 py-1.5 flex items-center gap-3 transition-all duration-300">
                    <label class="relative inline-block w-8 h-4 m-0 cursor-pointer shrink-0">
                        <input type="checkbox" class="sr-only peer" ${estadoTexto === 'disponible' ? 'checked' : ''} 
                               onchange="window.habitacionesModule.changeStatusFromCard('${habitacionId}', this.checked ? 'disponible' : 'mantenimiento')">
                        <span class="absolute inset-0 rounded-full bg-slate-200 peer-checked:bg-emerald-500 transition-colors duration-300 before:content-[''] before:absolute before:h-3 before:w-3 before:left-[2px] before:bottom-[2px] before:bg-white before:rounded-full before:transition-transform before:duration-300 peer-checked:before:translate-x-4"></span>
                    </label>
                    <span class="text-[9px] font-extrabold uppercase tracking-wider transition-all duration-300 shrink-0 ${estadoTexto === 'disponible' ? 'text-emerald-700' : (estadoTexto === 'ocupada' ? 'text-amber-600' : 'text-red-600')}">
                        ${estadoTexto === 'disponible' ? 'Disponible' : (estadoTexto === 'ocupada' ? 'Ocupada' : 'Mantenimiento')}
                    </span>
                </div>
            </div>

            <!-- Room Content -->
            <div class="p-6 flex-1 flex flex-col gap-4">
                <div class="flex flex-col gap-1.5">
                    <div class="flex items-center justify-between">
                        <h4 class="text-brand-deep font-bold text-lg m-0 tracking-tight group-hover:text-brand transition-colors duration-200">${habitacion.nombre || habitacion.NombreHabitacion || 'HabitaciÃ³n'}</h4>
                        <span class="text-[10px] font-bold text-muted bg-gray-100 px-2 py-0.5 rounded-md">ID: #${habitacionId}</span>
                    </div>
                    <p class="text-muted text-xs leading-relaxed m-0 h-8 line-clamp-2">
                        ${habitacion.descripcion || habitacion.Descripcion || 'HabitaciÃ³n rural boutique confortable con todos los servicios.'}
                    </p>
                </div>

                <!-- Icons metadata -->
                <div class="flex items-center gap-4 text-xs font-semibold text-muted bg-gray-50/50 p-2.5 rounded-xl border border-gray-100/50">
                    <span class="flex items-center gap-1">ðŸ‘¤ Max: ${capacidad} Pers</span>
                    <span class="flex items-center gap-1">ðŸ›ï¸ ${capacidad > 2 ? '2 Camas' : '1 Cama'}</span>
                    <span class="flex items-center gap-1">ðŸ“ 32 mÂ²</span>
                </div>

                <!-- Price and Buttons Layout Orderly and Logical -->
                <div class="mt-auto flex flex-col gap-3 pt-4 border-t border-gray-100">
                    <div class="flex justify-between items-baseline">
                        <span class="text-xs font-bold text-muted">Precio por noche</span>
                        <span class="text-lg font-bold text-brand-deep">$${Number(habitacion.precio || habitacion.Costo || 0).toLocaleString()}<small class="text-xs font-normal text-muted"> COP</small></span>
                    </div>

                    <!-- Clean CRUD Actions -->
                    <div class="flex flex-col gap-2">
                        <button class="w-full h-10 rounded-xl bg-brand text-white text-xs font-bold shadow-md shadow-brand/10 hover:bg-brand-deep hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border-none transition-all duration-300 flex items-center justify-center gap-1.5" type="button" data-action="detalle" data-id="${habitacionId}">
                            ðŸ” Ver detalle
                        </button>
                        <div class="grid grid-cols-2 gap-2">
                            <button class="h-9 rounded-xl bg-gray-100 text-brand-deep text-xs font-bold hover:bg-gray-200 active:scale-98 cursor-pointer border-none transition-all duration-300 flex items-center justify-center gap-1" type="button" data-action="editar" data-id="${habitacionId}">
                                âœï¸ Editar
                            </button>
                            <button class="h-9 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 active:scale-98 cursor-pointer border-none transition-all duration-300 flex items-center justify-center gap-1" type="button" data-action="eliminar" data-id="${habitacionId}">
                                ðŸ—‘ï¸ Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </article>
        `;
    }).join('');
}

// Function to handle instant update from card dropdown
async function manejarCambioEstadoRapido(event) {
    const select = event.target.closest('.status-select');
    if (!select) return;

    const id = select.dataset.id;
    const nuevoEstado = select.value;
    const habitacion = state.habitaciones.find(h => String(h.id || h.IDHabitacion || h.ID) === String(id));

    if (!habitacion) return;

    try {
        select.disabled = true;
        
        const payload = {
            NombreHabitacion: habitacion.nombre || habitacion.NombreHabitacion,
            Descripcion: habitacion.descripcion || habitacion.Descripcion,
            Costo: Number(habitacion.precio || habitacion.Costo),
            CapacidadMaximaPersonas: Number(getHabitacionCapacidad(habitacion)),
            Estado: mapHabitacionEstado(nuevoEstado),
            ImagenHabitacion: null
        };
        
        await actualizarHabitacion(id, payload);
        
        // Update local state
        habitacion.Estado = mapHabitacionEstado(nuevoEstado);
        habitacion.estado = mapHabitacionEstado(nuevoEstado);
        
        // Success and Refresh
        renderResumen();
        renderHabitacionesList();
    } catch (error) {
        mostrarMensaje(`Error al cambiar estado rÃ¡pido: ${error.message}`, 'error');
        renderHabitacionesList(); // reset render on error
    }
}

// Sub-gallery mock images based on room type
const MOCK_GALLERIES = {
    individual: [
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=400&q=80'
    ],
    doble: [
        'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=400&q=80'
    ],
    familiar: [
        'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=400&q=80'
    ]
};

// Open dynamic room detail modal
function mostrarDetalleHabitacion(habitacion) {
    if (!elements.habitacionDetalleModal) return;

    const habitacionId = habitacion.id || habitacion.IDHabitacion || habitacion.ID || '';
    const capacidad = getHabitacionCapacidad(habitacion);
    const roomImg = resolveRoomImage(habitacion);
    
    // Determine type code for gallery Unsplash selection
    const nameText = String(habitacion.nombre || habitacion.NombreHabitacion || '').toLowerCase();
    const descText = String(habitacion.descripcion || habitacion.Descripcion || '').toLowerCase();
    const combinedText = `${nameText} ${descText}`;
    
    let typeCode = 'individual';
    let typeLabel = 'HabitaciÃ³n Sencilla / Individual';
    let bedCountText = '1 Cama individual';
    
    if (combinedText.includes('familiar')) {
        typeCode = 'familiar';
        typeLabel = 'Suite Familiar Completa';
        bedCountText = '2 Camas dobles + 1 Cama nido';
    } else if (combinedText.includes('pareja') || combinedText.includes('doble') || combinedText.includes('matrimo')) {
        typeCode = 'doble';
        typeLabel = 'HabitaciÃ³n Doble / Parejas';
        bedCountText = '1 Cama Doble Queen Size';
    }

    // Populate standard text fields
    elements.detalleNombre.textContent = habitacion.nombre || habitacion.NombreHabitacion || 'HabitaciÃ³n';
    elements.detalleID.textContent = `ID: #${habitacionId}`;
    elements.detalleTipo.textContent = typeLabel;
    elements.detalleCapacidad.textContent = `${capacidad} ${capacidad === 1 ? 'Persona' : 'Personas'}`;
    elements.detalleCamas.textContent = bedCountText;
    elements.detalleCostoBadge.textContent = `COP $${Number(habitacion.precio || habitacion.Costo || 0).toLocaleString()} / Noche`;
    elements.detalleDescripcion.textContent = habitacion.descripcion || habitacion.Descripcion || 'CabaÃ±a boutique enclavada en el bosque nativo. DiseÃ±ada con acabados orgÃ¡nicos de madera y piedra para brindar una desconexiÃ³n total y descanso reparador en un ambiente sereno y elegante.';

    // Image Swap Logic
    elements.detalleImagenPrincipal.src = roomImg;
    
    // Sub-gallery thumbnail hydration
    const imagesList = MOCK_GALLERIES[typeCode];
    elements.detalleGaleriaGrid.innerHTML = imagesList.map((imgSrc, idx) => `
        <div class="aspect-[4/3] rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-gray-50 cursor-pointer hover:border-brand transition-all duration-200">
            <img src="${imgSrc}" alt="Thumbnail ${idx+1}" class="w-full h-full object-cover select-thumbnail">
        </div>
    `).join('');

    // Wire thumbnail click image swaps
    const thumbnails = elements.detalleGaleriaGrid.querySelectorAll('.select-thumbnail');
    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', () => {
            elements.detalleImagenPrincipal.src = thumb.src;
        });
    });

    // Display Detail Modal
    elements.habitacionDetalleModal.classList.remove('hidden');
}

function openModal() {
    if (elements.habitacionModal) {
        elements.habitacionModal.classList.remove('hidden');
    }
}

function closeModal() {
    if (elements.habitacionModal) {
        elements.habitacionModal.classList.add('hidden');
    }
}

function limpiarFormulario() {
    state.editandoId = null;
    
    if (elements.form) {
        elements.form.reset();
    }
    
    const habitacionIdElement = document.getElementById('habitacionId');
    if (habitacionIdElement) {
        habitacionIdElement.value = '';
    }
    
    const estadoElement = document.getElementById('estado');
    if (estadoElement) {
        estadoElement.value = 'disponible';
    }
    
    if (elements.formTitle) {
        elements.formTitle.textContent = 'Nueva HabitaciÃ³n';
    }
    
    if (elements.submitButton) {
        elements.submitButton.textContent = 'Guardar habitaciÃ³n';
    }
}

function cargarFormulario(habitacion) {
    const habitacionId = habitacion.id || habitacion.IDHabitacion || '';
    const estadoTexto = getHabitacionBooleanEstado(habitacion) || 'disponible';

    state.editandoId = habitacionId;
    document.getElementById('habitacionId').value = habitacionId;
    document.getElementById('nombre').value = habitacion.nombre || habitacion.NombreHabitacion || '';
    document.getElementById('descripcion').value = habitacion.descripcion || habitacion.Descripcion || '';
    document.getElementById('precio').value = habitacion.precio || habitacion.Costo || '';
    document.getElementById('capacidad').value = getHabitacionCapacidad(habitacion);
    document.getElementById('estado').value = estadoTexto;
    
    elements.formTitle.textContent = `Editar HabitaciÃ³n #${habitacionId}`;
    elements.submitButton.textContent = 'Actualizar habitaciÃ³n';
    
    openModal();
}

async function crearHabitacion(payload) {
    return request(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

async function actualizarHabitacion(id, payload) {
    return request(`${BASE_URL}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
}

async function eliminarHabitacion(id) {
    return request(`${BASE_URL}/${id}`, {
        method: 'DELETE'
    });
}

async function manejarSubmit(event) {
    event.preventDefault();
    limpiarMensaje();

    try {
        const payload = obtenerPayloadDesdeFormulario();

        if (state.editandoId) {
            await actualizarHabitacion(state.editandoId, payload);
            mostrarMensaje('HabitaciÃ³n actualizada correctamente.');
        } else {
            await crearHabitacion(payload);
            mostrarMensaje('HabitaciÃ³n creada correctamente.');
        }

        setTimeout(() => {
            closeModal();
            limpiarFormulario();
        }, 1000);
        
        await listarHabitaciones();
    } catch (error) {
        mostrarMensaje(error.message, 'error');
    }
}

async function manejarClickEnTarjeta(event) {
    // Check if click was on direct dropdown changer
    if (event.target.closest('.status-select')) {
        return; 
    }

    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;
    const habitacion = state.habitaciones.find((item) => String(item.id || item.IDHabitacion || item.ID) === String(id));

    if (!habitacion) {
        mostrarMensaje('No se encontrÃ³ la habitaciÃ³n seleccionada.', 'error');
        return;
    }

    try {
        if (action === 'detalle') {
            mostrarDetalleHabitacion(habitacion);
            return;
        }

        if (action === 'editar') {
            limpiarMensaje();
            cargarFormulario(habitacion);
            return;
        }

        if (action === 'eliminar') {
            const confirmar = window.confirm(`Â¿Deseas eliminar la habitaciÃ³n ${habitacion.nombre || habitacion.NombreHabitacion}?`);
            if (!confirmar) return;

            await eliminarHabitacion(id);
            mostrarMensaje('HabitaciÃ³n eliminada correctamente.');
            await listarHabitaciones();
        }
    } catch (error) {
        mostrarMensaje(error.message, 'error');
    }
}

function registrarEventos() {
    if (elements.form) elements.form.addEventListener('submit', manejarSubmit);
    if (elements.habitacionesContainer) {
        elements.habitacionesContainer.addEventListener('click', manejarClickEnTarjeta);
        elements.habitacionesContainer.addEventListener('change', manejarCambioEstadoRapido);
    }

    if (elements.buscador) {
        elements.buscador.addEventListener('input', (event) => {
            state.filtro = event.target.value;
            renderHabitacionesList();
        });
    }

    if (elements.filtroEstado) elements.filtroEstado.addEventListener('change', () => renderHabitacionesList());
    if (elements.filtroTipo) elements.filtroTipo.addEventListener('change', () => renderHabitacionesList());
    if (elements.filtroCapacidad) elements.filtroCapacidad.addEventListener('change', () => renderHabitacionesList());

    if (elements.btnLimpiarFiltros) {
        elements.btnLimpiarFiltros.addEventListener('click', () => {
            state.filtro = '';
            if (elements.buscador) elements.buscador.value = '';
            if (elements.filtroEstado) elements.filtroEstado.value = 'todos';
            if (elements.filtroTipo) elements.filtroTipo.value = 'todos';
            if (elements.filtroCapacidad) elements.filtroCapacidad.value = 'todos';
            renderHabitacionesList();
        });
    }

    if (elements.btnCancelarEdicion) elements.btnCancelarEdicion.addEventListener('click', closeModal);
    if (elements.btnNuevaHabitacion) {
        elements.btnNuevaHabitacion.addEventListener('click', () => {
            limpiarFormulario();
            limpiarMensaje();
            openModal();
        });
    }
}

async function init() {
    registrarEventos();
    limpiarFormulario();
    try {
        await listarHabitaciones();
    } catch (error) {
        mostrarMensaje(error.message, 'error');
    }
}

export async function renderHabitaciones(container) {
    Object.assign(elements, {
        form: container.querySelector('#habitacionForm'),
        formTitle: container.querySelector('#formTitle'),
        submitButton: container.querySelector('#submitButton'),
        mensaje: container.querySelector('#mensaje'),
        habitacionesContainer: container.querySelector('#habitacionesContainer'),
        buscador: container.querySelector('#buscador'),
        metricTotal: container.querySelector('#metricTotal'),
        metricDisponibles: container.querySelector('#metricDisponibles'),
        metricOcupadas: container.querySelector('#metricOcupadas'),
        metricMantenimiento: container.querySelector('#metricMantenimiento'),
        btnCancelarEdicion: container.querySelector('#btnCancelarEdicion'),
        btnNuevaHabitacion: container.querySelector('#btnNuevaHabitacion'),
        habitacionModal: container.querySelector('#habitacionModal'),
        filtroEstado: container.querySelector('#filtroEstado'),
        filtroTipo: container.querySelector('#filtroTipo'),
        filtroCapacidad: container.querySelector('#filtroCapacidad'),
        btnLimpiarFiltros: container.querySelector('#btnLimpiarFiltros'),
        
        // Detalle elements mapping
        habitacionDetalleModal: container.querySelector('#habitacionDetalleModal'),
        detalleNombre: container.querySelector('#detalleNombre'),
        detalleID: container.querySelector('#detalleID'),
        detalleTipo: container.querySelector('#detalleTipo'),
        detalleImagenPrincipal: container.querySelector('#detalleImagenPrincipal'),
        detalleGaleriaGrid: container.querySelector('#detalleGaleriaGrid'),
        detalleCostoBadge: container.querySelector('#detalleCostoBadge'),
        detalleCapacidad: container.querySelector('#detalleCapacidad'),
        detalleCamas: container.querySelector('#detalleCamas'),
        detalleDescripcion: container.querySelector('#detalleDescripcion')
    });
    
    registrarEventos();
    limpiarFormulario();

    // Assign global module for toggle switch on card
    window.habitacionesModule = {
        changeStatusFromCard: async (id, nuevoEstado) => {
            const habitacion = state.habitaciones.find(h => String(h.id || h.IDHabitacion || h.ID) === String(id));
            if (!habitacion) return;
            try {
                const payload = {
                    NombreHabitacion: habitacion.nombre || habitacion.NombreHabitacion,
                    Descripcion: habitacion.descripcion || habitacion.Descripcion,
                    Costo: Number(habitacion.precio || habitacion.Costo),
                    CapacidadMaximaPersonas: Number(getHabitacionCapacidad(habitacion)),
                    Estado: mapHabitacionEstado(nuevoEstado),
                    ImagenHabitacion: null
                };
                await actualizarHabitacion(id, payload);
                habitacion.Estado = mapHabitacionEstado(nuevoEstado);
                habitacion.estado = mapHabitacionEstado(nuevoEstado);
                renderResumen();
                renderHabitacionesList();
            } catch (error) {
                mostrarMensaje(`Error al cambiar estado rÃ¡pido: ${error.message}`, 'error');
                renderHabitacionesList();
            }
        }
    };

    await listarHabitaciones();
}

document.addEventListener('DOMContentLoaded', init);
