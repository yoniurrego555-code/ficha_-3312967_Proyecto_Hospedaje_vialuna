import { getHabitaciones, createHabitacion, updateHabitacion, deleteHabitacion } from "../core/api.js";

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
      // Usar datos de ejemplo si falla la API
      this.habitaciones = this.getHabitacionesEjemplo();
      this.calculateMetrics();
      console.log('Usando datos de ejemplo para habitaciones');
    }
  }

  getHabitacionesEjemplo() {
    return [
      { IDHabitacion: '1', Numero: '101', Tipo: 'Suite', Estado: 'disponible', Precio: 150, Capacidad: 2 },
      { IDHabitacion: '2', Numero: '102', Tipo: 'Deluxe', Estado: 'disponible', Precio: 200, Capacidad: 3 },
      { IDHabitacion: '3', Numero: '103', Tipo: 'Standard', Estado: 'ocupada', Precio: 100, Capacidad: 2 },
      { IDHabitacion: '4', Numero: '104', Tipo: 'Suite', Estado: 'mantenimiento', Precio: 180, Capacidad: 4 }
    ];
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
    this.updateMetrics();
    this.renderTable();
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
    const habitacion = this.habitaciones.find(h => h.id == id || h.ID == id);
    if (!habitacion) {
      alert('Habitación no encontrada');
      return;
    }

    this.container.innerHTML = `
      <div class="habitacion-form-view">
        <div class="new-header">
          <button onclick="window.location.hash='habitaciones'" class="btn-back">
            ← Volver a la lista
          </button>
          <h2>Editar Habitación</h2>
        </div>
        
        <div class="new-content">
          <form id="editHabitacionForm" class="habitacion-form">
            <div class="form-grid">
              <div class="form-group">
                <label for="editNumero">Número:</label>
                <input type="text" id="editNumero" value="${habitacion.numero || habitacion.Numero || ''}" required>
              </div>
              <div class="form-group">
                <label for="editTipo">Tipo:</label>
                <select id="editTipo" required>
                  <option value="Sencilla" ${(habitacion.tipo || habitacion.Tipo) === 'Sencilla' ? 'selected' : ''}>Sencilla</option>
                  <option value="Doble" ${(habitacion.tipo || habitacion.Tipo) === 'Doble' ? 'selected' : ''}>Doble</option>
                  <option value="Suite" ${(habitacion.tipo || habitacion.Tipo) === 'Suite' ? 'selected' : ''}>Suite</option>
                </select>
              </div>
              <div class="form-group">
                <label for="editPrecio">Precio:</label>
                <input type="number" id="editPrecio" value="${habitacion.precio || habitacion.Precio || 0}" required>
              </div>
              <div class="form-group">
                <label for="editCapacidad">Capacidad:</label>
                <input type="number" id="editCapacidad" value="${habitacion.capacidad || habitacion.Capacidad || 1}" required>
              </div>
              <div class="form-group">
                <label for="editEstado">Estado:</label>
                <select id="editEstado" required>
                  <option value="Disponible" ${String(habitacion.estado || habitacion.EstadoNombre || '').toLowerCase() === 'disponible' ? 'selected' : ''}>Disponible</option>
                  <option value="Ocupada" ${String(habitacion.estado || habitacion.EstadoNombre || '').toLowerCase() === 'ocupada' ? 'selected' : ''}>Ocupada</option>
                  <option value="Mantenimiento" ${String(habitacion.estado || habitacion.EstadoNombre || '').toLowerCase() === 'mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
                </select>
              </div>
              <div class="form-group">
                <label for="editDescripcion">Descripción:</label>
                <textarea id="editDescripcion" rows="3">${habitacion.descripcion || habitacion.Descripcion || ''}</textarea>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" onclick="window.location.hash='habitaciones'" class="btn-secondary">
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

    const form = this.container.querySelector('#editHabitacionForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = {
        Numero: this.container.querySelector('#editNumero').value,
        Tipo: this.container.querySelector('#editTipo').value,
        Precio: parseFloat(this.container.querySelector('#editPrecio').value),
        Capacidad: parseInt(this.container.querySelector('#editCapacidad').value),
        Estado: this.container.querySelector('#editEstado').value,
        Descripcion: this.container.querySelector('#editDescripcion').value
      };

      try {
        await updateHabitacion(id, formData);
        alert('Habitación actualizada exitosamente');
        window.location.hash='habitaciones';
      } catch (error) {
        alert('Error actualizando habitación: ' + error.message);
      }
    });
  }

  showNewHabitacionModal() {
    this.container.innerHTML = `
      <div class="habitacion-new-view">
        <div class="new-header">
          <button onclick="window.location.hash='habitaciones'" class="btn-back">
            ← Volver a la lista
          </button>
          <h2>Nueva Habitación</h2>
        </div>
        
        <div class="new-content">
          <form id="newHabitacionForm" class="habitacion-form">
            <div class="form-grid">
              <div class="form-group">
                <label for="newNumero">Número:</label>
                <input type="text" id="newNumero" required>
              </div>
              <div class="form-group">
                <label for="newTipo">Tipo:</label>
                <select id="newTipo" required>
                  <option value="Sencilla">Sencilla</option>
                  <option value="Doble">Doble</option>
                  <option value="Suite">Suite</option>
                </select>
              </div>
              <div class="form-group">
                <label for="newPrecio">Precio:</label>
                <input type="number" id="newPrecio" required>
              </div>
              <div class="form-group">
                <label for="newCapacidad">Capacidad:</label>
                <input type="number" id="newCapacidad" required>
              </div>
              <div class="form-group">
                <label for="newEstado">Estado:</label>
                <select id="newEstado" required>
                  <option value="Disponible">Disponible</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                </select>
              </div>
              <div class="form-group">
                <label for="newDescripcion">Descripción:</label>
                <textarea id="newDescripcion" rows="3"></textarea>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" onclick="window.location.hash='habitaciones'" class="btn-secondary">
                Cancelar
              </button>
              <button type="submit" class="btn-primary">
                💾 Guardar Habitación
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const form = this.container.querySelector('#newHabitacionForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = {
        Numero: this.container.querySelector('#newNumero').value,
        Tipo: this.container.querySelector('#newTipo').value,
        Precio: parseFloat(this.container.querySelector('#newPrecio').value),
        Capacidad: parseInt(this.container.querySelector('#newCapacidad').value),
        Estado: this.container.querySelector('#newEstado').value,
        Descripcion: this.container.querySelector('#newDescripcion').value
      };

      try {
        await createHabitacion(formData);
        alert('Habitación creada exitosamente');
        window.location.hash='habitaciones';
      } catch (error) {
        console.error('Error creando habitación via API:', error);
        // Si falla la API, agregar localmente
        const nuevaHabitacion = {
          IDHabitacion: String(this.habitaciones.length + 1),
          ...formData
        };
        this.habitaciones.push(nuevaHabitacion);
        this.calculateMetrics();
        alert('Habitación creada localmente (backend no disponible)');
        window.location.hash='habitaciones';
      }
    });
  }

  async delete(id) {
    if (confirm('¿Está seguro de que desea eliminar esta habitación?')) {
      try {
        await deleteHabitacion(id);
        alert('Habitación eliminada exitosamente');
        await this.loadData();
        this.render();
      } catch (error) {
        console.error('Error eliminando habitación via API:', error);
        // Si falla la API, eliminar localmente
        this.habitaciones = this.habitaciones.filter(h => (h.IDHabitacion != id && h.id_habitacion != id));
        this.calculateMetrics();
        this.render();
        alert('Habitación eliminada localmente (backend no disponible)');
      }
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
