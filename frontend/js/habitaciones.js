import { apiUrl, getConnectionErrorMessage } from './shared/api-config.js';

const BASE_URL = apiUrl('habitaciones');

const state = {
    habitaciones: [],
    filtro: '',
    editandoId: null
};

const elements = {
    form: document.getElementById('habitacionForm'),
    formTitle: document.getElementById('formTitle'),
    submitButton: document.getElementById('submitButton'),
    mensaje: document.getElementById('mensaje'),
    habitacionesContainer: document.getElementById('habitacionesContainer'),
    buscador: document.getElementById('buscador'),
    totalHabitaciones: document.getElementById('totalHabitaciones'),
    totalDisponibles: document.getElementById('totalDisponibles'),
    totalReservadas: document.getElementById('totalReservadas'),
    btnCancelarEdicion: document.getElementById('btnCancelarEdicion'),
    btnNuevaHabitacion: document.getElementById('btnNuevaHabitacion'),
    btnRecargar: document.getElementById('btnRecargar'),
    btnLimpiarBusqueda: document.getElementById('btnLimpiarBusqueda'),
    btnListar: document.getElementById('btnListar')
};

function mostrarMensaje(texto, tipo = 'success') {
    elements.mensaje.textContent = texto;
    elements.mensaje.className = `message show ${tipo}`;
}

function limpiarMensaje() {
    elements.mensaje.textContent = '';
    elements.mensaje.className = 'message';
}

function obtenerPayloadDesdeFormulario() {
    const formData = new FormData(elements.form);

    return {
        nombre: String(formData.get('nombre') || '').trim(),
        descripcion: String(formData.get('descripcion') || '').trim(),
        precio: Number(formData.get('precio')),
        capacidad: Number(formData.get('capacidad')),
        estado: String(formData.get('estado') || 'disponible').trim().toLowerCase()
    };
}

async function request(url, options = {}) {
    let response;

    try {
        response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            },
            ...options
        });
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error(getConnectionErrorMessage('la API de habitaciones'));
        }
        throw error;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
        throw new Error(data.mensaje || data.error || 'No se pudo completar la operacion');
    }

    return data;
}

async function listarHabitaciones() {
    const data = await request(BASE_URL);
    state.habitaciones = Array.isArray(data.data) ? data.data : [];
    renderHabitaciones();
    renderResumen();
}

function renderResumen() {
    const total = state.habitaciones.length;
    const disponibles = state.habitaciones.filter((habitacion) => habitacion.estado === 'disponible').length;
    const reservadas = state.habitaciones.filter((habitacion) => habitacion.estado === 'reservada').length;

    elements.totalHabitaciones.textContent = total;
    elements.totalDisponibles.textContent = disponibles;
    elements.totalReservadas.textContent = reservadas;
}

function obtenerHabitacionesFiltradas() {
    const termino = state.filtro.trim().toLowerCase();

    if (!termino) {
        return state.habitaciones;
    }

    return state.habitaciones.filter((habitacion) => {
        const texto = [habitacion.nombre, habitacion.descripcion, habitacion.estado]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        return texto.includes(termino);
    });
}

function renderHabitaciones() {
    const habitaciones = obtenerHabitacionesFiltradas();

    if (!habitaciones.length) {
        elements.habitacionesContainer.innerHTML = '<div class="empty">No hay habitaciones para mostrar.</div>';
        return;
    }

    elements.habitacionesContainer.innerHTML = habitaciones.map((habitacion) => `
        <article class="room-card">
            <span class="status ${habitacion.estado}">${habitacion.estado}</span>
            <div>
                <h4>${habitacion.nombre}</h4>
                <p>${habitacion.descripcion || 'Sin descripcion registrada.'}</p>
            </div>
            <div class="room-meta">
                <span><strong>Precio:</strong> $${Number(habitacion.precio).toFixed(2)}</span>
                <span><strong>Capacidad:</strong> ${habitacion.capacidad} persona(s)</span>
                <span><strong>ID:</strong> ${habitacion.id}</span>
            </div>
            <div class="room-actions">
                <button class="secondary" type="button" data-action="editar" data-id="${habitacion.id}">Editar</button>
                <button class="primary" type="button" data-action="reservar" data-id="${habitacion.id}" ${habitacion.estado === 'reservada' ? 'disabled' : ''}>Reservar</button>
                <button class="danger" type="button" data-action="eliminar" data-id="${habitacion.id}">Eliminar</button>
            </div>
        </article>
    `).join('');
}

function limpiarFormulario() {
    state.editandoId = null;
    elements.form.reset();
    document.getElementById('habitacionId').value = '';
    document.getElementById('estado').value = 'disponible';
    elements.formTitle.textContent = 'Registra una nueva habitacion';
    elements.submitButton.textContent = 'Guardar habitacion';
}

function cargarFormulario(habitacion) {
    state.editandoId = habitacion.id;
    document.getElementById('habitacionId').value = habitacion.id;
    document.getElementById('nombre').value = habitacion.nombre || '';
    document.getElementById('descripcion').value = habitacion.descripcion || '';
    document.getElementById('precio').value = habitacion.precio || '';
    document.getElementById('capacidad').value = habitacion.capacidad || 1;
    document.getElementById('estado').value = habitacion.estado || 'disponible';
    elements.formTitle.textContent = `Editando habitacion #${habitacion.id}`;
    elements.submitButton.textContent = 'Actualizar habitacion';
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

async function reservarHabitacion(id) {
    return request(`${BASE_URL}/reservar/${id}`, {
        method: 'POST'
    });
}

async function manejarSubmit(event) {
    event.preventDefault();
    limpiarMensaje();

    try {
        const payload = obtenerPayloadDesdeFormulario();

        if (state.editandoId) {
            await actualizarHabitacion(state.editandoId, payload);
            mostrarMensaje('Habitacion actualizada correctamente.');
        } else {
            await crearHabitacion(payload);
            mostrarMensaje('Habitacion creada correctamente.');
        }

        limpiarFormulario();
        await listarHabitaciones();
    } catch (error) {
        mostrarMensaje(error.message, 'error');
    }
}

async function manejarClickEnTarjeta(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) {
        return;
    }

    const id = Number(button.dataset.id);
    const action = button.dataset.action;
    const habitacion = state.habitaciones.find((item) => Number(item.id) === id);

    if (!habitacion) {
        mostrarMensaje('No se encontro la habitacion seleccionada.', 'error');
        return;
    }

    try {
        if (action === 'editar') {
            limpiarMensaje();
            cargarFormulario(habitacion);
            return;
        }

        if (action === 'eliminar') {
            const confirmar = window.confirm(`Deseas eliminar la habitacion ${habitacion.nombre}?`);
            if (!confirmar) {
                return;
            }

            await eliminarHabitacion(id);
            mostrarMensaje('Habitacion eliminada correctamente.');
        }

        if (action === 'reservar') {
            await reservarHabitacion(id);
            mostrarMensaje('Habitacion marcada como reservada.');
        }

        if (action === 'eliminar' || action === 'reservar') {
            if (state.editandoId === id) {
                limpiarFormulario();
            }
            await listarHabitaciones();
        }
    } catch (error) {
        mostrarMensaje(error.message, 'error');
    }
}

function registrarEventos() {
    elements.form.addEventListener('submit', manejarSubmit);
    elements.habitacionesContainer.addEventListener('click', manejarClickEnTarjeta);

    elements.buscador.addEventListener('input', (event) => {
        state.filtro = event.target.value;
        renderHabitaciones();
    });

    elements.btnCancelarEdicion.addEventListener('click', () => {
        limpiarFormulario();
        limpiarMensaje();
    });

    elements.btnNuevaHabitacion.addEventListener('click', () => {
        limpiarFormulario();
        limpiarMensaje();
    });

    elements.btnRecargar.addEventListener('click', async () => {
        limpiarMensaje();
        try {
            await listarHabitaciones();
            mostrarMensaje('Listado actualizado desde la base de datos.');
        } catch (error) {
            mostrarMensaje(error.message, 'error');
        }
    });

    elements.btnLimpiarBusqueda.addEventListener('click', () => {
        state.filtro = '';
        elements.buscador.value = '';
        renderHabitaciones();
    });

    elements.btnListar.addEventListener('click', async () => {
        try {
            await listarHabitaciones();
        } catch (error) {
            mostrarMensaje(error.message, 'error');
        }
    });
}

async function init() {
    registrarEventos();
    limpiarFormulario();

    try {
        await listarHabitaciones();
    } catch (error) {
        mostrarMensaje(error.message, 'error');
        elements.habitacionesContainer.innerHTML = '<div class="empty">No fue posible cargar las habitaciones.</div>';
    }
}

document.addEventListener('DOMContentLoaded', init);
