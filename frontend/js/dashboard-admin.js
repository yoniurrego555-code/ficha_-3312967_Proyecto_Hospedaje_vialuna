import { logout, isAdminSession } from "../dashboard/core/authGuard.js";
import { getSession } from "../dashboard/core/api.js";

console.log('dashboard-admin.js cargado');

// Verificar autenticación al cargar
function verificarAutenticacion() {
  console.log('🔍 Verificando autenticación...');

  const session = getSession();
  const token = localStorage.getItem('vialuna_token');

  console.log('📋 Sesión obtenida:', session);
  console.log('🔑 Token obtenido:', token ? 'Presente' : 'Ausente');

  if (!session) {
    console.log('❌ No hay sesión guardada, redirigiendo a login');
    window.location.href = '../pages/login.html';
    return false;
  }

  if (!token) {
    console.log('❌ No hay token guardado, redirigiendo a login');
    window.location.href = '../pages/login.html';
    return false;
  }

  if (!isAdminSession(session)) {
    console.log('❌ Usuario no es admin, redirigiendo al dashboard de cliente');
    window.location.href = '../cliente/dashboard.html';
    return false;
  }

  console.log('✅ Autenticación exitosa para admin');
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
  'dashboard': () => fetch('../public/dashboard.html').then(r => r.text()),
  'clientes': () => fetch('../public/clientes.html').then(r => r.text()),
  'habitaciones': () => fetch('../public/habitaciones.html').then(r => r.text()),
  'servicios': () => fetch('../public/servicios.html').then(r => r.text()),
  'paquetes': () => fetch('../public/paquetes.html').then(r => r.text()),
  'pagos': () => fetch('../public/pagos.html').then(r => r.text()),
  'reservas': () => fetch('../public/reservas.html').then(r => r.text()),
  'roles-permisos': () => fetch('../public/roles-permisos.html').then(r => r.text()),
  'usuarios': () => fetch('../public/usuarios.html').then(r => r.text())
};

export async function cargarVista(vista) {
  console.log('🔄 cargarVista llamado con:', vista);
  const container = document.getElementById("contenido");
  console.log('📦 Contenedor encontrado:', container);

  if (!container) {
    console.error('❌ Contenedor "contenido" no encontrado');
    return;
  }

  try {
    // 1. Fetch the HTML partial
    console.log('🔄 Cargando HTML para vista:', vista);
    const template = htmlTemplates[vista];
    if (!template) {
      throw new Error(`Template no definido para vista: ${vista}`);
    }

    const html = typeof template === 'function' ? await template() : template;
    console.log('📄 HTML recibido, longitud:', html.length);

    if (!html || html.trim().length === 0) {
      throw new Error('HTML recibido está vacío');
    }

    // 2. Inject HTML
    container.innerHTML = html;
    console.log('✅ HTML inyectado en contenedor');

    // 3. Update active nav link
    document.querySelectorAll('.admin-link').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-view') === vista) {
        link.classList.add('active');
      }
    });

    // 4. Initialize module if it exists
    if (modules[vista]) {
      console.log('🔧 Inicializando módulo para vista:', vista);
      try {
        const renderFn = await modules[vista]();
        console.log('🎯 Función render obtenida');
        await renderFn(container);
        console.log('✅ Módulo inicializado correctamente');
      } catch (moduleError) {
        console.error('❌ Error ejecutando módulo:', moduleError);
        // No mostrar error, solo dejar el HTML cargado
      }
    } else {
      console.log('ℹ️ No hay módulo para vista:', vista);
    }

  } catch (error) {
    console.error(`❌ Error cargando la vista ${vista}:`, error);
    container.innerHTML = `
      <div class="error-container">
        <h2>Error 404</h2>
        <p>No se pudo cargar la vista solicitada: ${error.message}</p>
        <p>Vista: ${vista}</p>
      </div>
    `;
  }
}

// Inicializar SPA
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Inicializando dashboard admin...');

  // Verificar autenticación primero
  if (!verificarAutenticacion()) {
    return; // Detener si no está autenticado
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

  // Sidebar Toggle Functionality
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  
  console.log('🔍 Sidebar elements found:');
  console.log('  - sidebarToggle:', sidebarToggle);
  console.log('  - sidebar:', sidebar);
  console.log('  - sidebarOverlay:', sidebarOverlay);
  
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
      // Desktop behavior
      const isCollapsed = sidebar.classList.contains('collapsed');
      if (isCollapsed) {
        sidebar.classList.remove('collapsed');
        sidebarToggle.classList.remove('active'); // active means crossed (X) for hamburger icon if we want
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
  
  // Event listeners for sidebar toggle
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', toggleSidebar);
  }
  
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
  }
  
  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
        closeSidebar();
      }
    }
  });
  
  // Handle window resize
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
