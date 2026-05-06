import { createCrudModule } from './shared/crud-module.js';
import { apiUrl, getConnectionErrorMessage } from './shared/api-config.js';

function siguienteRol(rolActual) {
    return rolActual === 'admin' ? 'usuario' : 'admin';
}

const crud = createCrudModule({
    baseUrl: apiUrl('usuarios'),
    elements: {
        form: document.getElementById('usuarioForm'),
        formTitle: document.getElementById('formTitle'),
        submitButton: document.getElementById('submitButton'),
        mensaje: document.getElementById('mensaje'),
        contenedor: document.getElementById('usuariosContainer'),
        buscador: document.getElementById('buscador'),
        btnCancelarEdicion: document.getElementById('btnCancelarEdicion'),
        btnNuevo: document.getElementById('btnNuevoUsuario'),
        btnRecargar: document.getElementById('btnRecargar'),
        btnLimpiarBusqueda: document.getElementById('btnLimpiarBusqueda'),
        btnListar: document.getElementById('btnListar'),
        totalUsuarios: document.getElementById('totalUsuarios'),
        totalAdmins: document.getElementById('totalAdmins'),
        totalClientes: document.getElementById('totalClientes')
    },
    formCreateTitle: 'Registra un nuevo usuario',
    formEditTitle: (item) => `Editando usuario #${item.id}`,
    submitCreateText: 'Guardar usuario',
    submitEditText: 'Actualizar usuario',
    createMessage: 'Usuario creado correctamente.',
    updateMessage: 'Usuario actualizado correctamente.',
    deleteMessage: 'Usuario eliminado correctamente.',
    reloadMessage: 'Listado actualizado desde la base de datos.',
    emptyMessage: 'No hay usuarios para mostrar.',
    loadErrorMessage: 'No fue posible cargar los usuarios.',
    notFoundMessage: 'No se encontro el usuario seleccionado.',
    deleteConfirm: (item) => `Deseas eliminar el usuario ${item.nombre}?`,
    searchText: (item) => [item.nombre, item.email, item.rol].filter(Boolean).join(' '),
    getPayload: (form) => {
        const formData = new FormData(form);
        const password = String(formData.get('password') || '').trim();

        return {
            nombre: String(formData.get('nombre') || '').trim(),
            email: String(formData.get('email') || '').trim(),
            rol: String(formData.get('rol') || 'usuario').trim().toLowerCase(),
            ...(password ? { password } : {})
        };
    },
    fillForm: (item) => {
        document.getElementById('usuarioId').value = item.id;
        document.getElementById('nombre').value = item.nombre || '';
        document.getElementById('email').value = item.email || '';
        document.getElementById('password').value = '';
        document.getElementById('rol').value = item.rol || 'usuario';
    },
    onResetForm: () => {
        document.getElementById('usuarioId').value = '';
        document.getElementById('password').value = '';
        document.getElementById('rol').value = 'usuario';
    },
    renderResumen: (items, elements) => {
        elements.totalUsuarios.textContent = items.length;
        elements.totalAdmins.textContent = items.filter((item) => item.rol === 'admin').length;
        elements.totalClientes.textContent = items.filter((item) => item.rol === 'usuario').length;
    },
    secondaryAction: {
        path: 'rol',
        method: 'PATCH',
        payload: (item) => ({ rol: siguienteRol(item.rol) }),
        successMessage: (item) => `Rol actualizado a ${siguienteRol(item.rol)}.`
    },
    renderCard: (item, { escapeHtml }) => `
        <article class="user-card">
            <span class="status ${escapeHtml(item.rol)}">${escapeHtml(item.rol)}</span>
            <div>
                <h4>${escapeHtml(item.nombre)}</h4>
                <p>${escapeHtml(item.email)}</p>
            </div>
            <div class="user-meta">
                <span><strong>ID:</strong> ${escapeHtml(item.id)}</span>
                <span><strong>Rol:</strong> ${escapeHtml(item.rol)}</span>
            </div>
            <div class="card-actions">
                <button class="secondary" type="button" data-action="editar" data-id="${item.id}">Editar</button>
                <button class="primary" type="button" data-action="secundaria" data-id="${item.id}">Cambiar rol</button>
                <button class="danger" type="button" data-action="eliminar" data-id="${item.id}">Eliminar</button>
            </div>
        </article>
    `
});

export async function loginUsuario(data) {
    let response;
    let result;

    try {
        response = await fetch(apiUrl('usuarios/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error(getConnectionErrorMessage('la API de usuarios'));
        }
        throw error;
    }

    result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
        throw new Error(result.mensaje || result.error || 'No fue posible iniciar sesion');
    }

    return result;
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('usuarioForm')) {
        crud.init();
    }
});
