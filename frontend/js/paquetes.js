import { createCrudModule } from './shared/crud-module.js';
import { apiUrl } from './shared/api-config.js';

function siguienteEstado(estadoActual) {
    if (estadoActual === 'disponible') return 'agotado';
    if (estadoActual === 'agotado') return 'inactivo';
    return 'disponible';
}

const crud = createCrudModule({
    baseUrl: apiUrl('paquetes'),
    elements: {
        form: document.getElementById('paqueteForm'),
        formTitle: document.getElementById('formTitle'),
        submitButton: document.getElementById('submitButton'),
        mensaje: document.getElementById('mensaje'),
        contenedor: document.getElementById('contenedor'),
        buscador: document.getElementById('buscador'),
        btnCancelarEdicion: document.getElementById('btnCancelarEdicion'),
        btnNuevo: document.getElementById('btnNuevoPaquete'),
        btnRecargar: document.getElementById('btnRecargar'),
        btnLimpiarBusqueda: document.getElementById('btnLimpiarBusqueda'),
        btnListar: document.getElementById('btnListar'),
        totalPaquetes: document.getElementById('totalPaquetes'),
        totalDisponibles: document.getElementById('totalDisponibles'),
        totalAgotados: document.getElementById('totalAgotados')
    },
    formCreateTitle: 'Registra un nuevo paquete',
    formEditTitle: (item) => `Editando paquete #${item.id}`,
    submitCreateText: 'Guardar paquete',
    submitEditText: 'Actualizar paquete',
    createMessage: 'Paquete creado correctamente.',
    updateMessage: 'Paquete actualizado correctamente.',
    deleteMessage: 'Paquete eliminado correctamente.',
    reloadMessage: 'Listado actualizado desde la base de datos.',
    emptyMessage: 'No hay paquetes para mostrar.',
    loadErrorMessage: 'No fue posible cargar los paquetes.',
    notFoundMessage: 'No se encontro el paquete seleccionado.',
    deleteConfirm: (item) => `Deseas eliminar el paquete ${item.nombre}?`,
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
        document.getElementById('paqueteId').value = item.id;
        document.getElementById('nombre').value = item.nombre || '';
        document.getElementById('descripcion').value = item.descripcion || '';
        document.getElementById('precio').value = item.precio || '';
        document.getElementById('estado').value = item.estado || 'disponible';
    },
    onResetForm: () => {
        document.getElementById('paqueteId').value = '';
        document.getElementById('estado').value = 'disponible';
    },
    renderResumen: (items, elements) => {
        elements.totalPaquetes.textContent = items.length;
        elements.totalDisponibles.textContent = items.filter((item) => item.estado === 'disponible').length;
        elements.totalAgotados.textContent = items.filter((item) => item.estado === 'agotado').length;
    },
    secondaryAction: {
        path: 'estado',
        method: 'PATCH',
        payload: (item) => ({ estado: siguienteEstado(item.estado) }),
        successMessage: (item) => `Estado actualizado a ${siguienteEstado(item.estado)}.`
    },
    renderCard: (item, { escapeHtml, formatMoney }) => `
        <article class="package-card">
            <span class="status ${escapeHtml(item.estado)}">${escapeHtml(item.estado)}</span>
            <div>
                <h4>${escapeHtml(item.nombre)}</h4>
                <p>${escapeHtml(item.descripcion || 'Sin descripcion registrada.')}</p>
            </div>
            <div class="package-meta">
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
