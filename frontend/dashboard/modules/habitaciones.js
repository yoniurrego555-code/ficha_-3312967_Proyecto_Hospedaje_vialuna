import { getHabitaciones } from "../core/api.js";

class HabitacionesModule {
  constructor(container) {
    this.container = container;
    this.habitaciones = [];
    this.currentData = {
      total: 0,
      disponibles: 0,
      ocupadas: 0,
      mantenimiento: 0
    };
  }

  async initialize() {
    try {
      await this.loadData();
      this.render();
      this.setupEventListeners();
    } catch (error) {
      console.error("Error inicializando módulo de habitaciones:", error);
      this.showError("Error al cargar habitaciones", "No se pudieron cargar los datos. Por favor, recargue la página.");
    }
  }

  async loadData() {
    try {
      const response = await getHabitaciones();
      this.habitaciones = response.data || [];
      this.calculateMetrics();
      console.log('Habitaciones cargadas:', this.habitaciones.length);
    } catch (error) {
      console.error("Error cargando habitaciones:", error);
      throw error;
    }
  }

  calculateMetrics() {
    const total = this.habitaciones.length;
    const disponibles = this.habitaciones.filter(h => 
      String(h.estado || '').toLowerCase() === 'disponible' || 
      String(h.EstadoNombre || '').toLowerCase() === 'disponible'
    ).length;
    const ocupadas = this.habitaciones.filter(h => 
      String(h.estado || '').toLowerCase() === 'ocupada' || 
      String(h.EstadoNombre || '').toLowerCase() === 'ocupada'
    ).length;
    const mantenimiento = this.habitaciones.filter(h => 
      String(h.estado || '').toLowerCase() === 'mantenimiento' || 
      String(h.EstadoNombre || '').toLowerCase() === 'mantenimiento'
    ).length;

    this.currentData = {
      total,
      disponibles,
      ocupadas,
      mantenimiento
    };
  }

  render() {
    this.container.innerHTML = this.getTemplate();
    this.updateMetrics();
    this.renderTable();
  }

  getTemplate() {
    return `
      <!-- Habitaciones Header -->
      <header class="module-header">
        <div class="header-left">
          <h1>Habitaciones</h1>
          <p>Gestión de habitaciones del hotel</p>
        </div>
        <div class="header-right">
          <button class="btn-primary" onclick="window.location.href='#habitaciones?action=nueva'">
            <span>➕</span> Nueva Habitación
          </button>
        </div>
      </header>

      <!-- Metrics Grid -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-title">Total Habitaciones</div>
            <div class="metric-icon blue">🏨</div>
          </div>
          <div class="metric-value" id="totalHabitaciones">0</div>
          <div class="metric-change">
            <span>📊</span> Total del hotel
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-title">Disponibles</div>
            <div class="metric-icon green">✅</div>
          </div>
          <div class="metric-value" id="habitacionesDisponibles">0</div>
          <div class="metric-change positive">
            <span>↑</span> Listas para reserva
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-title">Ocupadas</div>
            <div class="metric-icon amber">🛏️</div>
          </div>
          <div class="metric-value" id="habitacionesOcupadas">0</div>
          <div class="metric-change negative">
            <span>↓</span> Actualmente ocupadas
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-title">Mantenimiento</div>
            <div class="metric-icon purple">🔧</div>
          </div>
          <div class="metric-value" id="habitacionesMantenimiento">0</div>
          <div class="metric-change">
            <span>⚙️</span> En reparación
          </div>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="search-section">
        <div class="search-container">
          <input type="text" id="searchHabitaciones" placeholder="Buscar habitación..." class="search-input">
          <button class="btn-secondary" onclick="window.habitacionesModule.search()">
            <span>🔍</span> Buscar
          </button>
        </div>
        <div class="filter-container">
          <select id="filterEstado" class="filter-select">
            <option value="">Todos los estados</option>
            <option value="disponible">Disponible</option>
            <option value="ocupada">Ocupada</option>
            <option value="mantenimiento">Mantenimiento</option>
          </select>
        </div>
      </div>

      <!-- Habitaciones Table -->
      <div class="table-card">
        <div class="table-header">
          <h3 class="table-title">Lista de Habitaciones</h3>
          <div class="table-actions">
            <button class="btn-secondary" onclick="window.habitacionesModule.exportData()">
              <span>📥</span> Exportar
            </button>
          </div>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Número</th>
                <th>Tipo</th>
                <th>Precio</th>
                <th>Capacidad</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="habitacionesTableBody">
              <tr><td colspan="7" class="text-center">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  updateMetrics() {
    const elements = {
      total: this.container.querySelector("#totalHabitaciones"),
      disponibles: this.container.querySelector("#habitacionesDisponibles"),
      ocupadas: this.container.querySelector("#habitacionesOcupadas"),
      mantenimiento: this.container.querySelector("#habitacionesMantenimiento")
    };

    if (elements.total) elements.total.textContent = this.currentData.total;
    if (elements.disponibles) elements.disponibles.textContent = this.currentData.disponibles;
    if (elements.ocupadas) elements.ocupadas.textContent = this.currentData.ocupadas;
    if (elements.mantenimiento) elements.mantenimiento.textContent = this.currentData.mantenimiento;
  }

  renderTable() {
    const tbody = this.container.querySelector("#habitacionesTableBody");
    if (!tbody) return;

    if (this.habitaciones.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay habitaciones registradas</td></tr>';
      return;
    }

    tbody.innerHTML = this.habitaciones.map(habitacion => `
      <tr>
        <td>${habitacion.id || habitacion.ID}</td>
        <td>${habitacion.numero || habitacion.Numero || '-'}</td>
        <td>${habitacion.tipo || habitacion.Tipo || '-'}</td>
        <td>$${Number(habitacion.precio || habitacion.Precio || 0).toFixed(2)}</td>
        <td>${habitacion.capacidad || habitacion.Capacidad || '-'}</td>
        <td>
          <span class="status-badge ${this.getStatusClass(habitacion.estado || habitacion.EstadoNombre)}">
            ${habitacion.estado || habitacion.EstadoNombre || 'Sin estado'}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon btn-edit" onclick="window.habitacionesModule.edit(${habitacion.id || habitacion.ID})" title="Editar">
              ✏️
            </button>
            <button class="btn-icon btn-delete" onclick="window.habitacionesModule.delete(${habitacion.id || habitacion.ID})" title="Eliminar">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  getStatusClass(estado) {
    const status = String(estado || '').toLowerCase();
    switch (status) {
      case 'disponible':
        return 'status-available';
      case 'ocupada':
        return 'status-occupied';
      case 'mantenimiento':
        return 'status-maintenance';
      default:
        return 'status-unknown';
    }
  }

  setupEventListeners() {
    // Search
    const searchInput = this.container.querySelector("#searchHabitaciones");
    if (searchInput) {
      searchInput.addEventListener('input', () => this.search());
    }

    // Filter
    const filterSelect = this.container.querySelector("#filterEstado");
    if (filterSelect) {
      filterSelect.addEventListener('change', () => this.filter());
    }
  }

  search() {
    const searchTerm = this.container.querySelector("#searchHabitaciones").value.toLowerCase();
    const filtered = this.habitaciones.filter(h => 
      String(h.numero || h.Numero || '').toLowerCase().includes(searchTerm) ||
      String(h.tipo || h.Tipo || '').toLowerCase().includes(searchTerm) ||
      String(h.id || h.ID || '').toString().includes(searchTerm)
    );
    this.renderFilteredTable(filtered);
  }

  filter() {
    const filterValue = this.container.querySelector("#filterEstado").value;
    if (!filterValue) {
      this.renderTable();
      return;
    }

    const filtered = this.habitaciones.filter(h => 
      String(h.estado || h.EstadoNombre || '').toLowerCase() === filterValue.toLowerCase()
    );
    this.renderFilteredTable(filtered);
  }

  renderFilteredTable(filtered) {
    const tbody = this.container.querySelector("#habitacionesTableBody");
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No se encontraron habitaciones</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(habitacion => `
      <tr>
        <td>${habitacion.id || habitacion.ID}</td>
        <td>${habitacion.numero || habitacion.Numero || '-'}</td>
        <td>${habitacion.tipo || habitacion.Tipo || '-'}</td>
        <td>$${Number(habitacion.precio || habitacion.Precio || 0).toFixed(2)}</td>
        <td>${habitacion.capacidad || habitacion.Capacidad || '-'}</td>
        <td>
          <span class="status-badge ${this.getStatusClass(habitacion.estado || habitacion.EstadoNombre)}">
            ${habitacion.estado || habitacion.EstadoNombre || 'Sin estado'}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon btn-edit" onclick="window.habitacionesModule.edit(${habitacion.id || habitacion.ID})" title="Editar">
              ✏️
            </button>
            <button class="btn-icon btn-delete" onclick="window.habitacionesModule.delete(${habitacion.id || habitacion.ID})" title="Eliminar">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  edit(id) {
    console.log('Editar habitación:', id);
    // TODO: Implementar modal de edición
    alert('Función de edición en desarrollo');
  }

  delete(id) {
    if (confirm('¿Está seguro de que desea eliminar esta habitación?')) {
      console.log('Eliminar habitación:', id);
      // TODO: Implementar eliminación via API
      alert('Función de eliminación en desarrollo');
    }
  }

  exportData() {
    const csvContent = [
      ['ID', 'Número', 'Tipo', 'Precio', 'Capacidad', 'Estado'],
      ...this.habitaciones.map(h => [
        h.id || h.ID,
        h.numero || h.Numero,
        h.tipo || h.Tipo,
        h.precio || h.Precio,
        h.capacidad || h.Capacidad,
        h.estado || h.EstadoNombre
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'habitaciones.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

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
export function renderHabitaciones(container) {
  window.habitacionesModule = new HabitacionesModule(container);
  window.habitacionesModule.initialize();
}
