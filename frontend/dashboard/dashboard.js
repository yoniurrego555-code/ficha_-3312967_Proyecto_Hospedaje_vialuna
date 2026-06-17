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
      
      // Render dashboard charts
      this.renderCharts();

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
        const status = this._extractStatusId(r);
        return status === '1';
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

  // Render charts using reservation data
  renderCharts() {
    const chartDayCanvas = this.container.querySelector('#chartReservationsByDay');
    const chartStatusCanvas = this.container.querySelector('#chartStatusDistribution');
    const chartRevenueCanvas = this.container.querySelector('#chartRevenueTrend');
    if (!chartDayCanvas || !chartStatusCanvas || !chartRevenueCanvas) return;

    if (this.charts) {
      Object.values(this.charts).forEach(c => { if (c && typeof c.destroy === 'function') c.destroy(); });
    }
    this.charts = {};

    const formatDateKey = dateValue => {
      if (!dateValue) return '';
      const date = new Date(dateValue);
      if (Number.isNaN(date.getTime())) return String(dateValue).split('T')[0];
      return date.toISOString().split('T')[0];
    };

    const reservationsByDayMap = {};
    this.currentData.reservas.forEach(r => {
      const date = formatDateKey(r.fecha_inicio || r.FechaInicio || r.fecha || r.fecha_reserva || r.inicio);
      if (!date) return;
      reservationsByDayMap[date] = (reservationsByDayMap[date] || 0) + 1;
    });
    const sortedDays = Object.keys(reservationsByDayMap).sort();
    const dayLabels = sortedDays;
    const dayCounts = sortedDays.map(d => reservationsByDayMap[d]);

    this.charts.dayChart = new Chart(chartDayCanvas, {
      type: 'bar',
      data: {
        labels: dayLabels,
        datasets: [{
          label: 'Reservas',
          data: dayCounts,
          backgroundColor: 'rgba(31,106,77,0.7)',
          borderColor: 'rgba(31,106,77,1)',
          borderWidth: 1,
          borderRadius: 8,
          maxBarThickness: 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { title: { display: true, text: 'Fecha' } },
          y: { beginAtZero: true, title: { display: true, text: 'Número de reservas' } }
        }
      }
    });

    const statusCounts = { '1': 0, '2': 0, '3': 0 };
    this.currentData.reservas.forEach(r => {
      const status = this._extractStatusId(r);
      if (statusCounts[status] !== undefined) statusCounts[status]++;
    });
    this.charts.statusChart = new Chart(chartStatusCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Activas', 'Canceladas', 'Finalizadas'],
        datasets: [{
          data: [statusCounts['1'], statusCounts['2'], statusCounts['3']],
          backgroundColor: ['rgba(16,185,129,0.7)', 'rgba(239,68,68,0.7)', 'rgba(59,130,246,0.7)']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });

    const revenueByDay = {};
    this.currentData.reservas.forEach(r => {
      const date = formatDateKey(r.fecha_inicio || r.FechaInicio || r.fecha || r.fecha_reserva || r.inicio);
      const amount = Number(r.total || r.Total || r.monto || 0);
      if (!date) return;
      revenueByDay[date] = (revenueByDay[date] || 0) + amount;
    });
    const revenueDays = Object.keys(revenueByDay).sort();
    const revenueValues = revenueDays.map(d => revenueByDay[d]);

    this.charts.revenueChart = new Chart(chartRevenueCanvas, {
      type: 'line',
      data: {
        labels: revenueDays,
        datasets: [{
          label: 'Ingresos diarios',
          data: revenueValues,
          borderColor: 'rgba(61,124,98,0.9)',
          backgroundColor: 'rgba(61,124,98,0.1)',
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: 'rgba(31,106,77,1)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { title: { display: true, text: 'Fecha' } },
          y: { beginAtZero: true, title: { display: true, text: 'Ingresos' } }
        }
      }
    });
  }

  _extractStatusId(reserva) {
    if (!reserva) return '1';
    
    // Handle hydrated object states
    if (reserva.estado && typeof reserva.estado === 'object') {
      return String(reserva.estado.id || reserva.estado.id_estado_reserva || '1');
    }
    
    const statusValue = String(reserva.Estado || reserva.estado || reserva.id_estado_reserva || reserva.IdEstado || reserva.estado_nombre || '').toLowerCase();
    
    if (statusValue.includes('cancel') || statusValue.includes('anul') || statusValue === '2') return '2';
    if (statusValue.includes('final') || statusValue.includes('complete') || statusValue.includes('completada') || statusValue === '3') return '3';
    if (statusValue.includes('rechaz') || statusValue === '4') return '4';
    if (statusValue.includes('pend') || statusValue === '5') return '5';
    
    return '1';
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
      '4': 'status-cancelled',
      '5': 'status-active',
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
      '4': 'Rechazada',
      '5': 'Pendiente',
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

  // Render tabla de reservas recientes (placeholder para evitar errores al cambiar estado)
  renderRecentReservationsTable() {
    // La tabla del dashboard principal no muestra reservas directamente;
    // la vista detallada está en reservas-admin.js
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
