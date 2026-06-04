import { logout, isClientSession, getSession } from "../../dashboard/core/authGuard.js";
import { getHabitaciones, getServicios, getPaquetes, crearReserva, actualizarReserva, getReservas } from "../../dashboard/core/api.js";

const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get('id');
const selectedRoomId = urlParams.get('habitacion');
const selectedPackageId = urlParams.get('paquete');
const selectedServiceId = urlParams.get('servicio');
let habitacionesCache = [];
let extrasSeleccionados = [];
let selectedRoomApplied = false;

// ============================================================
// Mensajes UI — sin alert()
// ============================================================
function mostrarMensaje(texto, tipo = 'error') {
    const el = document.getElementById('formMessage');
    if (!el) return;
    el.textContent = texto;
    el.className = `form-message form-message--${tipo} form-message--visible`;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function ocultarMensaje() {
    const el = document.getElementById('formMessage');
    if (!el) return;
    el.textContent = '';
    el.className = 'form-message';
}

// ============================================================
// Init
// ============================================================
async function init() {
    try {
        const session = getSession();
        if (!session || !isClientSession(session)) {
            window.location.href = '../auth/login.html';
            return;
        }

        const userName = session.nombre || session.NombreCompleto || session.Nombres || session.Nombre || 'Cliente';
        const displayElem = document.getElementById('userNameDisplay');
        if (displayElem) displayElem.textContent = userName;
        const initialElem = document.getElementById('userInitial');
        if (initialElem) initialElem.textContent = userName.trim().charAt(0).toUpperCase() || 'V';

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', logout);

        await cargarHabitaciones();
        await cargarExtras();

        if (editId) {
            await cargarDatosEdicion(editId);
        }

        const form = document.getElementById('reservaForm');
        if (form) form.addEventListener('submit', manejarEnvio);

        const availabilityBtn = document.getElementById('checkAvailabilityBtn');
        if (availabilityBtn) availabilityBtn.addEventListener('click', renderDisponibilidad);

        ['fechaInicio', 'fechaFin', 'id_habitacion', 'cantPersonas'].forEach((id) => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('change', () => {
                    ocultarMensaje();
                    actualizarResumen();
                });
            }
        });

        const today = new Date().toISOString().split('T')[0];
        const startInput = document.getElementById('fechaInicio');
        const endInput = document.getElementById('fechaFin');

        if (startInput) startInput.setAttribute('min', today);
        if (endInput) endInput.setAttribute('min', today);

    } catch (error) {
        console.error('Error en init nuevaReserva:', error);
    }
}

// ============================================================
// Cargar habitaciones
// ============================================================
async function cargarHabitaciones() {
    try {
        const habitaciones = await getHabitaciones();
        habitacionesCache = Array.isArray(habitaciones) ? habitaciones : [];
        const select = document.getElementById('id_habitacion');
        if (!select) return;

        const disponibles = habitacionesCache.filter(esDisponible);

        if (disponibles.length === 0) {
            select.innerHTML = '<option value="">No hay habitaciones disponibles actualmente</option>';
            return;
        }

        select.innerHTML = '<option value="">Selecciona una habitación...</option>' +
            disponibles.map(h => `
                <option value="${h.id_habitacion || h.IDHabitacion}">
                    ${getHabitacionNombre(h)} — Cap. máx. ${getHabitacionCapacidad(h)} personas
                    (${formatMoney(getHabitacionPrecio(h))}/noche)
                </option>
            `).join('');

        if (selectedRoomId) select.value = selectedRoomId;
        renderDisponibilidad();
        actualizarResumen();
    } catch (error) {
        console.error('Error cargando habitaciones:', error);
    }
}

// ============================================================
// Cargar extras
// ============================================================
async function cargarExtras() {
    const grid = document.getElementById('extrasGrid');
    if (!grid) return;

    try {
        const [servicios, paquetes] = await Promise.all([getServicios(), getPaquetes()]);
        const extras = [
            ...(Array.isArray(servicios) ? servicios : []).filter(esDisponible).map((item) => ({ ...item, tipo: 'servicio' })),
            ...(Array.isArray(paquetes) ? paquetes : []).filter(esDisponible).map((item) => ({ ...item, tipo: 'paquete' }))
        ];

        if (!extras.length) {
            grid.innerHTML = '<div class="empty-state">No hay extras registrados por ahora.</div>';
            return;
        }

        grid.innerHTML = extras.map((extra, index) => {
            const id = extra.IDServicio || extra.IDPaquete || extra.id || `${extra.tipo}-${index}`;
            const nombre = extra.NombreServicio || extra.NombrePaquete || extra.nombre || 'Extra Via Luna';
            const precio = extra.Costo || extra.Precio || extra.precio || 0;
            return `
                <label class="extra-option">
                    <input type="checkbox" value="${id}" data-extra-name="${nombre}" data-extra-type="${extra.tipo}" data-extra-price="${precio}" ${isPreselectedExtra(extra.tipo, id) ? 'checked' : ''}>
                    <span>
                        <strong>${nombre}</strong>
                        <small>${extra.tipo} · ${precio ? formatMoney(precio) : 'Incluido'}</small>
                    </span>
                </label>
            `;
        }).join('');

        grid.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
            checkbox.addEventListener('change', actualizarExtras);
        });
        actualizarExtras();
    } catch (error) {
        console.error('Error cargando extras:', error);
        grid.innerHTML = '<div class="empty-state">No fue posible cargar extras.</div>';
    }
}

function isPreselectedExtra(tipo, id) {
    return (tipo === 'paquete' && String(id) === String(selectedPackageId)) ||
        (tipo === 'servicio' && String(id) === String(selectedServiceId));
}

function esDisponible(item) {
    const value = String(item?.Estado ?? item?.estado ?? '').toLowerCase();
    return ['', '1', 'true', 'activo', 'activa', 'disponible'].includes(value);
}

function getHabitacionId(habitacion) {
    return habitacion.id_habitacion || habitacion.IDHabitacion || habitacion.id || '';
}

function getHabitacionNombre(habitacion) {
    return habitacion.NombreHabitacion || habitacion.nombre || habitacion.tipo || habitacion.Tipo || `Habitación ${getHabitacionId(habitacion)}`;
}

function getHabitacionPrecio(habitacion) {
    return habitacion.precio || habitacion.Precio || habitacion.Costo || 0;
}

function getHabitacionCapacidad(habitacion) {
    return Number(habitacion.CapacidadMaximaPersonas || habitacion.Capacidad || habitacion.capacidad || habitacion.CantPersonas || habitacion.cant_personas || 999);
}

// ============================================================
// Disponibilidad visual
// ============================================================
function renderDisponibilidad() {
    const result = document.getElementById('availabilityResult');
    const select = document.getElementById('id_habitacion');
    const personas = Number(document.getElementById('cantPersonas')?.value || 1);
    if (!result || !select) return;

    const disponibles = habitacionesCache.filter((habitacion) => esDisponible(habitacion) && getHabitacionCapacidad(habitacion) >= personas);

    if (!disponibles.length) {
        result.innerHTML = 'No hay habitaciones disponibles para la cantidad de personas seleccionada.';
        select.innerHTML = '<option value="">No hay habitaciones disponibles</option>';
        actualizarResumen();
        return;
    }

    select.innerHTML = '<option value="">Selecciona una habitación...</option>' + disponibles.map(h => `
        <option value="${getHabitacionId(h)}">
            ${getHabitacionNombre(h)} — Cap. máx. ${getHabitacionCapacidad(h)} personas
            (${formatMoney(getHabitacionPrecio(h))}/noche)
        </option>
    `).join('');

    if (!selectedRoomApplied && selectedRoomId && disponibles.some((h) => String(getHabitacionId(h)) === String(selectedRoomId))) {
        select.value = selectedRoomId;
        selectedRoomApplied = true;
    }

    result.innerHTML = `${disponibles.length} habitación${disponibles.length === 1 ? '' : 'es'} disponible${disponibles.length === 1 ? '' : 's'} para tu búsqueda.`;
    actualizarResumen();
}

// ============================================================
// Extras y resumen
// ============================================================
function actualizarExtras() {
    const checked = Array.from(document.querySelectorAll('#extrasGrid input[type="checkbox"]:checked'));
    extrasSeleccionados = checked.map((input) => ({
        id: input.value,
        tipo: input.dataset.extraType,
        nombre: input.dataset.extraName,
        precio: Number(input.dataset.extraPrice || 0)
    }));
    actualizarResumen();
}

function actualizarResumen() {
    const summary = document.getElementById('bookingSummary');
    if (!summary) return;

    const start = document.getElementById('fechaInicio')?.value || '';
    const end = document.getElementById('fechaFin')?.value || '';
    const roomId = document.getElementById('id_habitacion')?.value || '';
    const room = habitacionesCache.find((item) => String(getHabitacionId(item)) === String(roomId));
    const nights = getNights(start, end);
    const roomTotal = room ? Number(getHabitacionPrecio(room)) * nights : 0;
    const extrasTotal = extrasSeleccionados.reduce((total, item) => total + item.precio, 0);

    if (!start || !end || !room) {
        summary.innerHTML = 'La reserva se resumirá cuando selecciones fechas y habitación.';
        return;
    }

    summary.innerHTML = `
        <strong>${getHabitacionNombre(room)}</strong><br>
        ${formatDate(start)} al ${formatDate(end)} · ${nights} ${nights === 1 ? 'noche' : 'noches'}<br>
        Extras: ${extrasSeleccionados.length ? extrasSeleccionados.map((item) => item.nombre).join(', ') : 'Sin extras'}<br>
        Total estimado: ${formatMoney(roomTotal + extrasTotal)}
    `;
}

// ============================================================
// Edición
// ============================================================
async function cargarDatosEdicion(id) {
    try {
        const titleElem = document.getElementById('formTitle');
        const submitBtn = document.getElementById('submitBtn');

        if (titleElem) titleElem.textContent = 'Editar reserva #' + id;
        if (submitBtn) submitBtn.textContent = 'Guardar cambios';

        const reserva = await getReservas({ id_reserva: id });
        const r = Array.isArray(reserva) ? reserva[0] : reserva;

        if (r) {
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val;
            };

            setVal('fechaInicio', r.fecha_inicio || r.FechaInicio || '');
            setVal('fechaFin', r.fecha_fin || r.FechaFin || '');
            setVal('id_habitacion', r.id_habitacion || r.IDHabitacion || r.habitacion?.id || '');
            setVal('cantPersonas', r.cantidad_huespedes || r.cantidadHuespedes || r.CantPersonas || 1);
            setVal('observaciones', r.observaciones || r.Observaciones || '');
        }
    } catch (error) {
        console.error('Error cargando datos de edición:', error);
    }
}

// ============================================================
// Verificar disponibilidad de la habitación
// ============================================================
async function verificarDisponibilidad(idHabitacion, fechaInicio, fechaFin) {
    try {
        const todasReservas = await getReservas({});
        const lista = Array.isArray(todasReservas) ? todasReservas : [];

        const hay_conflicto = lista.some((r) => {
            const rHabitacion = String(r.id_habitacion || r.IDHabitacion || '');
            if (rHabitacion !== String(idHabitacion)) return false;

            // Ignorar canceladas
            const estado = String(r.id_estado_reserva || r.Estado || r.estado || '').toLowerCase();
            if (['2', 'cancelada', 'cancelado'].includes(estado)) return false;

            // Si estamos editando, ignorar la reserva actual
            if (editId && String(r.id_reserva || r.IDReserva) === String(editId)) return false;

            const rInicio = (r.fecha_inicio || r.FechaInicio || '').split('T')[0];
            const rFin = (r.fecha_fin || r.FechaFin || '').split('T')[0];

            // Solapamiento: (inicio1 < fin2) && (fin1 > inicio2)
            return fechaInicio < rFin && fechaFin > rInicio;
        });

        return hay_conflicto;
    } catch (error) {
        // Si no podemos verificar, dejamos pasar (el backend validará)
        console.warn('No se pudo verificar disponibilidad:', error);
        return false;
    }
}

// ============================================================
// Envío del formulario — validaciones completas
// ============================================================
async function manejarEnvio(e) {
    e.preventDefault();
    ocultarMensaje();

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const session = getSession();

    // 1. Campos obligatorios
    if (!data.fecha_inicio) {
        mostrarMensaje('La fecha de entrada es obligatoria.');
        document.getElementById('fechaInicio')?.focus();
        return;
    }
    if (!data.fecha_fin) {
        mostrarMensaje('La fecha de salida es obligatoria.');
        document.getElementById('fechaFin')?.focus();
        return;
    }
    if (!data.id_habitacion) {
        mostrarMensaje('Debes seleccionar una habitación.');
        document.getElementById('id_habitacion')?.focus();
        return;
    }
    if (!data.cant_personas || Number(data.cant_personas) < 1) {
        mostrarMensaje('La cantidad de personas es obligatoria.');
        document.getElementById('cantPersonas')?.focus();
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const fechaInicio = data.fecha_inicio;
    const fechaFin = data.fecha_fin;

    // 2. Fecha inicio >= hoy
    if (fechaInicio < today) {
        mostrarMensaje('La fecha de entrada no puede ser anterior a hoy.');
        document.getElementById('fechaInicio')?.focus();
        return;
    }

    // 3. Fecha fin > fecha inicio
    if (fechaFin <= fechaInicio) {
        mostrarMensaje('La fecha de salida debe ser posterior a la fecha de entrada.');
        document.getElementById('fechaFin')?.focus();
        return;
    }

    // 4. Capacidad máxima
    const habitacionSeleccionada = habitacionesCache.find(
        (h) => String(getHabitacionId(h)) === String(data.id_habitacion)
    );
    if (habitacionSeleccionada) {
        const capacidadMax = getHabitacionCapacidad(habitacionSeleccionada);
        const cantPersonas = Number(data.cant_personas);
        if (cantPersonas > capacidadMax) {
            mostrarMensaje(`La habitación permite máximo ${capacidadMax} persona${capacidadMax !== 1 ? 's' : ''}.`);
            document.getElementById('cantPersonas')?.focus();
            return;
        }
    }

    // 5. Disponibilidad — verificar conflicto de fechas
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verificando disponibilidad...';
    }

    const hayConflicto = await verificarDisponibilidad(data.id_habitacion, fechaInicio, fechaFin);
    if (hayConflicto) {
        mostrarMensaje('La habitación ya se encuentra reservada para las fechas seleccionadas.');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = editId ? 'Guardar cambios' : 'Confirmar reserva';
        }
        return;
    }

    // 6. Crear / actualizar reserva
    if (submitBtn) submitBtn.textContent = 'Procesando...';

    const idCliente = session.id_cliente || session.IDCliente || session.NroDocumento || session.id || session.IDUsuario;
    const paquetes = extrasSeleccionados.filter((item) => item.tipo === 'paquete').map((item) => Number(item.id));
    const servicios = extrasSeleccionados.filter((item) => item.tipo === 'servicio').map((item) => Number(item.id));

    const payload = {
        id_cliente: idCliente,
        nr_documento: session.NroDocumento || session.id_cliente || idCliente,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        id_habitacion: Number(data.id_habitacion),
        cantidad_huespedes: Number(data.cant_personas || 1),
        id_metodo_pago: 1,
        id_estado_reserva: 1,
        paquetes,
        servicios
    };

    try {
        if (editId) {
            await actualizarReserva(editId, payload);
            mostrarMensaje('Reserva actualizada correctamente. Redirigiendo...', 'success');
        } else {
            await crearReserva(payload);
            mostrarMensaje('¡Reserva creada con éxito! Redirigiendo...', 'success');
        }
        setTimeout(() => { window.location.href = 'reservas.html'; }, 1500);
    } catch (error) {
        console.error('Error al procesar reserva:', error);
        mostrarMensaje('No fue posible completar la reserva. Intenta de nuevo.');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = editId ? 'Guardar cambios' : 'Confirmar reserva';
        }
    }
}

// ============================================================
// Helpers
// ============================================================
function getNights(start, end) {
    const a = new Date(start);
    const b = new Date(end);
    const diff = Math.round((b - a) / 86400000);
    return Number.isFinite(diff) && diff > 0 ? diff : 1;
}

function formatMoney(value) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatDate(value) {
    if (!value) return 'N/A';
    return new Date(value + 'T12:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: '2-digit' });
}

init();
