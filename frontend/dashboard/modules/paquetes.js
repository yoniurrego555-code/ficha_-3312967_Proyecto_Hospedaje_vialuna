import { getPaquetes, createPaquete, updatePaquete, deletePaquete } from "../core/api.js";

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
      // Usar datos de ejemplo si falla la API
      this.paquetes = this.getPaquetesEjemplo();
      this.calculateMetrics();
      console.log('Usando datos de ejemplo para paquetes');
    }
  }

  getPaquetesEjemplo() {
    return [
      { IDPaquete: '1', Nombre: 'Romántico', Descripcion: 'Cena y desayuno', Estado: 'activo', Precio: 250, Duracion: 2 },
      { IDPaquete: '2', Nombre: 'Familiar', Descripcion: 'Actividades para niños', Estado: 'activo', Precio: 400, Duracion: 3 },
      { IDPaquete: '3', Nombre: 'Aventura', Descripcion: 'Senderismo y spa', Estado: 'inactivo', Precio: 300, Duracion: 2 }
    ];
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
    this.updateMetrics();
    this.renderTable();
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
    this.container.innerHTML = `
      <div class="paquete-new-view">
        <div class="new-header">
          <button onclick="window.location.hash='paquetes'" class="btn-back">
            ← Volver a la lista
          </button>
          <h2>Nuevo Paquete</h2>
        </div>
        
        <div class="new-content">
          <form id="newPaqueteForm" class="paquete-form">
            <div class="form-grid">
              <div class="form-group">
                <label for="newNombre">Nombre:</label>
                <input type="text" id="newNombre" required>
              </div>
              <div class="form-group">
                <label for="newPrecio">Precio:</label>
                <input type="number" id="newPrecio" required>
              </div>
              <div class="form-group">
                <label for="newDuracion">Duración:</label>
                <input type="text" id="newDuracion" placeholder="Ej: 3 días / 2 noches" required>
              </div>
              <div class="form-group">
                <label for="newEstado">Estado:</label>
                <select id="newEstado" required>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
              <div class="form-group">
                <label for="newDescripcion">Descripción:</label>
                <textarea id="newDescripcion" rows="3" required></textarea>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" onclick="window.location.hash='paquetes'" class="btn-secondary">
                Cancelar
              </button>
              <button type="submit" class="btn-primary">
                💾 Guardar Paquete
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const form = this.container.querySelector('#newPaqueteForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = {
        Nombre: this.container.querySelector('#newNombre').value,
        Precio: parseFloat(this.container.querySelector('#newPrecio').value),
        Duracion: this.container.querySelector('#newDuracion').value,
        Estado: this.container.querySelector('#newEstado').value,
        Descripcion: this.container.querySelector('#newDescripcion').value
      };

      try {
        await createPaquete(formData);
        alert('Paquete creado exitosamente');
        window.location.hash='paquetes';
      } catch (error) {
        console.error('Error creando paquete via API:', error);
        // Si falla la API, agregar localmente
        const nuevoPaquete = {
          IDPaquete: String(this.paquetes.length + 1),
          ...formData
        };
        this.paquetes.push(nuevoPaquete);
        this.calculateMetrics();
        alert('Paquete creado localmente (backend no disponible)');
        window.location.hash='paquetes';
      }
    });
  }

  edit(id) {
    const paquete = this.paquetes.find(p => p.id == id || p.ID == id);
    if (!paquete) {
      alert('Paquete no encontrado');
      return;
    }

    this.container.innerHTML = `
      <div class="paquete-form-view">
        <div class="new-header">
          <button onclick="window.location.hash='paquetes'" class="btn-back">
            ← Volver a la lista
          </button>
          <h2>Editar Paquete</h2>
        </div>
        
        <div class="new-content">
          <form id="editPaqueteForm" class="paquete-form">
            <div class="form-grid">
              <div class="form-group">
                <label for="editNombre">Nombre:</label>
                <input type="text" id="editNombre" value="${paquete.nombre || paquete.Nombre || ''}" required>
              </div>
              <div class="form-group">
                <label for="editPrecio">Precio:</label>
                <input type="number" id="editPrecio" value="${paquete.precio || paquete.Precio || 0}" required>
              </div>
              <div class="form-group">
                <label for="editDuracion">Duración:</label>
                <input type="text" id="editDuracion" value="${paquete.duracion || paquete.Duracion || ''}" required>
              </div>
              <div class="form-group">
                <label for="editEstado">Estado:</label>
                <select id="editEstado" required>
                  <option value="Activo" ${String(paquete.estado || paquete.EstadoNombre || '').toLowerCase() === 'activo' ? 'selected' : ''}>Activo</option>
                  <option value="Inactivo" ${String(paquete.estado || paquete.EstadoNombre || '').toLowerCase() === 'inactivo' ? 'selected' : ''}>Inactivo</option>
                </select>
              </div>
              <div class="form-group">
                <label for="editDescripcion">Descripción:</label>
                <textarea id="editDescripcion" rows="3" required>${paquete.descripcion || paquete.Descripcion || ''}</textarea>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" onclick="window.location.hash='paquetes'" class="btn-secondary">
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

    const form = this.container.querySelector('#editPaqueteForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = {
        Nombre: this.container.querySelector('#editNombre').value,
        Precio: parseFloat(this.container.querySelector('#editPrecio').value),
        Duracion: this.container.querySelector('#editDuracion').value,
        Estado: this.container.querySelector('#editEstado').value,
        Descripcion: this.container.querySelector('#editDescripcion').value
      };

      try {
        await updatePaquete(id, formData);
        alert('Paquete actualizado exitosamente');
        window.location.hash='paquetes';
      } catch (error) {
        alert('Error actualizando paquete: ' + error.message);
      }
    });
  }

  async delete(id) {
    if (confirm('¿Está seguro de que desea eliminar este paquete?')) {
      try {
        await deletePaquete(id);
        alert('Paquete eliminado exitosamente');
        await this.loadData();
        this.render();
      } catch (error) {
        console.error('Error eliminando paquete via API:', error);
        // Si falla la API, eliminar localmente
        this.paquetes = this.paquetes.filter(p => (p.IDPaquete != id && p.id_paquete != id));
        this.calculateMetrics();
        this.render();
        alert('Paquete eliminado localmente (backend no disponible)');
      }
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
