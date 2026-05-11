import { logout, isClientSession, getSession } from "../../dashboard/core/authGuard.js";
import { getHabitaciones, crearReserva, actualizarReserva, getReservas } from "../../dashboard/core/api.js";

console.log('📡 nuevaReserva.js detectado');

const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get('id');

async function init() {
    console.log('🚀 Inicializando Formulario de Reserva...');

    try {
        const session = getSession();
        if (!session || !isClientSession(session)) {
            window.location.href = '../pages/login.html';
            return;
        }

        const userName = session.NombreCompleto || session.Nombres || session.Nombre || 'Cliente';
        const displayElem = document.getElementById('userNameDisplay');
        if (displayElem) displayElem.textContent = userName;
        
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', logout);

        // Cargar habitaciones
        await cargarHabitaciones();

        // Si es edición, cargar datos
        if (editId) {
            await cargarDatosEdicion(editId);
        }

        // Configurar envío del formulario
        const form = document.getElementById('reservaForm');
        if (form) form.addEventListener('submit', manejarEnvio);
        
        // Restringir fechas
        const today = new Date().toISOString().split('T')[0];
        const startInput = document.getElementById('fechaInicio');
        const endInput = document.getElementById('fechaFin');
        
        if (startInput) startInput.setAttribute('min', today);
        if (endInput) endInput.setAttribute('min', today);

    } catch (error) {
        console.error('❌ Error en init nuevaReserva:', error);
    }
}

async function cargarHabitaciones() {
    try {
        const habitaciones = await getHabitaciones();
        console.log('🏨 Habitaciones cargadas:', habitaciones);
        const select = document.getElementById('id_habitacion');
        if (!select) return;
        
        // Filtrar solo las disponibles (Estado 1)
        const disponibles = habitaciones.filter(h => String(h.Estado) == '1');

        if (disponibles.length === 0) {
            select.innerHTML = '<option value="">No hay habitaciones disponibles actualmente</option>';
            return;
        }

        select.innerHTML = '<option value="">Selecciona una habitación...</option>' + 
            disponibles.map(h => `
                <option value="${h.id_habitacion || h.IDHabitacion}">
                    Habitación ${h.numero || h.Numero || h.IDHabitacion} - ${h.tipo || h.Tipo || 'Estándar'} 
                    ($${Number(h.precio || h.Precio || h.Costo || 0).toLocaleString('es-CO')}/noche)
                </option>
            `).join('');
    } catch (error) {
        console.error('Error cargando habitaciones:', error);
    }
}

async function cargarDatosEdicion(id) {
    try {
        console.log(`✏️ Cargando datos de edición para reserva #${id}`);
        const titleElem = document.getElementById('formTitle');
        const submitBtn = document.getElementById('submitBtn');
        
        if (titleElem) titleElem.textContent = 'Editar Reserva #' + id;
        if (submitBtn) submitBtn.textContent = 'Guardar Cambios';

        const reserva = await getReservas({ id_reserva: id });
        const r = Array.isArray(reserva) ? reserva[0] : reserva;

        if (r) {
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val;
            };

            setVal('fechaInicio', r.fecha_inicio || r.FechaInicio || '');
            setVal('fechaFin', r.fecha_fin || r.FechaFin || '');
            setVal('id_habitacion', r.id_habitacion || r.IDHabitacion || '');
            setVal('cantPersonas', r.cant_personas || r.CantPersonas || 1);
            setVal('observaciones', r.observaciones || r.Observaciones || '');
        }
    } catch (error) {
        console.error('Error cargando datos de edición:', error);
    }
}

async function manejarEnvio(e) {
    e.preventDefault();
    console.log('📤 Enviando formulario de reserva...');
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const session = getSession();

    // Validaciones básicas
    if (new Date(data.fecha_inicio) >= new Date(data.fecha_fin)) {
        alert('La fecha de salida debe ser posterior a la de entrada.');
        return;
    }

    const payload = {
        ...data,
        id_cliente: session.id_cliente || session.IDCliente || session.id,
        id_metodo_pago: 1, // Por defecto efectivo
        estado: 1 // Activa por defecto
    };

    console.log('📦 Payload a enviar:', payload);

    try {
        if (editId) {
            await actualizarReserva(editId, payload);
            alert('Reserva actualizada correctamente');
        } else {
            await crearReserva(payload);
            alert('Reserva creada con éxito');
        }
        window.location.href = 'reservas.html';
    } catch (error) {
        console.error('❌ Error al procesar reserva:', error);
        alert('Error al procesar la reserva: ' + error.message);
    }
}

init();
