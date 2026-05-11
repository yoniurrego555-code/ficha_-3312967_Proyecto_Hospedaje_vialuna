import { logout, isClientSession, isAdminSession, getSession } from "../../dashboard/core/authGuard.js";
import { getReservas } from "../../dashboard/core/api.js";

console.log('📡 dashboardCliente.js detectado');

async function init() {
    console.log('🚀 Inicializando Dashboard Cliente...');

    try {
        // 1. Verificar autenticación y rol
        const session = getSession();
        const token = localStorage.getItem('vialuna_token');

        console.log('📊 Estado de la sesión:', { 
            haySesion: !!session, 
            hayToken: !!token, 
            rol: session?.rol || session?.IDRol || 'N/A' 
        });

        if (!session || !token) {
            console.warn('⚠️ No hay sesión activa, redirigiendo a login...');
            window.location.href = '../pages/login.html';
            return;
        }

        if (isAdminSession(session)) {
            console.warn('⚠️ Usuario es admin, redirigiendo a panel administrativo...');
            window.location.href = '../pages/dashboard-admin.html';
            return;
        }

        if (!isClientSession(session)) {
            console.error('❌ Acceso denegado: el usuario no tiene rol de cliente');
            alert('Acceso denegado. No tienes permisos de cliente.');
            window.location.href = '../pages/login.html';
            return;
        }

        // 2. Mostrar información del usuario
        const userName = session.NombreCompleto || session.Nombres || session.Nombre || 'Cliente';
        const displayElem = document.getElementById('userNameDisplay');
        const welcomeElem = document.getElementById('welcomeName');

        if (displayElem) displayElem.textContent = userName;
        if (welcomeElem) welcomeElem.textContent = userName;

        // 3. Cargar datos del Dashboard
        const idCliente = session.id_cliente || session.IDCliente || session.id;
        if (idCliente) {
            await cargarDatosDashboard(idCliente);
        } else {
            console.error('❌ No se encontró ID de cliente en la sesión:', session);
        }

        // 4. Configurar Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                logout();
            });
        }

        // 5. Fecha actual
        const dateElem = document.getElementById('currentDate');
        if (dateElem) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateElem.textContent = new Date().toLocaleDateString('es-ES', options);
        }

    } catch (error) {
        console.error('❌ Error crítico en la inicialización:', error);
    }
}

async function cargarDatosDashboard(idCliente) {
    try {
        console.log(`📥 Cargando reservas para cliente ID: ${idCliente}`);
        const reservas = await getReservas({ id_cliente: idCliente });
        console.log('📋 Reservas obtenidas:', reservas);

        if (!Array.isArray(reservas)) {
            console.error('La respuesta de reservas no es un array:', reservas);
            return;
        }

        // Calcular Métricas
        const total = reservas.length;
        const activas = reservas.filter(r => String(r.Estado) == '1' || r.Estado == 'activa' || r.Estado == 'confirmada').length;
        const finalizadas = reservas.filter(r => String(r.Estado) == '2' || r.Estado == 'completada').length;
        const pendientes = reservas.filter(r => r.Estado == 'pendiente' || String(r.Estado) == '0').length;

        // Actualizar UI Métricas
        const updateMetric = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        updateMetric('totalReservas', total);
        updateMetric('reservasActivas', activas);
        updateMetric('reservasFinalizadas', finalizadas);
        updateMetric('reservasPendientes', pendientes);

        // Renderizar Tabla Reciente
        renderizarTablaReciente(reservas.slice(0, 5));

        // Encontrar próxima reserva
        const proxima = reservas
            .filter(r => new Date(r.fecha_inicio) >= new Date())
            .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))[0];

        renderizarProximaReserva(proxima);

    } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
    }
}

function renderizarTablaReciente(reservas) {
    const tbody = document.getElementById('recentReservationsTable');
    if (!tbody) return;

    if (reservas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No tienes reservas registradas.</td></tr>';
        return;
    }

    tbody.innerHTML = reservas.map(r => `
        <tr>
            <td>#${r.id_reserva || r.IDReserva}</td>
            <td>Hab. ${r.id_habitacion || r.IDHabitacion || 'N/A'}</td>
            <td>${r.fecha_inicio || r.FechaInicio}</td>
            <td>${r.fecha_fin || r.FechaFin}</td>
            <td><span class="status-badge ${getStatusClass(r.Estado)}">${getStatusText(r.Estado)}</span></td>
            <td>$${Number(r.total || r.Total || 0).toLocaleString('es-CO')}</td>
        </tr>
    `).join('');
}

function renderizarProximaReserva(reserva) {
    const container = document.getElementById('nextReservationCard');
    if (!container) return;

    if (!reserva) {
        container.innerHTML = '<p class="empty-msg">No tienes reservas próximas programadas.</p>';
        return;
    }

    container.innerHTML = `
        <div class="reservation-highlight">
            <h4>Habitación #${reserva.id_habitacion || reserva.IDHabitacion}</h4>
            <div class="reservation-details">
                <p>📅 <strong>Desde:</strong> ${reserva.fecha_inicio || reserva.FechaInicio}</p>
                <p>📅 <strong>Hasta:</strong> ${reserva.fecha_fin || reserva.FechaFin}</p>
                <p>💰 <strong>Total:</strong> $${Number(reserva.total || reserva.Total || 0).toLocaleString('es-CO')}</p>
                <p>🏷️ <strong>Estado:</strong> ${getStatusText(reserva.Estado)}</p>
            </div>
            <a href="reservas.html" class="btn-primary" style="margin-top:15px; display:inline-block; text-decoration:none; padding:10px 20px; font-size:0.9rem;">
                Ver Detalles
            </a>
        </div>
    `;
}

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

// Ejecutar inicialización
init();
