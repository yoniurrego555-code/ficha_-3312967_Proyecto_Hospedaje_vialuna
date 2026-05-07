import { getServicios, createServicio, updateServicio, deleteServicio } from "../core/api.js";

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
      // Usar datos de ejemplo si falla la API
      this.servicios = this.getServiciosEjemplo();
      this.calculateMetrics();
      console.log('Usando datos de ejemplo para servicios');
    }
  }

  getServiciosEjemplo() {
    return [
      { IDServicio: '1', Nombre: 'Spa', Descripcion: 'Tratamientos de spa', Estado: 'activo', Precio: 100, Categoria: 'Bienestar' },
      { IDServicio: '2', Nombre: 'Restaurante', Descripcion: 'Comida gourmet', Estado: 'activo', Precio: 80, Categoria: 'Gastronomía' },
      { IDServicio: '3', Nombre: 'Transporte', Descripcion: 'Servicio de transporte al aeropuerto', Estado: 'inactivo', Precio: 50, Categoria: 'Transporte' }
    ];
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
    this.updateMetrics();
    this.renderTable();
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
    this.container.innerHTML = `
      <div class="servicio-new-view">
        <div class="new-header">
          <button onclick="window.location.hash='servicios'" class="btn-back">
            ← Volver a la lista
          </button>
          <h2>Nuevo Servicio</h2>
        </div>
        
        <div class="new-content">
          <form id="newServicioForm" class="servicio-form">
            <div class="form-grid">
              <div class="form-group">
                <label for="newNombre">Nombre:</label>
                <input type="text" id="newNombre" required>
              </div>
              <div class="form-group">
                <label for="newCategoria">Categoría:</label>
                <select id="newCategoria" required>
                  <option value="Restaurante">Restaurante</option>
                  <option value="Spa">Spa</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Entretenimiento">Entretenimiento</option>
                  <option value="Limpieza">Limpieza</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
              <div class="form-group">
                <label for="newPrecio">Precio:</label>
                <input type="number" id="newPrecio" required>
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
              <button type="button" onclick="window.location.hash='servicios'" class="btn-secondary">
                Cancelar
              </button>
              <button type="submit" class="btn-primary">
                💾 Guardar Servicio
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const form = this.container.querySelector('#newServicioForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = {
        NombreServicio: this.container.querySelector('#newNombre').value,
        Descripcion: this.container.querySelector('#newDescripcion').value,
        Duracion: this.container.querySelector('#newDuracion')?.value || null,
        CantidadMaximaPersonas: this.container.querySelector('#newCantidad')?.value || null,
        Costo: parseFloat(this.container.querySelector('#newPrecio').value) || null,
        Estado: this.container.querySelector('#newEstado').value
      };

      try {
        await createServicio(formData);
        alert('Servicio creado exitosamente');
        window.location.hash='servicios';
      } catch (error) {
        console.error('Error creando servicio via API:', error);
        // Si falla la API, agregar localmente
        const nuevoServicio = {
          IDServicio: String(this.servicios.length + 1),
          ...formData,
          Estado: formData.estado || 'activo'
        };
        this.servicios.push(nuevoServicio);
        this.calculateMetrics();
        alert('Servicio creado localmente (backend no disponible)');
        window.location.hash='servicios';
      }
    });
  }

  edit(id) {
    const servicio = this.servicios.find(s => s.id == id || s.ID == id);
    if (!servicio) {
      alert('Servicio no encontrado');
      return;
    }

    this.container.innerHTML = `
      <div class="servicio-form-view">
        <div class="new-header">
          <button onclick="window.location.hash='servicios'" class="btn-back">
            ← Volver a la lista
          </button>
          <h2>Editar Servicio</h2>
        </div>
        
        <div class="new-content">
          <form id="editServicioForm" class="servicio-form">
            <div class="form-grid">
              <div class="form-group">
                <label for="editNombre">Nombre:</label>
                <input type="text" id="editNombre" value="${servicio.nombre || servicio.Nombre || ''}" required>
              </div>
              <div class="form-group">
                <label for="editCategoria">Categoría:</label>
                <select id="editCategoria" required>
                  <option value="Restaurante" ${String(servicio.categoria || servicio.Categoria || '').toLowerCase() === 'restaurante' ? 'selected' : ''}>Restaurante</option>
                  <option value="Spa" ${String(servicio.categoria || servicio.Categoria || '').toLowerCase() === 'spa' ? 'selected' : ''}>Spa</option>
                  <option value="Transporte" ${String(servicio.categoria || servicio.Categoria || '').toLowerCase() === 'transporte' ? 'selected' : ''}>Transporte</option>
                  <option value="Entretenimiento" ${String(servicio.categoria || servicio.Categoria || '').toLowerCase() === 'entretenimiento' ? 'selected' : ''}>Entretenimiento</option>
                  <option value="Limpieza" ${String(servicio.categoria || servicio.Categoria || '').toLowerCase() === 'limpieza' ? 'selected' : ''}>Limpieza</option>
                  <option value="Otros" ${String(servicio.categoria || servicio.Categoria || '').toLowerCase() === 'otros' ? 'selected' : ''}>Otros</option>
                </select>
              </div>
              <div class="form-group">
                <label for="editPrecio">Precio:</label>
                <input type="number" id="editPrecio" value="${servicio.precio || servicio.Precio || 0}" required>
              </div>
              <div class="form-group">
                <label for="editEstado">Estado:</label>
                <select id="editEstado" required>
                  <option value="Activo" ${String(servicio.estado || servicio.EstadoNombre || '').toLowerCase() === 'activo' ? 'selected' : ''}>Activo</option>
                  <option value="Inactivo" ${String(servicio.estado || servicio.EstadoNombre || '').toLowerCase() === 'inactivo' ? 'selected' : ''}>Inactivo</option>
                </select>
              </div>
              <div class="form-group" style="grid-column: span 2;">
                <label for="editDescripcion">Descripción:</label>
                <textarea id="editDescripcion" rows="3" required>${servicio.descripcion || servicio.Descripcion || ''}</textarea>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" onclick="window.location.hash='servicios'" class="btn-secondary">
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

    const form = this.container.querySelector('#editServicioForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = {
        NombreServicio: this.container.querySelector('#editNombre').value,
        Descripcion: this.container.querySelector('#editDescripcion').value,
        Duracion: this.container.querySelector('#editDuracion')?.value || null,
        CantidadMaximaPersonas: this.container.querySelector('#editCantidad')?.value || null,
        Costo: parseFloat(this.container.querySelector('#editPrecio').value) || null,
        Estado: this.container.querySelector('#editEstado').value
      };

      try {
        await updateServicio(id, formData);
        alert('Servicio actualizado exitosamente');
        window.location.hash='servicios';
      } catch (error) {
        alert('Error actualizando servicio: ' + error.message);
      }
    });
  }

  async delete(id) {
    if (confirm('¿Está seguro de que desea eliminar este servicio?')) {
      try {
        await deleteServicio(id);
        alert('Servicio eliminado exitosamente');
        await this.loadData();
        this.render();
      } catch (error) {
        alert('Error eliminando servicio: ' + error.message);
      }
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
