import { createCrudModule, escapeHtml } from './shared/crud-module.js';

const API = 'http://localhost:3000/api';

function $(id) {
    return document.getElementById(id);
}

function normalizeDateInput(value) {
    return String(value || '').slice(0, 10);
}

function safeText(value) {
    return escapeHtml(String(value ?? ''));
}

function request(url, options = {}) {
    return fetch(url, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
    }).then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) {
            throw new Error(data.mensaje || data.error || 'No se pudo completar la operacion');
        }
        return data;
    });
}

function setActiveModule(moduleName) {
    document.querySelectorAll('.nav button').forEach((button) => {
        button.classList.toggle('active', button.dataset.target === moduleName);
    });

    document.querySelectorAll('.module').forEach((section) => {
        section.classList.toggle('active', section.dataset.module === moduleName);
    });

    if (window.location.hash !== `#${moduleName}`) {
        window.history.replaceState(null, '', `#${moduleName}`);
    }
}

function buildSimpleCrud(prefix, config) {
    return createCrudModule({
        baseUrl: `${API}/${config.endpoint}`,
        elements: {
            form: $(`${prefix}-form`),
            formTitle: $(`${prefix}-formTitle`),
            submitButton: $(`${prefix}-submitButton`),
            mensaje: $(`${prefix}-mensaje`),
            contenedor: $(`${prefix}-contenedor`),
            buscador: $(`${prefix}-buscador`),
            btnCancelarEdicion: $(`${prefix}-btnCancelarEdicion`),
            btnNuevo: $(`${prefix}-btnNuevo`),
            btnRecargar: $(`${prefix}-btnRecargar`),
            btnLimpiarBusqueda: $(`${prefix}-btnLimpiarBusqueda`),
            btnListar: $(`${prefix}-btnListar`)
        },
        formCreateTitle: config.formCreateTitle,
        formEditTitle: (item) => `Editando ${config.label} #${item.id}`,
        submitCreateText: `Guardar ${config.label}`,
        submitEditText: `Actualizar ${config.label}`,
        createMessage: `${config.labelCapital} creado correctamente.`,
        updateMessage: `${config.labelCapital} actualizado correctamente.`,
        deleteMessage: `${config.labelCapital} eliminado correctamente.`,
        reloadMessage: 'Listado actualizado desde la base de datos.',
        emptyMessage: `No hay ${config.labelPlural} para mostrar.`,
        loadErrorMessage: `No fue posible cargar ${config.labelPlural}.`,
        notFoundMessage: `No se encontro ${config.article} ${config.label} seleccionado.`,
        deleteConfirm: (item) => `Deseas eliminar ${config.article} ${config.label} ${item.nombre}?`,
        searchText: config.searchText,
        fetchItemById: config.fetchItemById,
        getPayload: () => config.getPayload(prefix),
        fillForm: (item) => config.fillForm(prefix, item),
        onResetForm: () => config.onResetForm(prefix),
        renderResumen: () => {},
        afterMutation: config.afterMutation,
        secondaryAction: config.secondaryAction,
        renderCard: config.renderCard
    });
}

function siguienteEstadoPaquete(actual) {
    if (actual === 'disponible') return 'agotado';
    if (actual === 'agotado') return 'inactivo';
    return 'disponible';
}

function siguienteEstadoServicio(actual) {
    if (actual === 'disponible') return 'no_disponible';
    if (actual === 'no_disponible') return 'inactivo';
    return 'disponible';
}

function siguienteRol(actual) {
    return actual === 'admin' ? 'usuario' : 'admin';
}

const packageState = {
    habitaciones: [],
    servicios: [],
    seleccion: {
        habitaciones: [],
        servicios: []
    }
};

function packageElements() {
    return {
        habitacionSelect: $('paquetes-habitacionSelect'),
        servicioSelect: $('paquetes-servicioSelect'),
        habitacionesSeleccionadas: $('paquetes-habitacionesSeleccionadas'),
        serviciosSeleccionados: $('paquetes-serviciosSeleccionados'),
        btnAgregarHabitacion: $('paquetes-btnAgregarHabitacion'),
        btnAgregarServicio: $('paquetes-btnAgregarServicio')
    };
}

function setCatalogOptions(select, items, placeholder) {
    select.innerHTML = `<option value="">${placeholder}</option>` + items.map((item) => (
        `<option value="${item.id}">${safeText(item.nombre)} - $${Number(item.precio || 0).toFixed(2)}</option>`
    )).join('');
}

async function loadPackageCatalogs() {
    const [habitaciones, servicios] = await Promise.all([
        request(`${API}/habitaciones`),
        request(`${API}/servicios`)
    ]);

    const seleccionadasHabitaciones = packageState.seleccion.habitaciones.map((item) => Number(item.id));
    const seleccionadosServicios = packageState.seleccion.servicios.map((item) => Number(item.id));

    packageState.habitaciones = (Array.isArray(habitaciones.data) ? habitaciones.data : [])
        .filter((item) => item.estado !== 'inactivo' || seleccionadasHabitaciones.includes(Number(item.id)));
    packageState.servicios = (Array.isArray(servicios.data) ? servicios.data : [])
        .filter((item) => item.estado === 'disponible' || seleccionadosServicios.includes(Number(item.id)));

    const elements = packageElements();
    setCatalogOptions(elements.habitacionSelect, packageState.habitaciones, 'Selecciona una habitacion');
    setCatalogOptions(elements.servicioSelect, packageState.servicios, 'Selecciona un servicio');
}

function resetPackageSelection() {
    packageState.seleccion = {
        habitaciones: [],
        servicios: []
    };
}

function renderPackageSelection() {
    const elements = packageElements();

    const renderBucket = (container, items, type) => {
        container.innerHTML = items.length
            ? items.map((item) => `
                <div class="selection-item">
                    <span>${safeText(item.nombre)} x${safeText(item.cantidad || 1)} - $${Number(item.precio || 0).toFixed(2)}</span>
                    <button class="danger" type="button" data-package-remove="${type}" data-id="${item.id}">Quitar</button>
                </div>
            `).join('')
            : '<div class="empty">Sin elementos agregados.</div>';
    };

    renderBucket(elements.habitacionesSeleccionadas, packageState.seleccion.habitaciones, 'habitacion');
    renderBucket(elements.serviciosSeleccionados, packageState.seleccion.servicios, 'servicio');
}

function addPackageSelection(type, source, id) {
    const item = source.find((entry) => Number(entry.id) === Number(id));
    if (!item) {
        return;
    }

    const bucket = packageState.seleccion[type];
    if (type === 'habitaciones' && bucket.length > 0) {
        return;
    }
    if (bucket.some((entry) => Number(entry.id) === Number(item.id))) {
        return;
    }

    bucket.push({
        id: item.id,
        nombre: item.nombre,
        precio: Number(item.precio || 0),
        cantidad: 1
    });

    renderPackageSelection();
}

function removePackageSelection(type, id) {
    packageState.seleccion[type] = packageState.seleccion[type]
        .filter((item) => Number(item.id) !== Number(id));
    renderPackageSelection();
}

function bindPackageSelectionEvents() {
    const elements = packageElements();

    elements.btnAgregarHabitacion.addEventListener('click', () => {
        if (!elements.habitacionSelect.value) return;
        addPackageSelection('habitaciones', packageState.habitaciones, elements.habitacionSelect.value);
        elements.habitacionSelect.value = '';
    });

    elements.btnAgregarServicio.addEventListener('click', () => {
        if (!elements.servicioSelect.value) return;
        addPackageSelection('servicios', packageState.servicios, elements.servicioSelect.value);
        elements.servicioSelect.value = '';
    });

    elements.habitacionesSeleccionadas.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-package-remove="habitacion"]');
        if (!button) return;
        removePackageSelection('habitaciones', Number(button.dataset.id));
    });

    elements.serviciosSeleccionados.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-package-remove="servicio"]');
        if (!button) return;
        removePackageSelection('servicios', Number(button.dataset.id));
    });
}

const habitacionesCrud = buildSimpleCrud('habitaciones', {
    endpoint: 'habitaciones',
    label: 'habitacion',
    labelCapital: 'Habitacion',
    labelPlural: 'habitaciones',
    article: 'la',
    formCreateTitle: 'Registra una nueva habitacion',
    searchText: (item) => [item.nombre, item.descripcion, item.estado].filter(Boolean).join(' '),
    getPayload: (prefix) => ({
        nombre: $(`${prefix}-nombre`).value.trim(),
        descripcion: $(`${prefix}-descripcion`).value.trim(),
        precio: Number($(`${prefix}-precio`).value),
        capacidad: Number($(`${prefix}-capacidad`).value),
        estado: $(`${prefix}-estado`).value.trim().toLowerCase()
    }),
    fillForm: (prefix, item) => {
        $(`${prefix}-id`).value = item.id;
        $(`${prefix}-nombre`).value = item.nombre || '';
        $(`${prefix}-descripcion`).value = item.descripcion || '';
        $(`${prefix}-precio`).value = item.precio || '';
        $(`${prefix}-capacidad`).value = item.capacidad || 1;
        $(`${prefix}-estado`).value = item.estado || 'disponible';
    },
    onResetForm: (prefix) => {
        $(`${prefix}-id`).value = '';
        $(`${prefix}-estado`).value = 'disponible';
    },
    secondaryAction: {
        path: 'reservar',
        method: 'POST',
        payload: () => ({}),
        successMessage: () => 'Habitacion marcada como reservada.'
    },
    afterMutation: async () => {
        if (typeof reservasModule !== 'undefined') {
            await reservasModule.refreshCatalogs();
        }
    },
    renderCard: (item, { escapeHtml, formatMoney }) => `
        <article class="entity-card">
            <span class="status ${escapeHtml(item.estado)}">${escapeHtml(item.estado)}</span>
            <div><h4>${escapeHtml(item.nombre)}</h4><p>${escapeHtml(item.descripcion || 'Sin descripcion registrada.')}</p></div>
            <div class="entity-meta">
                <span><strong>Precio:</strong> ${formatMoney(item.precio)}</span>
                <span><strong>Capacidad:</strong> ${escapeHtml(item.capacidad)} persona(s)</span>
                <span><strong>ID:</strong> ${escapeHtml(item.id)}</span>
            </div>
            <div class="card-actions">
                <button class="secondary" type="button" data-action="editar" data-id="${item.id}">Editar</button>
                <button class="primary" type="button" data-action="secundaria" data-id="${item.id}" ${item.estado !== 'disponible' ? 'disabled' : ''}>Reservar</button>
                <button class="danger" type="button" data-action="eliminar" data-id="${item.id}">Eliminar</button>
            </div>
        </article>
    `
});

const paquetesCrud = buildSimpleCrud('paquetes', {
    endpoint: 'paquetes',
    label: 'paquete',
    labelCapital: 'Paquete',
    labelPlural: 'paquetes',
    article: 'el',
    formCreateTitle: 'Registra un nuevo paquete',
    searchText: (item) => [
        item.nombre,
        item.descripcion,
        item.estado,
        ...(item.habitaciones || []).map((habitacion) => habitacion.nombre),
        ...(item.servicios || []).map((servicio) => servicio.nombre)
    ].filter(Boolean).join(' '),
    fetchItemById: async (id) => {
        const response = await request(`${API}/paquetes/${id}`);
        return response.data;
    },
    getPayload: (prefix) => ({
        nombre: $(`${prefix}-nombre`).value.trim(),
        descripcion: $(`${prefix}-descripcion`).value.trim(),
        precio: Number($(`${prefix}-precio`).value),
        estado: $(`${prefix}-estado`).value.trim().toLowerCase(),
        habitaciones: packageState.seleccion.habitaciones.map((item) => ({ id: item.id, cantidad: item.cantidad || 1 })),
        servicios: packageState.seleccion.servicios.map((item) => ({ id: item.id, cantidad: item.cantidad || 1 }))
    }),
    fillForm: (prefix, item) => {
        $(`${prefix}-id`).value = item.id;
        $(`${prefix}-nombre`).value = item.nombre || '';
        $(`${prefix}-descripcion`).value = item.descripcion || '';
        $(`${prefix}-precio`).value = item.precio || '';
        $(`${prefix}-estado`).value = item.estado || 'disponible';
        packageState.seleccion.habitaciones = Array.isArray(item.habitaciones)
            ? item.habitaciones.map((habitacion) => ({
                id: habitacion.id,
                nombre: habitacion.nombre,
                precio: Number(habitacion.precio || 0),
                cantidad: Number(habitacion.cantidad || 1)
            }))
            : [];
        packageState.seleccion.servicios = Array.isArray(item.servicios)
            ? item.servicios.map((servicio) => ({
                id: servicio.id,
                nombre: servicio.nombre,
                precio: Number(servicio.precio || 0),
                cantidad: Number(servicio.cantidad || 1)
            }))
            : [];
        renderPackageSelection();
    },
    onResetForm: (prefix) => {
        $(`${prefix}-id`).value = '';
        $(`${prefix}-estado`).value = 'disponible';
        resetPackageSelection();
        renderPackageSelection();
    },
    secondaryAction: {
        path: 'estado',
        method: 'PATCH',
        payload: (item) => ({ estado: siguienteEstadoPaquete(item.estado) }),
        successMessage: (item) => `Estado actualizado a ${siguienteEstadoPaquete(item.estado)}.`
    },
    afterMutation: async () => {
        if (typeof reservasModule !== 'undefined') {
            await reservasModule.refreshCatalogs();
        }
        await loadPackageCatalogs();
    },
    renderCard: (item, { escapeHtml, formatMoney }) => `
        <article class="entity-card">
            <span class="status ${escapeHtml(item.estado)}">${escapeHtml(item.estado)}</span>
            <div><h4>${escapeHtml(item.nombre)}</h4><p>${escapeHtml(item.descripcion || 'Sin descripcion registrada.')}</p></div>
            <div class="entity-meta">
                <span><strong>Precio:</strong> ${formatMoney(item.precio)}</span>
                <span><strong>ID:</strong> ${escapeHtml(item.id)}</span>
                <span><strong>Habitaciones:</strong> ${escapeHtml((item.habitaciones || []).map((habitacion) => `${habitacion.nombre} x${habitacion.cantidad || 1}`).join(', ') || 'Sin habitaciones')}</span>
                <span><strong>Servicios:</strong> ${escapeHtml((item.servicios || []).map((servicio) => `${servicio.nombre} x${servicio.cantidad || 1}`).join(', ') || 'Sin servicios')}</span>
            </div>
            <div class="card-actions">
                <button class="secondary" type="button" data-action="editar" data-id="${item.id}">Editar</button>
                <button class="primary" type="button" data-action="secundaria" data-id="${item.id}">Cambiar estado</button>
                <button class="danger" type="button" data-action="eliminar" data-id="${item.id}">Eliminar</button>
            </div>
        </article>
    `
});

const serviciosCrud = buildSimpleCrud('servicios', {
    endpoint: 'servicios',
    label: 'servicio',
    labelCapital: 'Servicio',
    labelPlural: 'servicios',
    article: 'el',
    formCreateTitle: 'Registra un nuevo servicio',
    searchText: (item) => [item.nombre, item.descripcion, item.estado].filter(Boolean).join(' '),
    getPayload: (prefix) => ({
        nombre: $(`${prefix}-nombre`).value.trim(),
        descripcion: $(`${prefix}-descripcion`).value.trim(),
        precio: Number($(`${prefix}-precio`).value),
        estado: $(`${prefix}-estado`).value.trim().toLowerCase()
    }),
    fillForm: (prefix, item) => {
        $(`${prefix}-id`).value = item.id;
        $(`${prefix}-nombre`).value = item.nombre || '';
        $(`${prefix}-descripcion`).value = item.descripcion || '';
        $(`${prefix}-precio`).value = item.precio || '';
        $(`${prefix}-estado`).value = item.estado || 'disponible';
    },
    onResetForm: (prefix) => {
        $(`${prefix}-id`).value = '';
        $(`${prefix}-estado`).value = 'disponible';
    },
    secondaryAction: {
        path: 'estado',
        method: 'PATCH',
        payload: (item) => ({ estado: siguienteEstadoServicio(item.estado) }),
        successMessage: (item) => `Estado actualizado a ${siguienteEstadoServicio(item.estado).replace('_', ' ')}.`
    },
    afterMutation: async () => {
        if (typeof reservasModule !== 'undefined') {
            await reservasModule.refreshCatalogs();
        }
    },
    renderCard: (item, { escapeHtml, formatMoney }) => `
        <article class="entity-card">
            <span class="status ${escapeHtml(item.estado)}">${escapeHtml(String(item.estado || '').replace('_', ' '))}</span>
            <div><h4>${escapeHtml(item.nombre)}</h4><p>${escapeHtml(item.descripcion || 'Sin descripcion registrada.')}</p></div>
            <div class="entity-meta"><span><strong>Precio:</strong> ${formatMoney(item.precio)}</span><span><strong>ID:</strong> ${escapeHtml(item.id)}</span></div>
            <div class="card-actions">
                <button class="secondary" type="button" data-action="editar" data-id="${item.id}">Editar</button>
                <button class="primary" type="button" data-action="secundaria" data-id="${item.id}">Cambiar estado</button>
                <button class="danger" type="button" data-action="eliminar" data-id="${item.id}">Eliminar</button>
            </div>
        </article>
    `
});

const usuariosCrud = buildSimpleCrud('usuarios', {
    endpoint: 'usuarios',
    label: 'usuario',
    labelCapital: 'Usuario',
    labelPlural: 'usuarios',
    article: 'el',
    formCreateTitle: 'Registra un nuevo usuario',
    searchText: (item) => [item.nombre, item.email, item.rol].filter(Boolean).join(' '),
    getPayload: (prefix) => {
        const password = $(`${prefix}-password`).value.trim();
        return {
            nombre: $(`${prefix}-nombre`).value.trim(),
            email: $(`${prefix}-email`).value.trim(),
            rol: $(`${prefix}-rol`).value.trim().toLowerCase(),
            ...(password ? { password } : {})
        };
    },
    fillForm: (prefix, item) => {
        $(`${prefix}-id`).value = item.id;
        $(`${prefix}-nombre`).value = item.nombre || '';
        $(`${prefix}-email`).value = item.email || '';
        $(`${prefix}-password`).value = '';
        $(`${prefix}-rol`).value = item.rol || 'usuario';
    },
    onResetForm: (prefix) => {
        $(`${prefix}-id`).value = '';
        $(`${prefix}-password`).value = '';
        $(`${prefix}-rol`).value = 'usuario';
    },
    secondaryAction: {
        path: 'rol',
        method: 'PATCH',
        payload: (item) => ({ rol: siguienteRol(item.rol) }),
        successMessage: (item) => `Rol actualizado a ${siguienteRol(item.rol)}.`
    },
    renderCard: (item, { escapeHtml }) => `
        <article class="entity-card">
            <span class="status ${escapeHtml(item.rol)}">${escapeHtml(item.rol)}</span>
            <div><h4>${escapeHtml(item.nombre)}</h4><p>${escapeHtml(item.email)}</p></div>
            <div class="entity-meta"><span><strong>ID:</strong> ${escapeHtml(item.id)}</span><span><strong>Rol:</strong> ${escapeHtml(item.rol)}</span></div>
            <div class="card-actions">
                <button class="secondary" type="button" data-action="editar" data-id="${item.id}">Editar</button>
                <button class="primary" type="button" data-action="secundaria" data-id="${item.id}">Cambiar rol</button>
                <button class="danger" type="button" data-action="eliminar" data-id="${item.id}">Eliminar</button>
            </div>
        </article>
    `
});

function createReservasModule() {
    const state = {
        reservas: [],
        habitaciones: [],
        paquetes: [],
        servicios: [],
        filtro: '',
        editandoId: null,
        seleccion: { habitaciones: [], paquetes: [], servicios: [] }
    };

    const elements = {
        form: $('reservas-form'),
        formTitle: $('reservas-formTitle'),
        submitButton: $('reservas-submitButton'),
        mensaje: $('reservas-mensaje'),
        contenedor: $('reservas-contenedor'),
        buscador: $('reservas-buscador'),
        btnCancelarEdicion: $('reservas-btnCancelarEdicion'),
        btnNuevo: $('reservas-btnNuevo'),
        btnRecargar: $('reservas-btnRecargar'),
        btnLimpiarBusqueda: $('reservas-btnLimpiarBusqueda'),
        btnListar: $('reservas-btnListar'),
        habitacionSelect: $('reservas-habitacionSelect'),
        paqueteSelect: $('reservas-paqueteSelect'),
        servicioSelect: $('reservas-servicioSelect'),
        cantidadPaquete: $('reservas-cantidadPaquete'),
        cantidadServicio: $('reservas-cantidadServicio'),
        habitacionesSeleccionadas: $('reservas-habitacionesSeleccionadas'),
        paquetesSeleccionados: $('reservas-paquetesSeleccionados'),
        serviciosSeleccionados: $('reservas-serviciosSeleccionados'),
        total: $('reservas-total')
    };

    function showMessage(text, type = 'success') {
        elements.mensaje.textContent = text;
        elements.mensaje.className = `message show ${type}`;
    }

    function clearMessage() {
        elements.mensaje.textContent = '';
        elements.mensaje.className = 'message';
    }

    function formatCurrency(value) {
        return `$${Number(value || 0).toFixed(2)}`;
    }

    function setOptions(select, items, placeholder) {
        select.innerHTML = `<option value="">${placeholder}</option>` + items.map((item) => `<option value="${item.id}">${item.nombre} - ${formatCurrency(item.precio)}</option>`).join('');
    }

    async function loadCatalogs() {
        const selectedRoomIds = state.seleccion.habitaciones.map((item) => Number(item.id));
        const [habitaciones, paquetes, servicios] = await Promise.all([
            request(`${API}/habitaciones`),
            request(`${API}/paquetes`),
            request(`${API}/servicios`)
        ]);

        state.habitaciones = (habitaciones.data || []).filter((item) => (item.estado === 'disponible' || item.estado === 'reservada') && (item.estado !== 'reservada' || selectedRoomIds.includes(Number(item.id))));
        state.paquetes = (paquetes.data || []).filter((item) => item.estado === 'disponible');
        state.servicios = (servicios.data || []).filter((item) => item.estado === 'disponible');
        setOptions(elements.habitacionSelect, state.habitaciones, 'Selecciona una habitacion');
        setOptions(elements.paqueteSelect, state.paquetes, 'Selecciona un paquete');
        setOptions(elements.servicioSelect, state.servicios, 'Selecciona un servicio');
    }

    async function list() {
        const data = await request(`${API}/reservas`);
        state.reservas = Array.isArray(data.data) ? data.data : [];
        render();
    }

    function filtered() {
        const term = state.filtro.trim().toLowerCase();
        if (!term) return state.reservas;
        return state.reservas.filter((item) => [item.nombre_cliente, item.email, item.estado].filter(Boolean).join(' ').toLowerCase().includes(term));
    }

    function render() {
        const items = filtered();
        if (!items.length) {
            elements.contenedor.innerHTML = '<div class="empty">No hay reservas para mostrar.</div>';
            return;
        }

        elements.contenedor.innerHTML = items.map((item) => `
            <article class="entity-card">
                <span class="status ${safeText(item.estado)}">${safeText(item.estado)}</span>
                <div><h4>Reserva #${safeText(item.id)} - ${safeText(item.nombre_cliente)}</h4><p>${safeText(item.email)} | ${safeText(item.telefono)}</p></div>
                <div class="entity-meta">
                    <span><strong>Entrada:</strong> ${safeText(normalizeDateInput(item.fecha_entrada))}</span>
                    <span><strong>Salida:</strong> ${safeText(normalizeDateInput(item.fecha_salida))}</span>
                    <span><strong>Total:</strong> ${formatCurrency(item.total)}</span>
                </div>
                <ul class="details-list">${(item.detalles || []).map((detalle) => `<li>${safeText(detalle.tipo_item)}: ${safeText(detalle.nombre_item)} x${safeText(detalle.cantidad)} - ${formatCurrency(detalle.subtotal)}</li>`).join('') || '<li>Sin detalle</li>'}</ul>
                <div class="card-actions">
                    <button class="secondary" type="button" data-action="editar" data-id="${item.id}">Editar</button>
                    <button class="danger" type="button" data-action="eliminar" data-id="${item.id}">Eliminar</button>
                </div>
            </article>
        `).join('');
    }

    function resetSelection() {
        state.seleccion = { habitaciones: [], paquetes: [], servicios: [] };
    }

    function renderSelection() {
        const renderBucket = (container, items, type) => {
            container.innerHTML = items.length ? items.map((item) => `
                <div class="selection-item">
                    <span>${safeText(item.nombre)} x${safeText(item.cantidad)} - ${formatCurrency(item.precio * item.cantidad)}</span>
                    <button class="danger" type="button" data-remove="${type}" data-id="${item.id}">Quitar</button>
                </div>
            `).join('') : '<div class="empty">Sin elementos seleccionados.</div>';
        };

        renderBucket(elements.habitacionesSeleccionadas, state.seleccion.habitaciones, 'habitacion');
        renderBucket(elements.paquetesSeleccionados, state.seleccion.paquetes, 'paquete');
        renderBucket(elements.serviciosSeleccionados, state.seleccion.servicios, 'servicio');

        elements.total.value = formatCurrency(
            [...state.seleccion.habitaciones, ...state.seleccion.paquetes, ...state.seleccion.servicios]
                .reduce((sum, item) => sum + (Number(item.precio) * Number(item.cantidad)), 0)
        );
    }

    function resetForm() {
        state.editandoId = null;
        elements.form.reset();
        $('reservas-id').value = '';
        $('reservas-estado').value = 'pendiente';
        elements.formTitle.textContent = 'Registra una nueva reserva';
        elements.submitButton.textContent = 'Guardar reserva';
        elements.cantidadPaquete.value = 1;
        elements.cantidadServicio.value = 1;
        resetSelection();
        renderSelection();
    }

    function payload() {
        return {
            nombre_cliente: $('reservas-nombreCliente').value.trim(),
            email: $('reservas-email').value.trim(),
            telefono: $('reservas-telefono').value.trim(),
            fecha_entrada: $('reservas-fechaEntrada').value,
            fecha_salida: $('reservas-fechaSalida').value,
            estado: $('reservas-estado').value,
            habitaciones: state.seleccion.habitaciones.map((item) => ({ id: item.id, cantidad: 1 })),
            paquetes: state.seleccion.paquetes.map((item) => ({ id: item.id, cantidad: item.cantidad })),
            servicios: state.seleccion.servicios.map((item) => ({ id: item.id, cantidad: item.cantidad }))
        };
    }

    function addSelection(type, source, id, qty = 1) {
        const item = source.find((entry) => Number(entry.id) === Number(id));
        if (!item) return;
        const bucket = state.seleccion[type];
        const existing = bucket.find((entry) => Number(entry.id) === Number(item.id));

        if (existing) {
            existing.cantidad = type === 'habitaciones' ? 1 : existing.cantidad + qty;
        } else {
            bucket.push({ id: item.id, nombre: item.nombre, precio: Number(item.precio), cantidad: type === 'habitaciones' ? 1 : qty });
        }

        renderSelection();
    }

    function removeSelection(type, id) {
        state.seleccion[type] = state.seleccion[type].filter((item) => Number(item.id) !== Number(id));
        renderSelection();
    }

    function fillForm(item) {
        state.editandoId = item.id;
        $('reservas-id').value = item.id;
        $('reservas-nombreCliente').value = item.nombre_cliente || '';
        $('reservas-email').value = item.email || '';
        $('reservas-telefono').value = item.telefono || '';
        $('reservas-fechaEntrada').value = normalizeDateInput(item.fecha_entrada);
        $('reservas-fechaSalida').value = normalizeDateInput(item.fecha_salida);
        $('reservas-estado').value = item.estado || 'pendiente';
        resetSelection();
        (item.detalles || []).forEach((detalle) => {
            const target = detalle.tipo_item === 'habitacion' ? 'habitaciones' : `${detalle.tipo_item}s`;
            if (state.seleccion[target]) {
                state.seleccion[target].push({ id: detalle.item_id, nombre: detalle.nombre_item, precio: Number(detalle.precio), cantidad: Number(detalle.cantidad) });
            }
        });
        elements.formTitle.textContent = `Editando reserva #${item.id}`;
        elements.submitButton.textContent = 'Actualizar reserva';
        renderSelection();
        loadCatalogs().catch(() => {});
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function submit(event) {
        event.preventDefault();
        clearMessage();
        try {
            const url = state.editandoId ? `${API}/reservas/${state.editandoId}` : `${API}/reservas`;
            const method = state.editandoId ? 'PUT' : 'POST';
            await request(url, { method, body: JSON.stringify(payload()) });
            showMessage(state.editandoId ? 'Reserva actualizada correctamente.' : 'Reserva creada correctamente.');
            resetForm();
            await Promise.all([loadCatalogs(), list()]);
        } catch (error) {
            showMessage(error.message, 'error');
        }
    }

    async function clickReservation(event) {
        const remove = event.target.closest('button[data-remove]');
        if (remove) {
            const map = { habitacion: 'habitaciones', paquete: 'paquetes', servicio: 'servicios' };
            removeSelection(map[remove.dataset.remove], Number(remove.dataset.id));
            return;
        }

        const action = event.target.closest('button[data-action]');
        if (!action) return;

        const item = state.reservas.find((entry) => Number(entry.id) === Number(action.dataset.id));
        if (!item) return showMessage('No se encontro la reserva seleccionada.', 'error');

        try {
            if (action.dataset.action === 'editar') {
                clearMessage();
                fillForm(item);
                return;
            }

            if (!window.confirm(`Deseas eliminar la reserva #${item.id}?`)) return;
            await request(`${API}/reservas/${item.id}`, { method: 'DELETE' });
            if (state.editandoId === item.id) resetForm();
            showMessage('Reserva eliminada correctamente.');
            await Promise.all([loadCatalogs(), list()]);
        } catch (error) {
            showMessage(error.message, 'error');
        }
    }

    function bind() {
        elements.form.addEventListener('submit', submit);
        elements.contenedor.addEventListener('click', clickReservation);
        elements.habitacionesSeleccionadas.addEventListener('click', clickReservation);
        elements.paquetesSeleccionados.addEventListener('click', clickReservation);
        elements.serviciosSeleccionados.addEventListener('click', clickReservation);
        elements.buscador.addEventListener('input', (event) => { state.filtro = event.target.value; render(); });
        $('reservas-btnAgregarHabitacion').addEventListener('click', () => elements.habitacionSelect.value && addSelection('habitaciones', state.habitaciones, elements.habitacionSelect.value, 1));
        $('reservas-btnAgregarPaquete').addEventListener('click', () => elements.paqueteSelect.value && addSelection('paquetes', state.paquetes, elements.paqueteSelect.value, Number(elements.cantidadPaquete.value || 1)));
        $('reservas-btnAgregarServicio').addEventListener('click', () => elements.servicioSelect.value && addSelection('servicios', state.servicios, elements.servicioSelect.value, Number(elements.cantidadServicio.value || 1)));
        elements.btnCancelarEdicion.addEventListener('click', () => { resetForm(); clearMessage(); });
        elements.btnNuevo.addEventListener('click', () => { resetForm(); clearMessage(); });
        elements.btnRecargar.addEventListener('click', async () => {
            clearMessage();
            try {
                await Promise.all([loadCatalogs(), list()]);
                showMessage('Listado actualizado desde la base de datos.');
            } catch (error) {
                showMessage(error.message, 'error');
            }
        });
        elements.btnLimpiarBusqueda.addEventListener('click', () => { state.filtro = ''; elements.buscador.value = ''; render(); });
        elements.btnListar.addEventListener('click', async () => {
            try {
                await list();
            } catch (error) {
                showMessage(error.message, 'error');
            }
        });
    }

    async function init() {
        bind();
        resetForm();
        try {
            await Promise.all([loadCatalogs(), list()]);
        } catch (error) {
            showMessage(error.message, 'error');
            elements.contenedor.innerHTML = '<div class="empty">No fue posible cargar las reservas.</div>';
        }
    }

    async function refresh() {
        await Promise.all([loadCatalogs(), list()]);
    }

    return { init, refresh, refreshCatalogs: loadCatalogs };
}

const reservasModule = createReservasModule();

document.addEventListener('DOMContentLoaded', async () => {
    bindPackageSelectionEvents();
    renderPackageSelection();

    const initialModule = window.location.hash.replace('#', '') || 'habitaciones';
    if (document.querySelector(`.module[data-module="${initialModule}"]`)) {
        setActiveModule(initialModule);
    }

    document.querySelectorAll('.nav button').forEach((button) => {
        button.addEventListener('click', async () => {
            setActiveModule(button.dataset.target);
            if (button.dataset.target === 'reservas') {
                try {
                    await reservasModule.refresh();
                } catch (error) {
                    console.error('No fue posible refrescar reservas:', error);
                }
            }
            if (button.dataset.target === 'paquetes') {
                try {
                    await loadPackageCatalogs();
                } catch (error) {
                    console.error('No fue posible refrescar catalogos de paquetes:', error);
                }
            }
        });
    });

    const results = await Promise.allSettled([
        loadPackageCatalogs(),
        habitacionesCrud.init(),
        paquetesCrud.init(),
        serviciosCrud.init(),
        usuariosCrud.init(),
        reservasModule.init()
    ]);

    results
        .filter((result) => result.status === 'rejected')
        .forEach((result) => console.error('Error al iniciar un modulo del panel:', result.reason));
});
