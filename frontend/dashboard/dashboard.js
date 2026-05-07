import { 
  getClientes, 
  getHabitaciones, 
  getPaquetes, 
  getServicios, 
  getReservas 
} from "./core/api.js";
import { logout } from "./core/authGuard.js";

// Importar todos los módulos
import { renderClientes } from "./modules/clientes.js";
import { renderHabitaciones } from "./modules/habitaciones.js";
import { renderServicios } from "./modules/servicios.js";
import { renderPaquetes } from "./modules/paquetes.js";
import { renderPagos } from "./modules/pagos.js";
import { renderReservas } from "./modules/reservas-admin.js";
import { renderRolesPermisos } from "./modules/roles-permisos.js";

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

  render() {
    // Render solo actualiza las tablas ya que el HTML base se cargó previamente
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

// Export function for SPA integration
export function renderDashboard(container) {
  window.dashboardModule = new DashboardModule(container);
  window.dashboardModule.initialize();
}
