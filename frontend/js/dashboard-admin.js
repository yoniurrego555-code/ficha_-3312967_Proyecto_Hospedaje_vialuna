import { logout, isAdminSession } from "../dashboard/core/authGuard.js";
import { getSession } from "../dashboard/core/api.js";

// Verificar autenticación al cargar
function verificarAutenticacion() {
  const session = getSession();
  const token = sessionStorage.getItem('vialuna_token');

  if (!session) {
    window.location.href = '../auth/login.html';
    return false;
  }

  if (!token) {
    window.location.href = '../auth/login.html';
    return false;
  }

  if (!isAdminSession(session)) {
    window.location.href = '../cliente/dashboard.html';
    return false;
  }

  return true;
}

// Mapping of views to their respective modules
const modules = {
  'dashboard': () => import('../dashboard/dashboard.js').then(m => m.renderDashboard),
  'clientes': () => import('../dashboard/modules/clientes.js').then(m => m.renderClientes),
  'habitaciones': () => import('../dashboard/modules/habitaciones.js').then(m => m.renderHabitaciones),
  'servicios': () => import('../dashboard/modules/servicios.js').then(m => m.renderServicios),
  'paquetes': () => import('../dashboard/modules/paquetes.js').then(m => m.renderPaquetes),
  'pagos': () => import('../dashboard/modules/pagos.js').then(m => m.renderPagos),
  'reservas': () => import('../dashboard/modules/reservas-admin.js').then(m => m.renderReservas),
  'roles-permisos': () => import('../dashboard/modules/roles-permisos.js').then(m => m.renderRolesPermisos),
  'usuarios': () => import('../dashboard/modules/usuarios.js').then(m => m.renderUsuarios)
};

// HTML templates mapping (fetching from external files)
const htmlTemplates = {
  'dashboard': () => fetch('../admin/dashboard.html').then(r => r.text()),
  'clientes': () => fetch('../admin/clientes.html').then(r => r.text()),
  'habitaciones': () => fetch('../admin/habitaciones.html').then(r => r.text()),
  'servicios': () => fetch('../admin/servicios.html').then(r => r.text()),
  'paquetes': () => fetch('../admin/paquetes.html').then(r => r.text()),
  'pagos': () => fetch('../admin/pagos.html').then(r => r.text()),
  'reservas': () => fetch('../admin/reservas.html').then(r => r.text()),
  'roles-permisos': () => fetch('../admin/roles-permisos.html').then(r => r.text()),
  'usuarios': () => fetch('../admin/usuarios.html').then(r => r.text())
};

export async function cargarVista(vista) {
  const container = document.getElementById("contenido");

  if (!container) {
    console.error('Contenedor "contenido" no encontrado');
    return;
  }

  try {
    const template = htmlTemplates[vista];
    if (!template) {
      throw new Error(`Template no definido para vista: ${vista}`);
    }

    const html = typeof template === 'function' ? await template() : template;

    if (!html || html.trim().length === 0) {
      throw new Error('HTML recibido está vacío');
    }

    // Inyectar HTML
    container.innerHTML = html;

    // Actualizar nav activo
    document.querySelectorAll('.admin-link').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-view') === vista) {
        link.classList.add('active');
      }
    });

    // Inicializar módulo si existe
    if (modules[vista]) {
      try {
        const renderFn = await modules[vista]();
        await renderFn(container);
      } catch (moduleError) {
        console.error('❌ Error ejecutando módulo:', moduleError);
        // No bloquear el dashboard, el HTML ya está cargado
      }
    }

  } catch (error) {
    console.error(`❌ Error cargando la vista ${vista}:`, error);
    container.innerHTML = `
      <div class="error-container">
        <h2>Error al cargar</h2>
        <p>No se pudo cargar la vista solicitada: ${error.message}</p>
      </div>
    `;
  }
}

// Inicializar SPA
document.addEventListener('DOMContentLoaded', () => {
  // Verificar autenticación primero
  if (!verificarAutenticacion()) {
    return;
  }

  // Manejar clics de navegación
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-view]')) {
      e.preventDefault();
      const vista = e.target.getAttribute('data-view');
      window.location.hash = vista;
    }
  });

  // Manejar cambio de hash y carga inicial
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1) || 'dashboard';
    const vista = hash.split('?')[0];
    cargarVista(vista);
  });

  const initialHash = window.location.hash.slice(1) || 'dashboard';
  const initialView = initialHash.split('?')[0];
  cargarVista(initialView);

  // Sidebar Toggle
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  function toggleSidebar() {
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      const isActive = sidebar.classList.contains('active');
      if (isActive) {
        sidebar.classList.remove('active');
        sidebarToggle.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
      } else {
        sidebar.classList.add('active');
        sidebarToggle.classList.add('active');
        sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    } else {
      const isCollapsed = sidebar.classList.contains('collapsed');
      if (isCollapsed) {
        sidebar.classList.remove('collapsed');
        sidebarToggle.classList.remove('active');
      } else {
        sidebar.classList.add('collapsed');
        sidebarToggle.classList.add('active');
      }
    }
  }

  function closeSidebar() {
    sidebar.classList.remove('active');
    sidebarToggle.classList.remove('active');
    sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', toggleSidebar);
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
  }

  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      if (sidebar && sidebarToggle && !sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
        closeSidebar();
      }
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      closeSidebar();
    }
  });

  // Botón de logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  window.cargarVista = cargarVista;
});
