import { createCrudModule } from './shared/crud-module.js';
import { apiUrl } from './shared/api-config.js';

function siguienteEstado(estadoActual) {
    if (estadoActual === 'disponible') return 'no_disponible';
    if (estadoActual === 'no_disponible') return 'inactivo';
    return 'disponible';
}

const crud = createCrudModule({
    baseUrl: apiUrl('servicios'),
    elements: {
        form: document.getElementById('servicioForm'),
        formTitle: document.getElementById('formTitle'),
        submitButton: document.getElementById('submitButton'),
        mensaje: document.getElementById('mensaje'),
        contenedor: document.getElementById('serviciosContainer'),
        buscador: document.getElementById('buscador'),
        btnCancelarEdicion: document.getElementById('btnCancelarEdicion'),
        btnNuevo: document.getElementById('btnNuevoServicio'),
        btnRecargar: document.getElementById('btnRecargar'),
        btnLimpiarBusqueda: document.getElementById('btnLimpiarBusqueda'),
        btnListar: document.getElementById('btnListar'),
        totalServicios: document.getElementById('totalServicios'),
        totalDisponibles: document.getElementById('totalDisponibles'),
        totalNoDisponibles: document.getElementById('totalNoDisponibles')
    },
    formCreateTitle: 'Registra un nuevo servicio',
    formEditTitle: (item) => `Editando servicio #${item.id}`,
    submitCreateText: 'Guardar servicio',
    submitEditText: 'Actualizar servicio',
    createMessage: 'Servicio creado correctamente.',
    updateMessage: 'Servicio actualizado correctamente.',
    deleteMessage: 'Servicio eliminado correctamente.',
    reloadMessage: 'Listado actualizado desde la base de datos.',
    emptyMessage: 'No hay servicios para mostrar.',
    loadErrorMessage: 'No fue posible cargar los servicios.',
    notFoundMessage: 'No se encontro el servicio seleccionado.',
    deleteConfirm: (item) => `Deseas eliminar el servicio ${item.nombre}?`,
    searchText: (item) => [item.nombre, item.descripcion, item.estado].filter(Boolean).join(' '),
    getPayload: (form) => {
        const formData = new FormData(form);

        return {
            nombre: String(formData.get('nombre') || '').trim(),
            descripcion: String(formData.get('descripcion') || '').trim(),
            precio: Number(formData.get('precio')),
            estado: String(formData.get('estado') || 'disponible').trim().toLowerCase()
        };
    },
    fillForm: (item) => {
        document.getElementById('servicioId').value = item.id;
        document.getElementById('nombre').value = item.nombre || '';
        document.getElementById('descripcion').value = item.descripcion || '';
        document.getElementById('precio').value = item.precio || '';
        document.getElementById('estado').value = item.estado || 'disponible';
    },
    onResetForm: () => {
        document.getElementById('servicioId').value = '';
        document.getElementById('estado').value = 'disponible';
    },
    renderResumen: (items, elements) => {
        elements.totalServicios.textContent = items.length;
        elements.totalDisponibles.textContent = items.filter((item) => item.estado === 'disponible').length;
        elements.totalNoDisponibles.textContent = items.filter((item) => item.estado === 'no_disponible').length;
    },
    secondaryAction: {
        path: 'estado',
        method: 'PATCH',
        payload: (item) => ({ estado: siguienteEstado(item.estado) }),
        successMessage: (item) => {
            const nuevoEstado = siguienteEstado(item.estado).replace('_', ' ');
            return `Estado actualizado a ${nuevoEstado}.`;
        }
    },
    renderCard: (item, { escapeHtml, formatMoney }) => `
        <article class="service-card">
            <span class="status ${escapeHtml(item.estado)}">${escapeHtml(String(item.estado || '').replace('_', ' '))}</span>
            <div>
                <h4>${escapeHtml(item.nombre)}</h4>
                <p>${escapeHtml(item.descripcion || 'Sin descripcion registrada.')}</p>
            </div>
            <div class="service-meta">
                <span><strong>Precio:</strong> ${formatMoney(item.precio)}</span>
                <span><strong>ID:</strong> ${escapeHtml(item.id)}</span>
            </div>
            <div class="card-actions">
                <button class="secondary" type="button" data-action="editar" data-id="${item.id}">Editar</button>
                <button class="primary" type="button" data-action="secundaria" data-id="${item.id}">Cambiar estado</button>
                <button class="danger" type="button" data-action="eliminar" data-id="${item.id}">Eliminar</button>
            </div>
        </article>
    `
});

document.addEventListener('DOMContentLoaded', crud.init);
