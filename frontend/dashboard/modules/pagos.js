import { getMetodosPago } from "../core/api.js";

class PagosModule {
  constructor(container) {
    this.container = container;
    this.pagos = [];
    this.currentData = {
      total: 0,
      esteMes: 0,
      procesados: 0,
      pendientes: 0
    };
  }

  async initialize() {
    try {
      await this.loadData();
      this.render();
      this.setupEventListeners();
    } catch (error) {
      console.error("Error inicializando módulo de pagos:", error);
      this.showError("Error al cargar pagos", "No se pudieron cargar los datos. Por favor, recargue la página.");
    }
  }

  async loadData() {
    try {
      const response = await getMetodosPago();
      this.pagos = response.data || [];
      this.calculateMetrics();
      console.log('Métodos de pago cargados:', this.pagos.length);
    } catch (error) {
      console.error("Error cargando métodos de pago:", error);
      throw error;
    }
  }

  calculateMetrics() {
    const total = this.pagos.length;
    const activos = this.pagos.filter(p => 
      String(p.estado || '').toLowerCase() === 'activo' || 
      String(p.EstadoNombre || '').toLowerCase() === 'activo'
    ).length;
    const inactivos = this.pagos.filter(p => 
      String(p.estado || '').toLowerCase() === 'inactivo' || 
      String(p.EstadoNombre || '').toLowerCase() === 'inactivo'
    ).length;
    
    // Simular pagos del mes (esto debería venir de una API real de pagos)
    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth();
    const añoActual = fechaActual.getFullYear();
    
    // Para demostración, simulamos algunos pagos
    const esteMes = Math.floor(Math.random() * 20) + 5;

    this.currentData = {
      total,
      procesados: activos,
      pendientes: inactivos,
      esteMes
    };
  }

  render() {
    this.container.innerHTML = this.getTemplate();
    this.updateMetrics();
    this.renderTable();
  }

  getTemplate() {
    return `
      <!-- Pagos Header -->
      <header class="module-header">
        <div class="header-left">
          <h1>Pagos</h1>
          <p>Gestión de métodos de pago y transacciones</p>
        </div>
        <div class="header-right">
          <button class="btn-primary" onclick="window.pagosModule.showNewPaymentModal()">
            <span>➕</span> Nuevo Pago
          </button>
        </div>
      </header>

      <!-- Metrics Grid -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-title">Total Métodos</div>
            <div class="metric-icon blue">💳</div>
          </div>
          <div class="metric-value" id="totalPagos">0</div>
          <div class="metric-change">
            <span>📊</span> Total del sistema
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-title">Pagos Mes</div>
            <div class="metric-icon green">📅</div>
          </div>
          <div class="metric-value" id="pagosMes">$0</div>
          <div class="metric-change positive">
            <span>↑</span> Este mes
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-title">Procesados</div>
            <div class="metric-icon amber">✅</div>
          </div>
          <div class="metric-value" id="pagosProcesados">0</div>
          <div class="metric-change">
            <span>⚡</span> Completados
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-title">Pendientes</div>
            <div class="metric-icon purple">⏳</div>
          </div>
          <div class="metric-value" id="pagosPendientes">0</div>
          <div class="metric-change negative">
            <span>⏱️</span> En espera
          </div>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="search-section">
        <div class="search-container">
          <input type="text" id="searchPagos" placeholder="Buscar método de pago..." class="search-input">
          <button class="btn-secondary" onclick="window.pagosModule.search()">
            <span>🔍</span> Buscar
          </button>
        </div>
        <div class="filter-container">
          <select id="filterEstado" class="filter-select">
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
          <select id="filterTipo" class="filter-select">
            <option value="">Todos los tipos</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="digital">Digital</option>
          </select>
        </div>
      </div>

      <!-- Pagos Table -->
      <div class="table-card">
        <div class="table-header">
          <h3 class="table-title">Métodos de Pago</h3>
          <div class="table-actions">
            <button class="btn-secondary" onclick="window.pagosModule.exportData()">
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
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Comisión</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="pagosTableBody">
              <tr><td colspan="8" class="text-center">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  updateMetrics() {
    const elements = {
      total: this.container.querySelector("#totalPagos"),
      mes: this.container.querySelector("#pagosMes"),
      procesados: this.container.querySelector("#pagosProcesados"),
      pendientes: this.container.querySelector("#pagosPendientes")
    };

    if (elements.total) elements.total.textContent = this.currentData.total;
    if (elements.mes) elements.mes.textContent = `$${this.currentData.esteMes.toFixed(2)}`;
    if (elements.procesados) elements.procesados.textContent = this.currentData.procesados;
    if (elements.pendientes) elements.pendientes.textContent = this.currentData.pendientes;
  }

  renderTable() {
    const tbody = this.container.querySelector("#pagosTableBody");
    if (!tbody) return;

    if (this.pagos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay métodos de pago registrados</td></tr>';
      return;
    }

    tbody.innerHTML = this.pagos.map(pago => `
      <tr>
        <td>${pago.id || pago.ID}</td>
        <td>${pago.nombre || pago.Nombre || '-'}</td>
        <td>
          <span class="status-badge ${this.getTipoClass(pago.tipo || pago.Tipo)}">
            ${pago.tipo || pago.Tipo || 'Sin tipo'}
          </span>
        </td>
        <td>${pago.descripcion ? (pago.descripcion.length > 50 ? pago.descripcion.substring(0, 50) + '...' : pago.descripcion) : (pago.Descripcion ? (pago.Descripcion.length > 50 ? pago.Descripcion.substring(0, 50) + '...' : pago.Descripcion) : '-')}</td>
        <td>${pago.comision ? `${Number(pago.comision || pago.Comision || 0).toFixed(2)}%` : '-'}</td>
        <td>
          <span class="status-badge ${this.getStatusClass(pago.estado || pago.EstadoNombre)}">
            ${pago.estado || pago.EstadoNombre || 'Sin estado'}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon btn-edit" onclick="window.pagosModule.edit(${pago.id || pago.ID})" title="Editar">
              ✏️
            </button>
            <button class="btn-icon btn-delete" onclick="window.pagosModule.delete(${pago.id || pago.ID})" title="Eliminar">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  getTipoClass(tipo) {
    const tipoLower = String(tipo || '').toLowerCase();
    switch (tipoLower) {
      case 'tarjeta':
        return 'status-tarjeta';
      case 'efectivo':
        return 'status-efectivo';
      case 'transferencia':
        return 'status-transferencia';
      case 'digital':
        return 'status-digital';
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
    const searchInput = this.container.querySelector("#searchPagos");
    if (searchInput) {
      searchInput.addEventListener('input', () => this.search());
    }

    // Filters
    const filterEstado = this.container.querySelector("#filterEstado");
    const filterTipo = this.container.querySelector("#filterTipo");
    
    if (filterEstado) {
      filterEstado.addEventListener('change', () => this.filter());
    }
    if (filterTipo) {
      filterTipo.addEventListener('change', () => this.filter());
    }
  }

  search() {
    const searchTerm = this.container.querySelector("#searchPagos").value.toLowerCase();
    const filtered = this.pagos.filter(p => 
      (p.nombre || p.Nombre || '').toLowerCase().includes(searchTerm) ||
      (p.descripcion || p.Descripcion || '').toLowerCase().includes(searchTerm) ||
      (p.tipo || p.Tipo || '').toLowerCase().includes(searchTerm) ||
      (p.id || p.ID || '').toString().includes(searchTerm)
    );
    this.renderFilteredTable(filtered);
  }

  filter() {
    const estadoFilter = this.container.querySelector("#filterEstado").value;
    const tipoFilter = this.container.querySelector("#filterTipo").value;
    
    let filtered = this.pagos;
    
    if (estadoFilter) {
      filtered = filtered.filter(p => 
        String(p.estado || p.EstadoNombre || '').toLowerCase() === estadoFilter.toLowerCase()
      );
    }
    
    if (tipoFilter) {
      filtered = filtered.filter(p => 
        String(p.tipo || p.Tipo || '').toLowerCase() === tipoFilter.toLowerCase()
      );
    }
    
    this.renderFilteredTable(filtered);
  }

  renderFilteredTable(filtered) {
    const tbody = this.container.querySelector("#pagosTableBody");
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center">No se encontraron métodos de pago</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(pago => `
      <tr>
        <td>${pago.id || pago.ID}</td>
        <td>${pago.nombre || pago.Nombre || '-'}</td>
        <td>
          <span class="status-badge ${this.getTipoClass(pago.tipo || pago.Tipo)}">
            ${pago.tipo || pago.Tipo || 'Sin tipo'}
          </span>
        </td>
        <td>${pago.descripcion ? (pago.descripcion.length > 50 ? pago.descripcion.substring(0, 50) + '...' : pago.descripcion) : (pago.Descripcion ? (pago.Descripcion.length > 50 ? pago.Descripcion.substring(0, 50) + '...' : pago.Descripcion) : '-')}</td>
        <td>${pago.comision ? `${Number(pago.comision || pago.Comision || 0).toFixed(2)}%` : '-'}</td>
        <td>
          <span class="status-badge ${this.getStatusClass(pago.estado || pago.EstadoNombre)}">
            ${pago.estado || pago.EstadoNombre || 'Sin estado'}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon btn-edit" onclick="window.pagosModule.edit(${pago.id || pago.ID})" title="Editar">
              ✏️
            </button>
            <button class="btn-icon btn-delete" onclick="window.pagosModule.delete(${pago.id || pago.ID})" title="Eliminar">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  showNewPaymentModal() {
    console.log('Mostrar modal de nuevo pago');
    // TODO: Implementar modal de creación de pago
    alert('Función de nuevo pago en desarrollo');
  }

  edit(id) {
    console.log('Editar método de pago:', id);
    // TODO: Implementar modal de edición
    alert('Función de edición en desarrollo');
  }

  delete(id) {
    if (confirm('¿Está seguro de que desea eliminar este método de pago?')) {
      console.log('Eliminar método de pago:', id);
      // TODO: Implementar eliminación via API
      alert('Función de eliminación en desarrollo');
    }
  }

  exportData() {
    const csvContent = [
      ['ID', 'Nombre', 'Tipo', 'Descripción', 'Comisión', 'Estado'],
      ...this.pagos.map(p => [
        p.id || p.ID,
        p.nombre || p.Nombre,
        p.tipo || p.Tipo,
        p.descripcion ? (p.descripcion.length > 50 ? p.descripcion.substring(0, 50) + '...' : p.descripcion) : (p.Descripcion ? (p.Descripcion.length > 50 ? p.Descripcion.substring(0, 50) + '...' : p.Descripcion) : '-'),
        p.comision || p.Comision,
        p.estado || p.EstadoNombre
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'metodos_pago.csv';
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
export function renderPagos(container) {
  window.pagosModule = new PagosModule(container);
  window.pagosModule.initialize();
}
