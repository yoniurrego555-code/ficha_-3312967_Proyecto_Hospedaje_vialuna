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
    console.log('📊 Inicializando DashboardModule...');
    try {
      console.log('🔄 Cargando datos desde API...');
      const [clientes, habitaciones, paquetes, servicios, reservas] = await Promise.all([
        getClientes(),
        getHabitaciones(),
        getPaquetes(),
        getServicios(),
        getReservas()
      ]);

      console.log('✅ Datos cargados:', {
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
      const status = String(reserva.Estado || reserva.estado || '1');
      
      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 32px; height: 32px; background: rgba(61, 124, 98, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--brand-deep); font-weight: 700; font-size: 0.8rem;">
                ${cliente ? (cliente.NombreCompleto || cliente.Nombres || 'C').charAt(0).toUpperCase() : 'C'}
              </div>
              <div>
                <div style="font-weight: 600; font-size: 0.9rem;">${cliente ? (cliente.NombreCompleto || `${cliente.Nombres || ''} ${cliente.Apellidos || ''}`.trim() || 'Cliente sin nombre') : reserva.nr_documento || "Sin cliente"}</div>
                <div style="font-size: 0.75rem; color: var(--muted);">${cliente ? cliente.Email : ''}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="status-pill pill-info" style="font-size: 0.75rem;">${habitacion ? (habitacion.numero || habitacion.Numero || 'N/A') : "---"}</span>
          </td>
          <td style="font-size: 0.85rem;">${reserva.fecha_inicio || "N/A"}</td>
          <td style="font-size: 0.85rem;">${reserva.fecha_fin || "N/A"}</td>
          <td>
            <div class="status-toggle-wrapper">
              <label class="switch">
                <input type="checkbox" ${status == '1' ? 'checked' : ''} 
                       ${status == '3' ? 'disabled' : ''}
                       onchange="const resId = ${reserva.id_reserva || reserva.IDReserva || reserva.IdReserva || reserva.id || 'null'}; if(resId) window.dashboardModule.changeStatusFromTable(resId, this.checked ? 1 : 2)">
                <span class="slider"></span>
              </label>
              <span class="status-pill ${status == '1' ? 'pill-active' : status == '2' ? 'pill-inactive' : 'pill-info'}">
                ${this.getStatusText(status)}
              </span>
            </div>
          </td>
          <td style="font-weight: 700; color: var(--brand);">$${this.formatCurrency(reserva.total || 0)}</td>
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
      '2': 'Cancelada',
      '3': 'Finalizada',
      'activo': 'Activa',
      'completada': 'Finalizada',
      'finalizada': 'Finalizada',
      'cancelada': 'Cancelada'
    };
    return statusMap[String(estado).toLowerCase()] || estado || 'Desconocido';
  }

  // Update current date
  updateCurrentDate() {
    const dateEl = this.container.querySelector("#currentDate");
    if (dateEl) {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      dateEl.textContent = new Date().toLocaleDateString('es-ES', options);
    }
  }

  // Change status directly from table
  async changeStatusFromTable(id, newStatus) {
    try {
      const { actualizarReserva, getReservas } = await import("./core/api.js");
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('ID de reserva no válido');
      }
      
      const reserva = this.currentData.reservas.find(r => (r.id_reserva || r.IDReserva || r.IdReserva || r.id) == id);
      if (!reserva) throw new Error('Reserva no encontrada localmente');

      console.log(`[Dashboard] Cambiando estado de reserva ${id} a ${newStatus}`);
      
      const formData = {
        id_cliente: reserva.id_cliente || reserva.IDCliente || (reserva.cliente ? reserva.cliente.id : null),
        id_habitacion: reserva.id_habitacion || reserva.IDHabitacion || (reserva.habitacion ? reserva.habitacion.id : null),
        fecha_inicio: reserva.fecha_inicio || reserva.FechaInicio,
        fecha_fin: reserva.fecha_fin || reserva.FechaFin,
        hora_entrada: reserva.hora_entrada || reserva.HoraEntrada || '14:00',
        hora_salida: reserva.hora_salida || reserva.HoraSalida || '12:00',
        id_metodo_pago: reserva.id_metodo_pago || reserva.IDMetodoPago || (reserva.metodoPago ? reserva.metodoPago.id : 1),
        id_estado_reserva: parseInt(newStatus),
        total: reserva.total || reserva.Total
      };

      await actualizarReserva(id, formData);
      
      // Recargar datos y re-renderizar la vista actual
      const nuevasReservas = await getReservas();
      this.currentData.reservas = nuevasReservas;
      
      this.updateMetrics(this.currentData.clientes, this.currentData.habitaciones, this.currentData.paquetes, this.currentData.servicios, nuevasReservas);
      this.renderRecentReservationsTable();
      
      console.log('Estado actualizado correctamente en Dashboard');
    } catch (error) {
      console.error('Error al cambiar estado desde Dashboard:', error);
      alert('No se pudo actualizar el estado de la reserva');
      this.renderRecentReservationsTable();
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
