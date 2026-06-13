import { getSession } from "../../dashboard/core/api.js";
import { isClientSession, logout } from "../../dashboard/core/authGuard.js";

// Módulos
const modules = {
    'inicio': () => import('./dashboardCliente.js').then(m => m.renderInicio),
    'habitaciones': () => import('./catalogoCliente.js').then(m => m.renderHabitaciones),
    'paquetes': () => import('./catalogoCliente.js').then(m => m.renderPaquetes),
    'servicios': () => import('./catalogoCliente.js').then(m => m.renderServicios),
    'reservas': () => import('./reservasCliente.js').then(m => m.renderReservas),
    'perfil': () => import('./perfilCliente.js').then(m => m.renderPerfilCliente),
    'reservar': () => import('./reservarCliente.js').then(m => m.renderNuevaReserva)
};

// Vistas HTML
const htmlTemplates = {
    'inicio': () => fetch('vistas/inicio.html').then(r => r.text()),
    'habitaciones': () => fetch('vistas/habitaciones.html').then(r => r.text()),
    'paquetes': () => fetch('vistas/paquetes.html').then(r => r.text()),
    'servicios': () => fetch('vistas/servicios.html').then(r => r.text()),
    'reservas': () => fetch('vistas/reservas.html').then(r => r.text()),
    'perfil': () => fetch('vistas/perfil.html').then(r => r.text()),
    'reservar': () => fetch('vistas/reservar.html').then(r => r.text())
};

// Cargar vista
export async function cargarVista(vista) {
    const container = document.getElementById("contenido");
    if (!container) return;

    try {
        const template = htmlTemplates[vista];
        if (!template) throw new Error(`Vista no encontrada: ${vista}`);

        const html = await template();
        container.innerHTML = html;

        // Active state en sidebar
        document.querySelectorAll('.cliente-nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-view') === vista) {
                link.classList.add('active');
            }
        });

        // Inicializar script de la vista si existe
        if (modules[vista]) {
            const renderFn = await modules[vista]();
            if (renderFn) await renderFn();
        }

    } catch (error) {
        console.error(`Error cargando la vista ${vista}:`, error);
        container.innerHTML = `
            <div class="empty-state">
                <h2>Ocurrió un error</h2>
                <p>No se pudo cargar la vista solicitada.</p>
            </div>
        `;
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Autenticación básica
    const session = getSession();
    if (!session || !isClientSession(session)) {
        window.location.href = '../auth/login.html';
        return;
    }

    // Llenar datos de usuario en el sidebar
    const userName = session.nombre || session.NombreCompleto || session.Nombres || session.Nombre || 'Cliente';
    const displayElem = document.getElementById('userNameDisplay');
    const initialElem = document.getElementById('userInitial');
    if (displayElem) displayElem.textContent = userName;
    if (initialElem) initialElem.textContent = userName.trim().charAt(0).toUpperCase() || 'V';

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // Sidebar Toggle Mobile
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function toggleSidebar() {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }

    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    // Navegación por data-view
    document.addEventListener('click', (e) => {
        const link = e.target.closest('[data-view]');
        if (link) {
            e.preventDefault();
            const vista = link.getAttribute('data-view');
            // If the link has href with query params, keep them in hash
            const href = link.getAttribute('href');
            if (href && href.includes('?')) {
                window.location.hash = href.substring(1); // remove '#'
            } else {
                window.location.hash = vista;
            }
            if (window.innerWidth <= 1024) closeSidebar();
        }
    });

    // Hash change
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.slice(1) || 'inicio';
        const vista = hash.split('?')[0]; // Ignorar parámetros de la URL para la carga de plantilla
        cargarVista(vista);
    });

    // Carga inicial
    const initialHash = window.location.hash.slice(1) || 'inicio';
    const initialView = initialHash.split('?')[0];
    cargarVista(initialView);
});
