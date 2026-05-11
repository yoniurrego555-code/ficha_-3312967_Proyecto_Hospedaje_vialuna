import { logout, isClientSession, getSession } from "../../dashboard/core/authGuard.js";
import { getReservas, cancelarReserva } from "../../dashboard/core/api.js";

console.log('📡 reservasCliente.js detectado');

let allReservas = [];

async function init() {
    console.log('🚀 Inicializando Mis Reservas...');

    try {
        const session = getSession();
        if (!session || !isClientSession(session)) {
            console.warn('⚠️ Sesión no válida para cliente, redirigiendo...');
            window.location.href = '../pages/login.html';
            return;
        }

        const userName = session.NombreCompleto || session.Nombres || session.Nombre || 'Cliente';
        const displayElem = document.getElementById('userNameDisplay');
        if (displayElem) displayElem.textContent = userName;

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', logout);

        const idCliente = session.id_cliente || session.IDCliente || session.id;
        if (idCliente) {
            await cargarReservas(idCliente);
        } else {
            console.error('❌ No se encontró ID de cliente en la sesión');
        }

        // Configurar filtros
        const searchInput = document.getElementById('searchReservas');
        const filterSelect = document.getElementById('filterEstado');

        if (searchInput) searchInput.addEventListener('input', aplicarFiltros);
        if (filterSelect) filterSelect.addEventListener('change', aplicarFiltros);

    } catch (error) {
        console.error('❌ Error en init reservas:', error);
    }
}

async function cargarReservas(idCliente) {
    try {
        console.log(`📥 Cargando reservas para cliente ${idCliente}...`);
        allReservas = await getReservas({ id_cliente: idCliente });
        console.log('📋 Reservas:', allReservas);
        aplicarFiltros();
    } catch (error) {
        console.error('Error cargando reservas:', error);
        const tbody = document.getElementById('reservasTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center">Error al cargar los datos.</td></tr>';
    }
}

function aplicarFiltros() {
    const searchElem = document.getElementById('searchReservas');
    const filterElem = document.getElementById('filterEstado');
    
    const searchTerm = searchElem ? searchElem.value.toLowerCase() : '';
    const estadoFilter = filterElem ? filterElem.value : '';

    const filtradas = allReservas.filter(r => {
        const id = String(r.id_reserva || r.IDReserva || '');
        const hab = String(r.id_habitacion || r.IDHabitacion || '');
        const estado = String(r.Estado || '');

        const matchesSearch = id.includes(searchTerm) || hab.includes(searchTerm);
        const matchesEstado = estadoFilter === "" || estado === estadoFilter;

        return matchesSearch && matchesEstado;
    });

    renderizarTabla(filtradas);
}

function renderizarTabla(reservas) {
    const tbody = document.getElementById('reservasTableBody');
    if (!tbody) return;

    if (reservas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No se encontraron reservas.</td></tr>';
        return;
    }

    tbody.innerHTML = reservas.map(r => `
        <tr>
            <td>#${r.id_reserva || r.IDReserva}</td>
            <td>Habitación ${r.id_habitacion || r.IDHabitacion}</td>
            <td>${r.fecha_inicio || r.FechaInicio}</td>
            <td>${r.fecha_fin || r.FechaFin}</td>
            <td><span class="status-badge ${getStatusClass(r.Estado)}">${getStatusText(r.Estado)}</span></td>
            <td>$${Number(r.total || r.Total || 0).toLocaleString('es-CO')}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view-btn" onclick="verDetalle(${r.id_reserva || r.IDReserva})">👁️</button>
                    ${(r.Estado == 1 || String(r.Estado).toLowerCase() == 'activa') ? `
                        <button class="action-btn edit-btn" onclick="editarReserva(${r.id_reserva || r.IDReserva})">✏️</button>
                        <button class="action-btn delete-btn" onclick="cancelar(${r.id_reserva || r.IDReserva})">🚫</button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

window.verDetalle = (id) => {
    alert(`Detalle de la reserva #${id} (Funcionalidad en desarrollo)`);
};

window.editarReserva = (id) => {
    window.location.href = `nueva-reserva.html?id=${id}`;
};

window.cancelar = async (id) => {
    if (confirm(`¿Estás seguro de que deseas cancelar la reserva #${id}?`)) {
        try {
            await cancelarReserva(id);
            alert('Reserva cancelada correctamente');
            location.reload();
        } catch (error) {
            alert('Error al cancelar: ' + error.message);
        }
    }
};

function getStatusClass(estado) {
    const s = String(estado || '').toLowerCase();
    const statusMap = {
        '1': 'status-active',
        '2': 'status-completed',
        '3': 'status-cancelled',
        'activa': 'status-active',
        'confirmada': 'status-active',
        'completada': 'status-completed',
        'cancelada': 'status-cancelled',
        'pendiente': 'status-pending'
    };
    return statusMap[s] || 'status-active';
}

function getStatusText(estado) {
    const s = String(estado || '').toLowerCase();
    const statusMap = {
        '1': 'Activa',
        '2': 'Finalizada',
        '3': 'Cancelada',
        'activa': 'Activa',
        'confirmada': 'Activa',
        'completada': 'Finalizada',
        'cancelada': 'Cancelada',
        'pendiente': 'Pendiente'
    };
    return statusMap[s] || estado || 'N/A';
}

init();
