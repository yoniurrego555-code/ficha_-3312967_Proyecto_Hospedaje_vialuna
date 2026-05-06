import { getServicios } from "../core/api.js";

class ServiciosModule {
  constructor(container) {
    this.container = container;
    this.servicios = [];
    this.currentData = {
      total: 0,
      activos: 0,
      inactivos: 0,
      categorias: 0
    };
  }

  async initialize() {
    try {
      await this.loadData();
      this.render();
      this.setupEventListeners();
    } catch (error) {
      console.error("Error inicializando módulo de servicios:", error);
      this.showError("Error al cargar servicios", "No se pudieron cargar los datos. Por favor, recargue la página.");
    }
  }

  async loadData() {
    try {
      const response = await getServicios();
      this.servicios = response.data || [];
      this.calculateMetrics();
      console.log('Servicios cargados:', this.servicios.length);
    } catch (error) {
      console.error("Error cargando servicios:", error);
      throw error;
    }
  }

  calculateMetrics() {
    const total = this.servicios.length;
    const activos = this.servicios.filter(s => 
      String(s.estado || '').toLowerCase() === 'activo' || 
      String(s.EstadoNombre || '').toLowerCase() === 'activo'
    ).length;
    const inactivos = this.servicios.filter(s => 
      String(s.estado || '').toLowerCase() === 'inactivo' || 
      String(s.EstadoNombre || '').toLowerCase() === 'inactivo'
    ).length;
    
    // Contar categorías únicas
    const categorias = [...new Set(this.servicios.map(s => 
      s.categoria || s.Categoria || 'Sin categoría'
    ))].length;

    this.currentData = {
      total,
      activos,
      inactivos,
      categorias
    };
  }

  render() {
    this.container.innerHTML = this.getTemplate();
    this.updateMetrics();
    this.renderTable();
  }

  getTemplate() {
    return `
      <!-- Servicios Header -->
      <header class="module-header">
        <div class="header-left">
          <h1>Servicios</h1>
          <p>Gestión de servicios del hotel</p>
        </div>
        <div class="header-right">
          <button class="btn-primary" onclick="window.serviciosModule.showNewServiceModal()">
            <span>➕</span> Nuevo Servicio
          </button>
        </div>
      </header>

      <!-- Metrics Grid -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-title">Total Servicios</div>
            <div class="metric-icon blue">🔧</div>
          </div>
          <div class="metric-value" id="totalServicios">0</div>
          <div class="metric-change">
            <span>📊</span> Total del hotel
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-title">Servicios Activos</div>
            <div class="metric-icon green">✅</div>
          </div>
          <div class="metric-value" id="serviciosActivos">0</div>
          <div class="metric-change positive">
            <span>↑</span> Disponibles
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-title">Servicios Inactivos</div>
            <div class="metric-icon amber">⏸️</div>
          </div>
          <div class="metric-value" id="serviciosInactivos">0</div>
          <div class="metric-change negative">
            <span>↓</span> No disponibles
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-title">Categorías</div>
            <div class="metric-icon purple">📁</div>
          </div>
          <div class="metric-value" id="serviciosCategorias">0</div>
          <div class="metric-change">
            <span>🏷️</span> Tipos de servicios
          </div>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="search-section">
        <div class="search-container">
          <input type="text" id="searchServicios" placeholder="Buscar servicio..." class="search-input">
          <button class="btn-secondary" onclick="window.serviciosModule.search()">
            <span>🔍</span> Buscar
          </button>
        </div>
        <div class="filter-container">
          <select id="filterEstado" class="filter-select">
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
          <select id="filterCategoria" class="filter-select">
            <option value="">Todas las categorías</option>
            <option value="habitacion">Habitación</option>
            <option value="restaurante">Restaurante</option>
            <option value="spa">Spa</option>
            <option value="lavanderia">Lavandería</option>
            <option value="transporte">Transporte</option>
          </select>
        </div>
      </div>

      <!-- Servicios Table -->
      <div class="table-card">
        <div class="table-header">
          <h3 class="table-title">Lista de Servicios</h3>
          <div class="table-actions">
            <button class="btn-secondary" onclick="window.serviciosModule.exportData()">
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
                <th>Categoría</th>
                <th>Precio</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="serviciosTableBody">
              <tr><td colspan="7" class="text-center">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  updateMetrics() {
    const elements = {
      total: this.container.querySelector("#totalServicios"),
      activos: this.container.querySelector("#serviciosActivos"),
      inactivos: this.container.querySelector("#serviciosInactivos"),
      categorias: this.container.querySelector("#serviciosCategorias")
    };

    if (elements.total) elements.total.textContent = this.currentData.total;
    if (elements.activos) elements.activos.textContent = this.currentData.activos;
    if (elements.inactivos) elements.inactivos.textContent = this.currentData.inactivos;
    if (elements.categorias) elements.categorias.textContent = this.currentData.categorias;
  }

  renderTable() {
    const tbody = this.container.querySelector("#serviciosTableBody");
    if (!tbody) return;

    if (this.servicios.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay servicios registrados</td></tr>';
      return;
    }

    tbody.innerHTML = this.servicios.map(servicio => `
      <tr>
        <td>${servicio.id || servicio.ID}</td>
        <td>${servicio.nombre || servicio.Nombre || '-'}</td>
        <td>
          <span class="status-badge ${this.getCategoriaClass(servicio.categoria || servicio.Categoria)}">
            ${servicio.categoria || servicio.Categoria || 'Sin categoría'}
          </span>
        </td>
        <td>$${Number(servicio.precio || servicio.Precio || 0).toFixed(2)}</td>
        <td>${servicio.descripcion ? (servicio.descripcion.length > 50 ? servicio.descripcion.substring(0, 50) + '...' : servicio.descripcion) : (servicio.Descripcion ? (servicio.Descripcion.length > 50 ? servicio.Descripcion.substring(0, 50) + '...' : servicio.Descripcion) : '-')}</td>
        <td>
          <span class="status-badge ${this.getStatusClass(servicio.estado || servicio.EstadoNombre)}">
            ${servicio.estado || servicio.EstadoNombre || 'Sin estado'}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon btn-edit" onclick="window.serviciosModule.edit(${servicio.id || servicio.ID})" title="Editar">
              ✏️
            </button>
            <button class="btn-icon btn-delete" onclick="window.serviciosModule.delete(${servicio.id || servicio.ID})" title="Eliminar">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  getCategoriaClass(categoria) {
    const cat = String(categoria || '').toLowerCase();
    switch (cat) {
      case 'habitacion':
        return 'status-habitacion';
      case 'restaurante':
        return 'status-restaurante';
      case 'spa':
        return 'status-spa';
      case 'lavanderia':
        return 'status-lavanderia';
      case 'transporte':
        return 'status-transporte';
      default:
        return 'status-default';
    }
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
    const searchInput = this.container.querySelector("#searchServicios");
    if (searchInput) {
      searchInput.addEventListener('input', () => this.search());
    }

    // Filters
    const filterEstado = this.container.querySelector("#filterEstado");
    const filterCategoria = this.container.querySelector("#filterCategoria");
    
    if (filterEstado) {
      filterEstado.addEventListener('change', () => this.filter());
    }
    if (filterCategoria) {
      filterCategoria.addEventListener('change', () => this.filter());
    }
  }

  search() {
    const searchTerm = this.container.querySelector("#searchServicios").value.toLowerCase();
    const filtered = this.servicios.filter(s => 
      (s.nombre || s.Nombre || '').toLowerCase().includes(searchTerm) ||
      (s.descripcion || s.Descripcion || '').toLowerCase().includes(searchTerm) ||
      (s.categoria || s.Categoria || '').toLowerCase().includes(searchTerm) ||
      (s.id || s.ID || '').toString().includes(searchTerm)
    );
    this.renderFilteredTable(filtered);
  }

  filter() {
    const estadoFilter = this.container.querySelector("#filterEstado").value;
    const categoriaFilter = this.container.querySelector("#filterCategoria").value;
    
    let filtered = this.servicios;
    
    if (estadoFilter) {
      filtered = filtered.filter(s => 
        String(s.estado || s.EstadoNombre || '').toLowerCase() === estadoFilter.toLowerCase()
      );
    }
    
    if (categoriaFilter) {
      filtered = filtered.filter(s => 
        String(s.categoria || s.Categoria || '').toLowerCase() === categoriaFilter.toLowerCase()
      );
    }
    
    this.renderFilteredTable(filtered);
  }

  renderFilteredTable(filtered) {
    const tbody = this.container.querySelector("#serviciosTableBody");
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No se encontraron servicios</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(servicio => `
      <tr>
        <td>${servicio.id || servicio.ID}</td>
        <td>${servicio.nombre || servicio.Nombre || '-'}</td>
        <td>
          <span class="status-badge ${this.getCategoriaClass(servicio.categoria || servicio.Categoria)}">
            ${servicio.categoria || servicio.Categoria || 'Sin categoría'}
          </span>
        </td>
        <td>$${Number(servicio.precio || servicio.Precio || 0).toFixed(2)}</td>
        <td>${servicio.descripcion ? (servicio.descripcion.length > 50 ? servicio.descripcion.substring(0, 50) + '...' : servicio.descripcion) : (servicio.Descripcion ? (servicio.Descripcion.length > 50 ? servicio.Descripcion.substring(0, 50) + '...' : servicio.Descripcion) : '-')}</td>
        <td>
          <span class="status-badge ${this.getStatusClass(servicio.estado || servicio.EstadoNombre)}">
            ${servicio.estado || servicio.EstadoNombre || 'Sin estado'}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon btn-edit" onclick="window.serviciosModule.edit(${servicio.id || servicio.ID})" title="Editar">
              ✏️
            </button>
            <button class="btn-icon btn-delete" onclick="window.serviciosModule.delete(${servicio.id || servicio.ID})" title="Eliminar">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  showNewServiceModal() {
    console.log('Mostrar modal de nuevo servicio');
    // TODO: Implementar modal de creación de servicio
    alert('Función de nuevo servicio en desarrollo');
  }

  edit(id) {
    console.log('Editar servicio:', id);
    // TODO: Implementar modal de edición
    alert('Función de edición en desarrollo');
  }

  delete(id) {
    if (confirm('¿Está seguro de que desea eliminar este servicio?')) {
      console.log('Eliminar servicio:', id);
      // TODO: Implementar eliminación via API
      alert('Función de eliminación en desarrollo');
    }
  }

  exportData() {
    const csvContent = [
      ['ID', 'Nombre', 'Categoría', 'Precio', 'Descripción', 'Estado'],
      ...this.servicios.map(s => [
        s.id || s.ID,
        s.nombre || s.Nombre,
        s.categoria || s.Categoria,
        s.precio || s.Precio,
        s.descripcion ? (s.descripcion.length > 50 ? s.descripcion.substring(0, 50) + '...' : s.descripcion) : (s.Descripcion ? (s.Descripcion.length > 50 ? s.Descripcion.substring(0, 50) + '...' : s.Descripcion) : '-'),
        s.estado || s.EstadoNombre
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'servicios.csv';
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
export function renderServicios(container) {
  window.serviciosModule = new ServiciosModule(container);
  window.serviciosModule.initialize();
}
