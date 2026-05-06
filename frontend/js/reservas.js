import { apiUrl, getConnectionErrorMessage } from './shared/api-config.js';

const BASE_URL = apiUrl('reservas');
const HABITACIONES_URL = apiUrl('habitaciones');
const PAQUETES_URL = apiUrl('paquetes');
const SERVICIOS_URL = apiUrl('servicios');
const TOKEN = localStorage.getItem('token');

const state = {
    reservas: [],
    habitaciones: [],
    paquetes: [],
    servicios: [],
    filtro: '',
    editandoId: null,
    seleccion: {
        habitaciones: [],
        paquetes: [],
        servicios: []
    }
};

const elements = {
    form: document.getElementById('reservaForm'),
    formTitle: document.getElementById('formTitle'),
    submitButton: document.getElementById('submitButton'),
    mensaje: document.getElementById('mensaje'),
    reservasContainer: document.getElementById('reservasContainer'),
    buscador: document.getElementById('buscador'),
    totalReservas: document.getElementById('totalReservas'),
    totalConfirmadas: document.getElementById('totalConfirmadas'),
    totalPendientes: document.getElementById('totalPendientes'),
    btnCancelarEdicion: document.getElementById('btnCancelarEdicion'),
    btnNuevaReserva: document.getElementById('btnNuevaReserva'),
    btnRecargar: document.getElementById('btnRecargar'),
    btnLimpiarBusqueda: document.getElementById('btnLimpiarBusqueda'),
    btnListar: document.getElementById('btnListar'),
    habitacionSelect: document.getElementById('habitacionSelect'),
    paqueteSelect: document.getElementById('paqueteSelect'),
    servicioSelect: document.getElementById('servicioSelect'),
    cantidadPaquete: document.getElementById('cantidadPaquete'),
    cantidadServicio: document.getElementById('cantidadServicio'),
    habitacionesSeleccionadas: document.getElementById('habitacionesSeleccionadas'),
    paquetesSeleccionados: document.getElementById('paquetesSeleccionados'),
    serviciosSeleccionados: document.getElementById('serviciosSeleccionados'),
    totalReserva: document.getElementById('totalReserva')
};

function mostrarMensaje(texto, tipo = 'success') {
    elements.mensaje.textContent = texto;
    elements.mensaje.className = `message show ${tipo}`;
}

function limpiarMensaje() {
    elements.mensaje.textContent = '';
    elements.mensaje.className = 'message';
}

async function request(url, options = {}) {
    let response;

    try {
        response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...(TOKEN ? { 'Authorization': `Bearer ${TOKEN}` } : {}),
                ...(options.headers || {})
            },
            ...options
        });
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error(getConnectionErrorMessage('la API de reservas'));
        }
        throw error;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
        throw new Error(data.mensaje || data.error || 'No se pudo completar la operacion');
    }

    return data;
}

function formatCurrency(value) {
    return `$${Number(value || 0).toFixed(2)}`;
}

function setOptions(select, items, placeholder) {
    select.innerHTML = `<option value="">${placeholder}</option>` + items.map((item) => (
        `<option value="${item.id}">${item.nombre} - ${formatCurrency(item.precio)}</option>`
    )).join('');
}

async function cargarCatalogos() {
    const [habitacionesRes, paquetesRes, serviciosRes] = await Promise.all([
        request(HABITACIONES_URL),
        request(PAQUETES_URL),
        request(SERVICIOS_URL)
    ]);

    state.habitaciones = (habitacionesRes.data || []).filter((item) => item.estado !== 'reservada');
    state.paquetes = (paquetesRes.data || []).filter((item) => item.estado !== 'inactivo');
    state.servicios = (serviciosRes.data || []).filter((item) => item.estado !== 'inactivo');

    setOptions(elements.habitacionSelect, state.habitaciones, 'Selecciona una habitacion');
    setOptions(elements.paqueteSelect, state.paquetes, 'Selecciona un paquete');
    setOptions(elements.servicioSelect, state.servicios, 'Selecciona un servicio');
}

async function listarReservas() {
    const data = await request(BASE_URL);
    state.reservas = Array.isArray(data.data) ? data.data : [];
    renderReservas();
    renderResumen();
}

function renderResumen() {
    elements.totalReservas.textContent = state.reservas.length;
    elements.totalConfirmadas.textContent = state.reservas.filter((r) => r.estado === 'confirmada').length;
    elements.totalPendientes.textContent = state.reservas.filter((r) => r.estado === 'pendiente').length;
}

function obtenerReservasFiltradas() {
    const termino = state.filtro.trim().toLowerCase();

    if (!termino) {
        return state.reservas;
    }

    return state.reservas.filter((reserva) => {
        const texto = [reserva.nombre_cliente, reserva.email, reserva.estado]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        return texto.includes(termino);
    });
}

function renderReservas() {
    const reservas = obtenerReservasFiltradas();

    if (!reservas.length) {
        elements.reservasContainer.innerHTML = '<div class="empty">No hay reservas para mostrar.</div>';
        return;
    }

    elements.reservasContainer.innerHTML = reservas.map((reserva) => `
        <article class="reservation-card">
            <span class="status ${reserva.estado}">${reserva.estado}</span>
            <div>
                <h4>Reserva #${reserva.id} - ${reserva.nombre_cliente}</h4>
                <p>${reserva.email} | ${reserva.telefono}</p>
            </div>
            <div class="reservation-meta">
                <span><strong>Entrada:</strong> ${reserva.fecha_entrada}</span>
                <span><strong>Salida:</strong> ${reserva.fecha_salida}</span>
                <span><strong>Total:</strong> ${formatCurrency(reserva.total)}</span>
            </div>
            <div>
                <strong>Detalle</strong>
                <ul class="details-list">
                    ${(reserva.detalles || []).map((detalle) => `<li>${detalle.tipo_item}: ${detalle.nombre_item} x${detalle.cantidad} - ${formatCurrency(detalle.subtotal)}</li>`).join('') || '<li>Sin detalle</li>'}
                </ul>
            </div>
            <div class="card-actions">
                <button class="secondary" type="button" data-action="editar" data-id="${reserva.id}">Editar</button>
                <button class="danger" type="button" data-action="eliminar" data-id="${reserva.id}">Eliminar</button>
            </div>
        </article>
    `).join('');
}

function limpiarSeleccion() {
    state.seleccion = {
        habitaciones: [],
        paquetes: [],
        servicios: []
    };
}

function renderSeleccion() {
    const renderList = (container, items, tipo) => {
        if (!items.length) {
            container.innerHTML = '<div class="empty">Sin elementos seleccionados.</div>';
            return;
        }

        container.innerHTML = items.map((item) => `
            <div class="selection-item">
                <span>${item.nombre} x${item.cantidad} - ${formatCurrency(item.precio * item.cantidad)}</span>
                <button class="danger" type="button" data-remove="${tipo}" data-id="${item.id}">Quitar</button>
            </div>
        `).join('');
    };

    renderList(elements.habitacionesSeleccionadas, state.seleccion.habitaciones, 'habitacion');
    renderList(elements.paquetesSeleccionados, state.seleccion.paquetes, 'paquete');
    renderList(elements.serviciosSeleccionados, state.seleccion.servicios, 'servicio');

    const total = [
        ...state.seleccion.habitaciones,
        ...state.seleccion.paquetes,
        ...state.seleccion.servicios
    ].reduce((sum, item) => sum + (Number(item.precio) * Number(item.cantidad)), 0);

    elements.totalReserva.value = formatCurrency(total);
}

function limpiarFormulario() {
    state.editandoId = null;
    elements.form.reset();
    document.getElementById('reservaId').value = '';
    document.getElementById('estadoReserva').value = 'pendiente';
    elements.formTitle.textContent = 'Registra una nueva reserva';
    elements.submitButton.textContent = 'Guardar reserva';
    elements.cantidadPaquete.value = 1;
    elements.cantidadServicio.value = 1;
    limpiarSeleccion();
    renderSeleccion();
}

function obtenerPayloadFormulario() {
    return {
        nombre_cliente: document.getElementById('nombreCliente').value.trim(),
        email: document.getElementById('email').value.trim(),
        telefono: document.getElementById('telefono').value.trim(),
        fecha_entrada: document.getElementById('fechaEntrada').value,
        fecha_salida: document.getElementById('fechaSalida').value,
        estado: document.getElementById('estadoReserva').value,
        habitaciones: state.seleccion.habitaciones.map((item) => ({ id: item.id, cantidad: 1 })),
        paquetes: state.seleccion.paquetes.map((item) => ({ id: item.id, cantidad: item.cantidad })),
        servicios: state.seleccion.servicios.map((item) => ({ id: item.id, cantidad: item.cantidad }))
    };
}

function agregarSeleccion(tipo, fuente, id, cantidad = 1) {
    const item = fuente.find((entry) => Number(entry.id) === Number(id));
    if (!item) {
        return;
    }

    const bucket = state.seleccion[tipo];
    const existente = bucket.find((entry) => Number(entry.id) === Number(item.id));

    if (existente) {
        existente.cantidad = tipo === 'habitaciones' ? 1 : existente.cantidad + cantidad;
    } else {
        bucket.push({
            id: item.id,
            nombre: item.nombre,
            precio: Number(item.precio),
            cantidad: tipo === 'habitaciones' ? 1 : cantidad
        });
    }

    renderSeleccion();
}

function quitarSeleccion(tipo, id) {
    state.seleccion[tipo] = state.seleccion[tipo].filter((item) => Number(item.id) !== Number(id));
    renderSeleccion();
}

function cargarFormulario(reserva) {
    state.editandoId = reserva.id;
    document.getElementById('reservaId').value = reserva.id;
    document.getElementById('nombreCliente').value = reserva.nombre_cliente || '';
    document.getElementById('email').value = reserva.email || '';
    document.getElementById('telefono').value = reserva.telefono || '';
    document.getElementById('fechaEntrada').value = reserva.fecha_entrada || '';
    document.getElementById('fechaSalida').value = reserva.fecha_salida || '';
    document.getElementById('estadoReserva').value = reserva.estado || 'pendiente';

    limpiarSeleccion();

    (reserva.detalles || []).forEach((detalle) => {
        const target = detalle.tipo_item === 'habitacion' ? 'habitaciones' : `${detalle.tipo_item}s`;
        state.seleccion[target].push({
            id: detalle.item_id,
            nombre: detalle.nombre_item,
            precio: Number(detalle.precio),
            cantidad: Number(detalle.cantidad)
        });
    });

    elements.formTitle.textContent = `Editando reserva #${reserva.id}`;
    elements.submitButton.textContent = 'Actualizar reserva';
    renderSeleccion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function crearReserva(payload) {
    return request(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

async function actualizarReserva(id, payload) {
    return request(`${BASE_URL}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
}

async function eliminarReserva(id) {
    return request(`${BASE_URL}/${id}`, {
        method: 'DELETE'
    });
}

async function manejarSubmit(event) {
    event.preventDefault();
    limpiarMensaje();

    try {
        const payload = obtenerPayloadFormulario();

        if (state.editandoId) {
            await actualizarReserva(state.editandoId, payload);
            mostrarMensaje('Reserva actualizada correctamente.');
        } else {
            await crearReserva(payload);
            mostrarMensaje('Reserva creada correctamente.');
        }

        limpiarFormulario();
        await Promise.all([cargarCatalogos(), listarReservas()]);
    } catch (error) {
        mostrarMensaje(error.message, 'error');
    }
}

async function manejarClickReserva(event) {
    const removeButton = event.target.closest('button[data-remove]');
    if (removeButton) {
        const map = {
            habitacion: 'habitaciones',
            paquete: 'paquetes',
            servicio: 'servicios'
        };
        quitarSeleccion(map[removeButton.dataset.remove], Number(removeButton.dataset.id));
        return;
    }

    const actionButton = event.target.closest('button[data-action]');
    if (!actionButton) {
        return;
    }

    const id = Number(actionButton.dataset.id);
    const action = actionButton.dataset.action;
    const reserva = state.reservas.find((item) => Number(item.id) === id);

    if (!reserva) {
        mostrarMensaje('No se encontro la reserva seleccionada.', 'error');
        return;
    }

    try {
        if (action === 'editar') {
            limpiarMensaje();
            cargarFormulario(reserva);
            return;
        }

        if (action === 'eliminar') {
            const confirmar = window.confirm(`Deseas eliminar la reserva #${reserva.id}?`);
            if (!confirmar) {
                return;
            }

            await eliminarReserva(id);
            if (state.editandoId === id) {
                limpiarFormulario();
            }
            mostrarMensaje('Reserva eliminada correctamente.');
            await Promise.all([cargarCatalogos(), listarReservas()]);
        }
    } catch (error) {
        mostrarMensaje(error.message, 'error');
    }
}

function registrarEventos() {
    elements.form.addEventListener('submit', manejarSubmit);
    elements.reservasContainer.addEventListener('click', manejarClickReserva);
    elements.habitacionesSeleccionadas.addEventListener('click', manejarClickReserva);
    elements.paquetesSeleccionados.addEventListener('click', manejarClickReserva);
    elements.serviciosSeleccionados.addEventListener('click', manejarClickReserva);

    elements.buscador.addEventListener('input', (event) => {
        state.filtro = event.target.value;
        renderReservas();
    });

    document.getElementById('btnAgregarHabitacion').addEventListener('click', () => {
        if (!elements.habitacionSelect.value) return;
        agregarSeleccion('habitaciones', state.habitaciones, elements.habitacionSelect.value, 1);
    });

    document.getElementById('btnAgregarPaquete').addEventListener('click', () => {
        if (!elements.paqueteSelect.value) return;
        agregarSeleccion('paquetes', state.paquetes, elements.paqueteSelect.value, Number(elements.cantidadPaquete.value || 1));
    });

    document.getElementById('btnAgregarServicio').addEventListener('click', () => {
        if (!elements.servicioSelect.value) return;
        agregarSeleccion('servicios', state.servicios, elements.servicioSelect.value, Number(elements.cantidadServicio.value || 1));
    });

    elements.btnCancelarEdicion.addEventListener('click', () => {
        limpiarFormulario();
        limpiarMensaje();
    });

    elements.btnNuevaReserva.addEventListener('click', () => {
        limpiarFormulario();
        limpiarMensaje();
    });

    elements.btnRecargar.addEventListener('click', async () => {
        limpiarMensaje();
        try {
            await Promise.all([cargarCatalogos(), listarReservas()]);
            mostrarMensaje('Listado actualizado desde la base de datos.');
        } catch (error) {
            mostrarMensaje(error.message, 'error');
        }
    });

    elements.btnLimpiarBusqueda.addEventListener('click', () => {
        state.filtro = '';
        elements.buscador.value = '';
        renderReservas();
    });

    elements.btnListar.addEventListener('click', async () => {
        try {
            await listarReservas();
        } catch (error) {
            mostrarMensaje(error.message, 'error');
        }
    });
}

async function init() {
    registrarEventos();
    limpiarFormulario();

    try {
        await Promise.all([cargarCatalogos(), listarReservas()]);
    } catch (error) {
        mostrarMensaje(error.message, 'error');
        elements.reservasContainer.innerHTML = '<div class="empty">No fue posible cargar las reservas.</div>';
    }
}

document.addEventListener('DOMContentLoaded', init);
