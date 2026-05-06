function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatMoney(value) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(amount);
}

function createRequest(baseHeaders = {}) {
    return async function request(url, options = {}) {
        let response;

        try {
            response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...baseHeaders,
                    ...(options.headers || {})
                },
                ...options
            });
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Error('No fue posible conectar con la API. Verifica que el backend este corriendo en localhost:3000.');
            }
            throw error;
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.ok) {
            throw new Error(data.mensaje || data.error || 'No se pudo completar la operacion');
        }

        return data;
    };
}

function createCrudModule(config) {
    const state = {
        items: [],
        filtro: '',
        editandoId: null
    };

    const request = createRequest(config.baseHeaders);

    function mostrarMensaje(texto, tipo = 'success') {
        config.elements.mensaje.textContent = texto;
        config.elements.mensaje.className = `message show ${tipo}`;
    }

    function limpiarMensaje() {
        config.elements.mensaje.textContent = '';
        config.elements.mensaje.className = 'message';
    }

    async function listar() {
        const data = await request(config.baseUrl);
        state.items = Array.isArray(data.data) ? data.data : [];
        render();
        config.renderResumen(state.items, config.elements);

        if (config.onDataLoaded) {
            await config.onDataLoaded(state.items);
        }
    }

    function obtenerFiltrados() {
        const termino = state.filtro.trim().toLowerCase();

        if (!termino) {
            return state.items;
        }

        return state.items.filter((item) => {
            const texto = config.searchText(item).toLowerCase();
            return texto.includes(termino);
        });
    }

    function render() {
        const items = obtenerFiltrados();

        if (!items.length) {
            config.elements.contenedor.innerHTML = `<div class="empty">${config.emptyMessage}</div>`;
            return;
        }

        config.elements.contenedor.innerHTML = items.map((item) => config.renderCard(item, {
            escapeHtml,
            formatMoney
        })).join('');
    }

    function limpiarFormulario() {
        state.editandoId = null;
        config.elements.form.reset();
        config.onResetForm(config.elements);
        config.elements.formTitle.textContent = config.formCreateTitle;
        config.elements.submitButton.textContent = config.submitCreateText;
    }

    function cargarFormulario(item) {
        state.editandoId = item.id;
        config.fillForm(item, config.elements);
        config.elements.formTitle.textContent = config.formEditTitle(item);
        config.elements.submitButton.textContent = config.submitEditText;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function crear(payload) {
        return request(config.baseUrl, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async function actualizar(id, payload) {
        return request(`${config.baseUrl}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
    }

    async function eliminar(id) {
        return request(`${config.baseUrl}/${id}`, {
            method: 'DELETE'
        });
    }

    async function accionSecundaria(item) {
        if (!config.secondaryAction) {
            return;
        }

        const payload = config.secondaryAction.payload(item);

        return request(`${config.baseUrl}/${item.id}/${config.secondaryAction.path}`, {
            method: config.secondaryAction.method || 'PATCH',
            body: JSON.stringify(payload)
        });
    }

    async function manejarSubmit(event) {
        event.preventDefault();
        limpiarMensaje();

        try {
            const payload = config.getPayload(config.elements.form);
            const isEditing = Boolean(state.editandoId);

            if (isEditing) {
                await actualizar(state.editandoId, payload);
                mostrarMensaje(config.updateMessage);
            } else {
                await crear(payload);
                mostrarMensaje(config.createMessage);
            }

            limpiarFormulario();
            await listar();

            if (config.afterMutation) {
                await config.afterMutation({
                    type: isEditing ? 'update' : 'create',
                    items: state.items
                });
            }
        } catch (error) {
            mostrarMensaje(error.message, 'error');
        }
    }

    async function manejarClick(event) {
        const button = event.target.closest('button[data-action]');
        if (!button) {
            return;
        }

        const id = Number(button.dataset.id);
        const action = button.dataset.action;
        const item = state.items.find((entry) => Number(entry.id) === id);

        if (!item) {
            mostrarMensaje(config.notFoundMessage, 'error');
            return;
        }

        try {
            if (action === 'editar') {
                limpiarMensaje();
                const itemCompleto = config.fetchItemById
                    ? await config.fetchItemById(id, item)
                    : item;
                cargarFormulario(itemCompleto);
                return;
            }

            if (action === 'eliminar') {
                const confirmar = window.confirm(config.deleteConfirm(item));
                if (!confirmar) {
                    return;
                }

                await eliminar(id);
                mostrarMensaje(config.deleteMessage);
            }

            if (action === 'secundaria' && config.secondaryAction) {
                await accionSecundaria(item);
                mostrarMensaje(config.secondaryAction.successMessage(item));
            }

            if (action === 'eliminar' || action === 'secundaria') {
                if (state.editandoId === id) {
                    limpiarFormulario();
                }

                await listar();

                if (config.afterMutation) {
                    await config.afterMutation({
                        type: action,
                        item,
                        items: state.items
                    });
                }
            }
        } catch (error) {
            mostrarMensaje(error.message, 'error');
        }
    }

    function registrarEventos() {
        config.elements.form.addEventListener('submit', manejarSubmit);
        config.elements.contenedor.addEventListener('click', manejarClick);

        config.elements.buscador.addEventListener('input', (event) => {
            state.filtro = event.target.value;
            render();
        });

        config.elements.btnCancelarEdicion.addEventListener('click', () => {
            limpiarFormulario();
            limpiarMensaje();
        });

        config.elements.btnNuevo.addEventListener('click', () => {
            limpiarFormulario();
            limpiarMensaje();
        });

        config.elements.btnRecargar.addEventListener('click', async () => {
            limpiarMensaje();

            try {
                await listar();
                mostrarMensaje(config.reloadMessage);
            } catch (error) {
                mostrarMensaje(error.message, 'error');
            }
        });

        config.elements.btnLimpiarBusqueda.addEventListener('click', () => {
            state.filtro = '';
            config.elements.buscador.value = '';
            render();
        });

        config.elements.btnListar.addEventListener('click', async () => {
            try {
                await listar();
            } catch (error) {
                mostrarMensaje(error.message, 'error');
            }
        });
    }

    async function init() {
        registrarEventos();
        limpiarFormulario();

        try {
            await listar();
        } catch (error) {
            mostrarMensaje(error.message, 'error');
            config.elements.contenedor.innerHTML = `<div class="empty">${config.loadErrorMessage}</div>`;
        }
    }

    return { init, escapeHtml, formatMoney };
}

export { createCrudModule, escapeHtml, formatMoney };
