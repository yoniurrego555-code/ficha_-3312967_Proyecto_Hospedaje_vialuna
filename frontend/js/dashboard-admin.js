import { logout } from "../dashboard/core/authGuard.js";

// Mapping of views to their respective modules
const modules = {
  'dashboard': () => import('../dashboard/dashboard.js').then(m => m.renderDashboard),
  'clientes': () => import('../dashboard/modules/clientes.js').then(m => m.renderClientes),
  'habitaciones': () => import('../dashboard/modules/habitaciones.js').then(m => m.renderHabitaciones),
  'servicios': () => import('../dashboard/modules/servicios.js').then(m => m.renderServicios),
  'paquetes': () => import('../dashboard/modules/paquetes.js').then(m => m.renderPaquetes),
  'pagos': () => import('../dashboard/modules/pagos.js').then(m => m.renderPagos),
  'reservas': () => import('../dashboard/modules/reservas-admin.js').then(m => m.renderReservas),
  'roles-permisos': () => import('../dashboard/modules/roles-permisos.js').then(m => m.renderRolesPermisos)
};

export async function cargarVista(vista) {
  const container = document.getElementById("contenido");
  if (!container) return;

  try {
    // 1. Fetch the HTML partial
    const response = await fetch(`../public/${vista}.html`);
    if (!response.ok) throw new Error('Vista no encontrada');
    const html = await response.text();
    
    // 2. Inject HTML
    container.innerHTML = html;

    // 3. Update active nav link
    document.querySelectorAll('.admin-link').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-view') === vista) {
        link.classList.add('active');
      }
    });

    // 4. Initialize module if it exists
    if (modules[vista]) {
      const renderFn = await modules[vista]();
      // Notice: The previous modules replaced the container's innerHTML by calling getTemplate().
      // To prevent them from overwriting the fetched HTML, they need to be refactored to NOT overwrite container.innerHTML if it's already there, 
      // or we can let them overwrite for now and later refactor them.
      // Actually, since we extracted the HTML, we SHOULD refactor them to use the existing DOM!
      // But for backward compatibility while refactoring, let's just pass the container.
      await renderFn(container);
    }

  } catch (error) {
    console.error(`Error cargando la vista ${vista}:`, error);
    container.innerHTML = `
      <div class="error-container">
        <h2>Error 404</h2>
        <p>No se pudo cargar la vista solicitada.</p>
      </div>
    `;
  }
}

// Inicializar SPA
document.addEventListener('DOMContentLoaded', () => {
  // Manejar clics de navegación
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-view]')) {
      e.preventDefault();
      const vista = e.target.getAttribute('data-view');
      window.location.hash = vista;
    }
  });

  // Escuchar cambios en el hash
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1) || 'dashboard';
    const vista = hash.split('?')[0];
    cargarVista(vista);
  });

  // Botón de logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }

  const hashInicial = window.location.hash.slice(1) || 'dashboard';
  const vistaInicial = hashInicial.split('?')[0];
  cargarVista(vistaInicial);
});

window.cargarVista = cargarVista;
