import { getPaquetes } from "../core/api.js";

class PaquetesModule {
  constructor(container) {
    this.container = container;
    this.paquetes = [];
    this.currentData = {
      total: 0,
      activos: 0,
      inactivos: 0,
      precioPromedio: 0
    };
  }

  async initialize() {
    try {
      await this.loadData();
      this.render();
      this.setupEventListeners();
    } catch (error) {
      console.error("Error inicializando módulo de paquetes:", error);
      this.showError("Error al cargar paquetes", "No se pudieron cargar los datos. Por favor, recargue la página.");
    }
  }

  async loadData() {
    try {
      const response = await getPaquetes();
      this.paquetes = response.data || [];
      this.calculateMetrics();
      console.log('Paquetes cargados:', this.paquetes.length);
    } catch (error) {
      console.error("Error cargando paquetes:", error);
      throw error;
    }
  }

  calculateMetrics() {
    const total = this.paquetes.length;
    const activos = this.paquetes.filter(p => 
      String(p.estado || '').toLowerCase() === 'activo' || 
      String(p.EstadoNombre || '').toLowerCase() === 'activo'
    ).length;
    const inactivos = this.paquetes.filter(p => 
      String(p.estado || '').toLowerCase() === 'inactivo' || 
      String(p.EstadoNombre || '').toLowerCase() === 'inactivo'
    ).length;
    
    // Calcular precio promedio
    const preciosValidos = this.paquetes
      .filter(p => p.precio || p.Precio)
      .map(p => Number(p.precio || p.Precio));
    const precioPromedio = preciosValidos.length > 0 
      ? preciosValidos.reduce((a, b) => a + b, 0) / preciosValidos.length 
      : 0;

    this.currentData = {
      total,
      activos,
      inactivos,
      precioPromedio
    };
  }

  render() {
    this.container.innerHTML = this.getTemplate();
    this.updateMetrics();
    this.renderTable();
  }

  getTemplate() {
    return `
      <!-- Paquetes Header -->
      <header class="module-header">
        <div class="header-left">
          <h1>Paquetes</h1>
          <p>Gestión de paquetes del hotel</p>
        </div>
        <div class="header-right">
          <button class="btn-primary" onclick="window.paquetesModule.showNewPackageModal()">
            <span>➕</span> Nuevo Paquete
          </button>
        </div>
      </header>

      <!-- Metrics Grid -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-title">Total Paquetes</div>
            <div class="metric-icon blue">📦</div>
          </div>
          <div class="metric-value" id="totalPaquetes">0</div>
          <div class="metric-change">
            <span>📊</span> Total del hotel
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-title">Paquetes Activos</div>
            <div class="metric-icon green">✅</div>
          </div>
          <div class="metric-value" id="paquetesActivos">0</div>
          <div class="metric-change positive">
            <span>↑</span> Disponibles
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-title">Paquetes Inactivos</div>
            <div class="metric-icon amber">⏸️</div>
          </div>
          <div class="metric-value" id="paquetesInactivos">0</div>
          <div class="metric-change negative">
            <span>↓</span> No disponibles
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-title">Precio Promedio</div>
            <div class="metric-icon purple">💰</div>
          </div>
          <div class="metric-value" id="precioPromedio">$0</div>
          <div class="metric-change">
            <span>📈</span> Promedio general
          </div>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="search-section">
        <div class="search-container">
          <input type="text" id="searchPaquetes" placeholder="Buscar paquete..." class="search-input">
          <button class="btn-secondary" onclick="window.paquetesModule.search()">
            <span>🔍</span> Buscar
          </button>
        </div>
        <div class="filter-container">
          <select id="filterEstado" class="filter-select">
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
          <select id="filterRangoPrecio" class="filter-select">
            <option value="">Todos los precios</option>
            <option value="0-50">$0 - $50</option>
            <option value="50-100">$50 - $100</option>
            <option value="100-200">$100 - $200</option>
            <option value="200+">$200+</option>
          </select>
        </div>
      </div>

      <!-- Paquetes Table -->
      <div class="table-card">
        <div class="table-header">
          <h3 class="table-title">Lista de Paquetes</h3>
          <div class="table-actions">
            <button class="btn-secondary" onclick="window.paquetesModule.exportData()">
              <span>📥</span> Exportar
            </button>
          </div>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Precio</th>
                <th>Duración</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="paquetesTableBody">
              <tr><td colspan="8" class="text-center">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  updateMetrics() {
    const elements = {
      total: this.container.querySelector("#totalPaquetes"),
      activos: this.container.querySelector("#paquetesActivos"),
      inactivos: this.container.querySelector("#paquetesInactivos"),
      precioPromedio: this.container.querySelector("#precioPromedio")
    };

    if (elements.total) elements.total.textContent = this.currentData.total;
    if (elements.activos) elements.activos.textContent = this.currentData.activos;
    if (elements.inactivos) elements.inactivos.textContent = this.currentData.inactivos;
    if (elements.precioPromedio) elements.precioPromedio.textContent = `$${this.currentData.precioPromedio.toFixed(2)}`;
  }

  renderTable() {
    const tbody = this.container.querySelector("#paquetesTableBody");
    if (!tbody) return;

    if (this.paquetes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay paquetes registrados</td></tr>';
      return;
    }

    tbody.innerHTML = this.paquetes.map(paquete => `
      <tr>
        <td>${paquete.id || paquete.ID}</td>
        <td>${paquete.nombre || paquete.Nombre || '-'}</td>
        <td>${paquete.descripcion ? (paquete.descripcion.length > 60 ? paquete.descripcion.substring(0, 60) + '...' : paquete.descripcion) : (paquete.Descripcion ? (paquete.Descripcion.length > 60 ? paquete.Descripcion.substring(0, 60) + '...' : paquete.Descripcion) : '-')}</td>
        <td>$${Number(paquete.precio || paquete.Precio || 0).toFixed(2)}</td>
        <td>${paquete.duracion || paquete.Duracion || '-'}</td>
        <td>
          <span class="status-badge ${this.getStatusClass(paquete.estado || paquete.EstadoNombre)}">
            ${paquete.estado || paquete.EstadoNombre || 'Sin estado'}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon btn-edit" onclick="window.paquetesModule.edit(${paquete.id || paquete.ID})" title="Editar">
              ✏️
            </button>
            <button class="btn-icon btn-delete" onclick="window.paquetesModule.delete(${paquete.id || paquete.ID})" title="Eliminar">
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
      case 'activo':
        return 'status-active';
      case 'inactivo':
        return 'status-inactive';
      default:
        return 'status-unknown';
    }
  }

  setupEventListeners() {
    // Search
    const searchInput = this.container.querySelector("#searchPaquetes");
    if (searchInput) {
      searchInput.addEventListener('input', () => this.search());
    }

    // Filters
    const filterEstado = this.container.querySelector("#filterEstado");
    const filterRangoPrecio = this.container.querySelector("#filterRangoPrecio");
    
    if (filterEstado) {
      filterEstado.addEventListener('change', () => this.filter());
    }
    if (filterRangoPrecio) {
      filterRangoPrecio.addEventListener('change', () => this.filter());
    }
  }

  search() {
    const searchTerm = this.container.querySelector("#searchPaquetes").value.toLowerCase();
    const filtered = this.paquetes.filter(p => 
      (p.nombre || p.Nombre || '').toLowerCase().includes(searchTerm) ||
      (p.descripcion || p.Descripcion || '').toLowerCase().includes(searchTerm) ||
      (p.id || p.ID || '').toString().includes(searchTerm)
    );
    this.renderFilteredTable(filtered);
  }

  filter() {
    const estadoFilter = this.container.querySelector("#filterEstado").value;
    const rangoPrecioFilter = this.container.querySelector("#filterRangoPrecio").value;
    
    let filtered = this.paquetes;
    
    if (estadoFilter) {
      filtered = filtered.filter(p => 
        String(p.estado || p.EstadoNombre || '').toLowerCase() === estadoFilter.toLowerCase()
      );
    }
    
    if (rangoPrecioFilter) {
      filtered = filtered.filter(p => {
        const precio = Number(p.precio || p.Precio || 0);
        switch (rangoPrecioFilter) {
          case '0-50':
            return precio >= 0 && precio <= 50;
          case '50-100':
            return precio > 50 && precio <= 100;
          case '100-200':
            return precio > 100 && precio <= 200;
          case '200+':
            return precio > 200;
          default:
            return true;
        }
      });
    }
    
    this.renderFilteredTable(filtered);
  }

  renderFilteredTable(filtered) {
    const tbody = this.container.querySelector("#paquetesTableBody");
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center">No se encontraron paquetes</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(paquete => `
      <tr>
        <td>${paquete.id || paquete.ID}</td>
        <td>${paquete.nombre || paquete.Nombre || '-'}</td>
        <td>${paquete.descripcion ? (paquete.descripcion.length > 60 ? paquete.descripcion.substring(0, 60) + '...' : paquete.descripcion) : (paquete.Descripcion ? (paquete.Descripcion.length > 60 ? paquete.Descripcion.substring(0, 60) + '...' : paquete.Descripcion) : '-')}</td>
        <td>$${Number(paquete.precio || paquete.Precio || 0).toFixed(2)}</td>
        <td>${paquete.duracion || paquete.Duracion || '-'}</td>
        <td>
          <span class="status-badge ${this.getStatusClass(paquete.estado || paquete.EstadoNombre)}">
            ${paquete.estado || paquete.EstadoNombre || 'Sin estado'}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon btn-edit" onclick="window.paquetesModule.edit(${paquete.id || paquete.ID})" title="Editar">
              ✏️
            </button>
            <button class="btn-icon btn-delete" onclick="window.paquetesModule.delete(${paquete.id || paquete.ID})" title="Eliminar">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  showNewPackageModal() {
    console.log('Mostrar modal de nuevo paquete');
    // TODO: Implementar modal de creación de paquete
    alert('Función de nuevo paquete en desarrollo');
  }

  edit(id) {
    console.log('Editar paquete:', id);
    // TODO: Implementar modal de edición
    alert('Función de edición en desarrollo');
  }

  delete(id) {
    if (confirm('¿Está seguro de que desea eliminar este paquete?')) {
      console.log('Eliminar paquete:', id);
      // TODO: Implementar eliminación via API
      alert('Función de eliminación en desarrollo');
    }
  }

  exportData() {
    const csvContent = [
      ['ID', 'Nombre', 'Descripción', 'Precio', 'Duración', 'Estado'],
      ...this.paquetes.map(p => [
        p.id || p.ID,
        p.nombre || p.Nombre,
        p.descripcion ? (p.descripcion.length > 60 ? p.descripcion.substring(0, 60) + '...' : p.descripcion) : (p.Descripcion ? (p.Descripcion.length > 60 ? p.Descripcion.substring(0, 60) + '...' : p.Descripcion) : '-'),
        p.precio || p.Precio,
        p.duracion || p.Duracion,
        p.estado || p.EstadoNombre
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'paquetes.csv';
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
export function renderPaquetes(container) {
  window.paquetesModule = new PaquetesModule(container);
  window.paquetesModule.initialize();
}
