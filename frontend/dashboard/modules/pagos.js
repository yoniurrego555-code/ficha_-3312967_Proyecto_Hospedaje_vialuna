import { getMetodosPago, createMetodoPago, updateMetodoPago, deleteMetodoPago } from "../core/api.js";

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
    this.updateMetrics();
    this.renderTable();
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
    this.container.innerHTML = `
      <div class="pago-new-view">
        <div class="new-header">
          <button onclick="window.location.hash='pagos'" class="btn-back">
            ← Volver a la lista
          </button>
          <h2>Nuevo Método de Pago</h2>
        </div>
        
        <div class="new-content">
          <form id="newPagoForm" class="pago-form">
            <div class="form-grid">
              <div class="form-group">
                <label for="newNombre">Nombre:</label>
                <input type="text" id="newNombre" required>
              </div>
              <div class="form-group">
                <label for="newTipo">Tipo:</label>
                <select id="newTipo" required>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Digital">Billetera Digital</option>
                </select>
              </div>
              <div class="form-group">
                <label for="newComision">Comisión (%):</label>
                <input type="number" step="0.01" id="newComision" value="0.00" required>
              </div>
              <div class="form-group">
                <label for="newEstado">Estado:</label>
                <select id="newEstado" required>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
              <div class="form-group" style="grid-column: span 2;">
                <label for="newDescripcion">Descripción:</label>
                <textarea id="newDescripcion" rows="3" required></textarea>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" onclick="window.location.hash='pagos'" class="btn-secondary">
                Cancelar
              </button>
              <button type="submit" class="btn-primary">
                💾 Guardar Método
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const form = this.container.querySelector('#newPagoForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = {
        Nombre: this.container.querySelector('#newNombre').value,
        Tipo: this.container.querySelector('#newTipo').value,
        Comision: parseFloat(this.container.querySelector('#newComision').value),
        Estado: this.container.querySelector('#newEstado').value,
        Descripcion: this.container.querySelector('#newDescripcion').value
      };

      try {
        await createMetodoPago(formData);
        alert('Método de pago creado exitosamente');
        window.location.hash='pagos';
      } catch (error) {
        alert('Error creando método de pago: ' + error.message);
      }
    });
  }

  edit(id) {
    const pago = this.pagos.find(p => p.id == id || p.ID == id);
    if (!pago) {
      alert('Método de pago no encontrado');
      return;
    }

    this.container.innerHTML = `
      <div class="pago-form-view">
        <div class="new-header">
          <button onclick="window.location.hash='pagos'" class="btn-back">
            ← Volver a la lista
          </button>
          <h2>Editar Método de Pago</h2>
        </div>
        
        <div class="new-content">
          <form id="editPagoForm" class="pago-form">
            <div class="form-grid">
              <div class="form-group">
                <label for="editNombre">Nombre:</label>
                <input type="text" id="editNombre" value="${pago.nombre || pago.Nombre || ''}" required>
              </div>
              <div class="form-group">
                <label for="editTipo">Tipo:</label>
                <select id="editTipo" required>
                  <option value="Efectivo" ${String(pago.tipo || pago.Tipo || '').toLowerCase() === 'efectivo' ? 'selected' : ''}>Efectivo</option>
                  <option value="Transferencia" ${String(pago.tipo || pago.Tipo || '').toLowerCase() === 'transferencia' ? 'selected' : ''}>Transferencia</option>
                  <option value="Tarjeta" ${String(pago.tipo || pago.Tipo || '').toLowerCase() === 'tarjeta' ? 'selected' : ''}>Tarjeta</option>
                  <option value="Digital" ${String(pago.tipo || pago.Tipo || '').toLowerCase() === 'digital' ? 'selected' : ''}>Billetera Digital</option>
                </select>
              </div>
              <div class="form-group">
                <label for="editComision">Comisión (%):</label>
                <input type="number" step="0.01" id="editComision" value="${pago.comision || pago.Comision || 0}" required>
              </div>
              <div class="form-group">
                <label for="editEstado">Estado:</label>
                <select id="editEstado" required>
                  <option value="Activo" ${String(pago.estado || pago.EstadoNombre || '').toLowerCase() === 'activo' ? 'selected' : ''}>Activo</option>
                  <option value="Inactivo" ${String(pago.estado || pago.EstadoNombre || '').toLowerCase() === 'inactivo' ? 'selected' : ''}>Inactivo</option>
                </select>
              </div>
              <div class="form-group" style="grid-column: span 2;">
                <label for="editDescripcion">Descripción:</label>
                <textarea id="editDescripcion" rows="3" required>${pago.descripcion || pago.Descripcion || ''}</textarea>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" onclick="window.location.hash='pagos'" class="btn-secondary">
                Cancelar
              </button>
              <button type="submit" class="btn-primary">
                💾 Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const form = this.container.querySelector('#editPagoForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = {
        Nombre: this.container.querySelector('#editNombre').value,
        Tipo: this.container.querySelector('#editTipo').value,
        Comision: parseFloat(this.container.querySelector('#editComision').value),
        Estado: this.container.querySelector('#editEstado').value,
        Descripcion: this.container.querySelector('#editDescripcion').value
      };

      try {
        await updateMetodoPago(id, formData);
        alert('Método de pago actualizado exitosamente');
        window.location.hash='pagos';
      } catch (error) {
        alert('Error actualizando método de pago: ' + error.message);
      }
    });
  }

  async delete(id) {
    if (confirm('¿Está seguro de que desea eliminar este método de pago?')) {
      try {
        await deleteMetodoPago(id);
        alert('Método de pago eliminado exitosamente');
        await this.loadData();
        this.render();
      } catch (error) {
        alert('Error eliminando método de pago: ' + error.message);
      }
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
