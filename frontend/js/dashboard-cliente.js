import { logout, isClientSession, isAdminSession } from "../dashboard/core/authGuard.js";
import { getSession } from "../dashboard/core/api.js";

console.log('dashboard-cliente.js cargado');

// Verificar autenticación al cargar
function verificarAutenticacion() {
  console.log('🔍 Verificando autenticación para cliente...');

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

  // Si es admin, redirigir al dashboard admin
  if (isAdminSession(session)) {
    console.log('⚠️ Usuario es admin, redirigiendo al dashboard de admin');
    window.location.href = '../pages/dashboard-admin.html';
    return false;
  }

  // Si no es cliente ni admin, redirigir al login
  if (!isClientSession(session)) {
    console.log('❌ Usuario no es cliente ni admin, redirigiendo a login');
    window.location.href = '../pages/login.html';
    return false;
  }

  console.log('✅ Autenticación exitosa para cliente');
  return true;
}

// Mapping of views to their respective modules for the client dashboard
const modules = {
  'dashboard': () => import('../dashboard/dashboard.js').then(m => m.renderDashboard), // or a client-specific dashboard module
  'reservas': () => import('../dashboard/modules/reservas-admin.js').then(m => m.renderReservas), // TODO: create a client specific reservations module
  'nueva-reserva': () => import('../dashboard/modules/reservas-admin.js').then(m => m.renderReservas) // Reuse admin module but hide client selection
};

// Mapping of HTML templates
const htmlTemplates = {
  'dashboard': () => fetch('../public/dashboard.html').then(r => r.text()),
  'reservas': () => fetch('../public/reservas.html').then(r => r.text()),
  'nueva-reserva': () => fetch('../public/reservas.html').then(r => r.text())
};

export async function cargarVista(vista) {
  const container = document.getElementById("contenido");
  if (!container) return;

  try {
    // 1. Fetch the HTML partial
    // For now, reuse the same partials. For a real app, you might have specific partials for clients.
    const html = await htmlTemplates[vista]();
    
    // 2. Inject HTML
    container.innerHTML = html;

    // 3. Hide client selection for nueva-reserva view
    if (vista === 'nueva-reserva') {
      // Hide the reservations list section and show only the form
      const listSection = document.getElementById('reservationsListSection');
      const formSection = document.getElementById('reservationFormSection');
      const clientSelect = document.getElementById('clienteSelect');
      const documentoInput = document.getElementById('documentoInput');
      
      if (listSection) listSection.style.display = 'none';
      if (formSection) formSection.style.display = 'block';
      if (clientSelect) {
        clientSelect.parentElement.style.display = 'none';
        clientSelect.required = false;
      }
      if (documentoInput) {
        documentoInput.parentElement.style.display = 'none';
      }
      
      // Add cancel button handler
      const cancelBtn = document.getElementById('cancelNewReservationBtn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          window.location.hash = 'reservas';
        });
      }
    }

    // 4. Update active nav link
    document.querySelectorAll('.sidebar__nav a').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-view') === vista) {
        link.classList.add('active');
      }
    });

    // 5. Initialize module if it exists
    if (modules[vista]) {
      try {
        const renderFn = await modules[vista]();
        await renderFn(container);
      } catch (moduleError) {
        console.error('Error ejecutando módulo:', moduleError);
        // No mostrar error, solo dejar el HTML cargado
      }
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
  console.log('🚀 Inicializando dashboard cliente...');

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
