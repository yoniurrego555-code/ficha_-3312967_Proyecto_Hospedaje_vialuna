import { 
  getClientes, 
  getHabitaciones, 
  getPaquetes, 
  getServicios, 
  getReservas 
} from "../core/api.js";

// Importar todos los módulos
import { renderClientes } from "./clientes.js";
import { renderHabitaciones } from "./habitaciones.js";
import { renderServicios } from "./servicios.js";
import { renderPaquetes } from "./paquetes.js";
import { renderPagos } from "./pagos.js";
import { renderReservas } from "./reservas-admin.js";

// Dashboard module
export class DashboardModule {
  constructor(container) {
    this.container = container;
    this.currentData = {};
  }

  // Initialize dashboard
  async initialize() {
    try {
      const [clientes, habitaciones, paquetes, servicios, reservas] = await Promise.all([
        getClientes(),
        getHabitaciones(),
        getPaquetes(),
        getServicios(),
        getReservas()
      ]);

      console.log('Dashboard - Datos cargados:', {
        clientes: clientes.length,
        habitaciones: habitaciones.length,
        paquetes: paquetes.length,
        servicios: servicios.length,
        reservas: reservas.length
      });

      this.currentData = {
        clientes,
        habitaciones,
        paquetes,
        servicios,
        reservas
      };

      // Render dashboard content
      this.render();

      // Update metrics
      this.updateMetrics(clientes, habitaciones, paquetes, servicios, reservas);
      
      // Render recent reservations
      this.renderRecentReservationsTable();

      // Update current date
      this.updateCurrentDate();

    } catch (error) {
      console.error("Error cargando dashboard:", error);
      this.showError("Error al cargar el dashboard", "No se pudieron cargar los datos. Por favor, verifique la conexión con el servidor.");
    }
  }

  // Render dashboard template
  render() {
    this.container.innerHTML = this.getTemplate();
  }

  // Get dashboard template
  getTemplate() {
    return `
      <!-- Dashboard Header -->
      <header class="module-header">
        <div class="header-left">
          <h1>Dashboard</h1>
          <p>Panel de control del hotel</p>
        </div>
        <div class="header-right">
          <span id="currentDate" class="current-date"></span>
        </div>
      </header>

      <!-- Metrics Grid -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-title">Total Reservas</div>
            <div class="metric-icon blue">📋</div>
          </div>
          <div class="metric-value" id="totalReservations">0</div>
          <div class="metric-change">
            <span>📊</span> Total del sistema
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-title">Reservas Activas</div>
            <div class="metric-icon green">✅</div>
          </div>
          <div class="metric-value" id="activeReservations">0</div>
          <div class="metric-change positive">
            <span>↑</span> En curso
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-title">Habitaciones Ocupadas</div>
            <div class="metric-icon amber">🛏️</div>
          </div>
          <div class="metric-value" id="occupiedRooms">0</div>
          <div class="metric-change">
            <span>🏨</span> Ocupación actual
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-title">Ingresos Mensuales</div>
            <div class="metric-icon purple">💰</div>
          </div>
          <div class="metric-value" id="monthlyRevenue">$0</div>
          <div class="metric-change positive">
            <span>📈</span> Este mes
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-section">
        <div class="chart-container">
          <div class="chart-placeholder">
            <div class="chart-placeholder-icon">📊</div>
            <h3>Ingresos Mensuales</h3>
            <p>Gráfico de ingresos de los últimos 6 meses</p>
          </div>
        </div>
        <div class="chart-container">
          <div class="chart-placeholder">
            <div class="chart-placeholder-icon">📈</div>
            <h3>Tendencia de Reservas</h3>
            <p>Gráfico de reservas por semana</p>
          </div>
        </div>
      </div>

      <!-- Recent Reservations -->
      <div class="recent-reservations">
        <div class="table-card">
          <div class="table-header">
            <h3 class="table-title">Reservas Recientes</h3>
            <div class="table-actions">
              <button class="btn-secondary" onclick="window.location.href='#reservas'">
                <span>📋</span> Ver Todas
              </button>
            </div>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Habitación</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Estado</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody id="recentReservationsTable">
                <tr><td colspan="7" class="text-center">Cargando...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <div class="section-header">
          <h3>Accesos Rápidos</h3>
        </div>
        <div class="actions-grid">
          <div class="action-card" onclick="window.location.href='#reservas'">
            <div class="action-icon">📋</div>
            <div class="action-title">Ver Reservas</div>
            <div class="action-description">Gestionar todas las reservas</div>
          </div>
          <div class="action-card" onclick="window.location.href='#habitaciones'">
            <div class="action-icon">🏨</div>
            <div class="action-title">Habitaciones</div>
            <div class="action-description">Gestionar habitaciones</div>
          </div>
          <div class="action-card" onclick="window.location.href='#clientes'">
            <div class="action-icon">👥</div>
            <div class="action-title">Clientes</div>
            <div class="action-description">Ver lista de clientes</div>
          </div>
          <div class="action-card" onclick="window.location.href='#servicios'">
            <div class="action-icon">🔧</div>
            <div class="action-title">Servicios</div>
            <div class="action-description">Administrar servicios</div>
          </div>
        </div>
      </div>
    `;
  }

  // Update dashboard metrics
  updateMetrics(clientes, habitaciones, paquetes, servicios, reservas) {
    const today = new Date().toISOString().split('T')[0];
    const todayReservations = reservas.filter(r => r.fecha_inicio === today).length;
    const activeReservations = reservas.filter(r => {
      try {
        const status = String(r.EstadoNombre || r.estado_nombre || r.estado || '').toLowerCase();
        return !status.includes('cancel') && !status.includes('anul');
      } catch (e) {
        return true;
      }
    }).length;
    const occupiedRooms = activeReservations; // Simplified calculation
    const totalIncome = reservas.reduce((sum, r) => sum + Number(r.total || 0), 0);

    // Update DOM elements using container
    const elements = {
      totalReservations: this.container.querySelector("#totalReservations"),
      activeReservations: this.container.querySelector("#activeReservations"),
      occupiedRooms: this.container.querySelector("#occupiedRooms"),
      monthlyRevenue: this.container.querySelector("#monthlyRevenue")
    };

    if (elements.totalReservations) elements.totalReservations.textContent = reservas.length;
    if (elements.activeReservations) elements.activeReservations.textContent = activeReservations;
    if (elements.occupiedRooms) elements.occupiedRooms.textContent = occupiedRooms;
    if (elements.monthlyRevenue) elements.monthlyRevenue.textContent = `$${this.formatCurrency(totalIncome)}`;
  }

  // Render recent reservations table
  renderRecentReservationsTable() {
    const recentReservationsTable = this.container.querySelector("#recentReservationsTable");
    if (!recentReservationsTable) return;
    
    if (!this.currentData.reservas.length) {
      recentReservationsTable.innerHTML = '<tr><td colspan="7" class="text-center">No hay reservas registradas</td></tr>';
      return;
    }

    const recentReservations = this.currentData.reservas.slice(0, 5);
    
    recentReservationsTable.innerHTML = recentReservations.map(reserva => {
      const cliente = this.currentData.clientes.find(c => c.id_cliente == reserva.id_cliente);
      const habitacion = this.currentData.habitaciones.find(h => h.id_habitacion == reserva.id_habitacion);
      
      return `
        <tr>
          <td>#${reserva.id_reserva}</td>
          <td>${cliente ? (cliente.NombreCompleto || `${cliente.Nombres || ''} ${cliente.Apellidos || ''}`.trim() || 'Cliente sin nombre') : reserva.nr_documento || "Sin cliente"}</td>
          <td>${habitacion ? (habitacion.numero || habitacion.Numero || 'N/A') : "Sin habitación"}</td>
          <td>${reserva.fecha_inicio || "N/A"}</td>
          <td>${reserva.fecha_fin || "N/A"}</td>
          <td><span class="status-badge ${this.getStatusClass(reserva.Estado)}">${this.getStatusText(reserva.Estado)}</span></td>
          <td>$${this.formatCurrency(reserva.total || 0)}</td>
        </tr>
      `;
    }).join('');
  }

  // Helper functions
  formatCurrency(value) {
    return Number(value || 0).toLocaleString("es-CO");
  }

  getStatusClass(estado) {
    const statusMap = {
      '1': 'status-active',
      '2': 'status-completed',
      '3': 'status-cancelled',
      'activo': 'status-active',
      'completada': 'status-completed',
      'cancelada': 'status-cancelled',
      'active': 'status-active',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled'
    };
    return statusMap[String(estado).toLowerCase()] || 'status-active';
  }

  getStatusText(estado) {
    const statusMap = {
      '1': 'Activa',
      '2': 'Completada',
      '3': 'Cancelada',
      'activo': 'Activa',
      'completada': 'Completada',
      'cancelada': 'Cancelada',
      'active': 'Activa',
      'completed': 'Completada',
      'cancelled': 'Cancelada'
    };
    return statusMap[String(estado).toLowerCase()] || 'Activa';
  }

  // Update current date
  updateCurrentDate() {
    const dateEl = this.container.querySelector("#currentDate");
    if (dateEl) {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      dateEl.textContent = new Date().toLocaleDateString('es-ES', options);
    }
  }

  // Show error message
  showError(title, message) {
    this.container.innerHTML = `
      <div class="error-container">
        <div class="error-card">
          <h2>${title}</h2>
          <p>${message}</p>
          <button onclick="location.reload()" class="btn-primary">
            Recargar página
          </button>
        </div>
      </div>
    `;
  }
}

// Sistema de rutas SPA
const routes = {
  dashboard: renderDashboard,
  clientes: renderClientes,
  habitaciones: renderHabitaciones,
  servicios: renderServicios,
  paquetes: renderPaquetes,
  pagos: renderPagos,
  reservas: renderReservas
};

// Función de navegación
export function navigate(view) {
  const container = document.querySelector("#app-content");
  if (container && routes[view]) {
    console.log(`Navegando a: ${view}`);
    try {
      routes[view](container);
    } catch (error) {
      console.error(`Error al navegar a ${view}:`, error);
      // Mostrar error en lugar de redirigir al dashboard
      container.innerHTML = `
        <div style="text-align: center; padding: 50px;">
          <h2>Error al cargar la vista</h2>
          <p>No se pudo cargar el módulo de ${view}. Error: ${error.message}</p>
          <button onclick="window.navigate('dashboard')" style="padding: 10px 20px; background: #000; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
            Volver al Dashboard
          </button>
          <button onclick="window.navigate('${view}')" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Reintentar
          </button>
        </div>
      `;
    }
  } else {
    console.error(`Ruta no encontrada: ${view}`);
    container.innerHTML = `
      <div style="text-align: center; padding: 50px;">
        <h2>Ruta no encontrada</h2>
        <p>La vista "${view}" no existe.</p>
        <button onclick="window.navigate('dashboard')" style="padding: 10px 20px; background: #000; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Volver al Dashboard
        </button>
      </div>
    `;
  }
}

// Export function for SPA integration
export function renderDashboard(container) {
  window.dashboardModule = new DashboardModule(container);
  window.dashboardModule.initialize();
}

// Inicializar navegación SPA
document.addEventListener('DOMContentLoaded', () => {
  // Event listeners para navegación
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-view]')) {
      e.preventDefault();
      const view = e.target.getAttribute('data-view');
      navigate(view);
    }
  });

  // Botón de logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("usuario");
      localStorage.removeItem("token");
      window.location.href = "/login.html";
    });
  }

  // Cargar vista inicial
  const hash = window.location.hash.slice(1) || 'dashboard';
  navigate(hash);
});
