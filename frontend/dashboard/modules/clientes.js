import { 
  getClientes, 
  createCliente, 
  updateCliente, 
  deleteCliente, 
  toggleEstadoCliente 
} from "../core/api.js";

class ClientesModule {
  constructor(container) {
    this.container = container;
    this.clientes = [];
    this.currentData = {
      total: 0,
      activos: 0,
      nuevos: 0,
      premium: 0
    };
  }

  async initialize() {
    try {
      await this.loadData();
      this.render();
      this.setupEventListeners();
    } catch (error) {
      console.error(error);
      this.showError("Error al cargar clientes", "Recarga la página");
    }
  }

  async loadData() {
    const response = await getClientes();

    this.clientes = (response.data || response || []).map(c => ({
      ...c,
      Estado: String(c.Estado),
      IDRol: String(c.IDRol)
    }));

    this.calculateMetrics();
  }

  calculateMetrics() {
    const total = this.clientes.length;
    const activos = this.clientes.filter(c => c.Estado === '1').length;
    const premium = this.clientes.filter(c => c.IDRol === '2').length;

    this.currentData = { total, activos, nuevos: 0, premium };
  }

  render() {
    this.container.innerHTML = this.getTemplate();
    this.updateMetrics();
    this.renderTable();
  }

  getTemplate() {
    return `
      <header class="module-header">
        <div class="header-left">
          <h1>Clientes</h1>
          <p>Gestión de clientes del hotel</p>
        </div>
        <div class="header-right">
          <button class="btn-primary" onclick="window.clientesModule.showNewClientModal()">
            <span>➕</span> Nuevo Cliente
          </button>
        </div>
      </header>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-title">Total Clientes</div>
            <div class="metric-icon blue">👥</div>
          </div>
          <div class="metric-value" id="totalClientes">0</div>
          <div class="metric-change">
            <span>📊</span> Total registrados
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-title">Clientes Activos</div>
            <div class="metric-icon green">✅</div>
          </div>
          <div class="metric-value" id="clientesActivos">0</div>
          <div class="metric-change positive">
            <span>↑</span> Cuentas activas
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-title">Clientes Premium</div>
            <div class="metric-icon purple">⭐</div>
          </div>
          <div class="metric-value" id="clientesPremium">0</div>
          <div class="metric-change">
            <span>👑</span> Membresía premium
          </div>
        </div>
      </div>

      <div class="search-section">
        <div class="search-container">
          <input type="text" id="searchClientes" placeholder="Buscar cliente..." class="search-input">
          <button class="btn-secondary" onclick="window.clientesModule.search()">
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
            <option value="regular">Regular</option>
            <option value="premium">Premium</option>
          </select>
        </div>
      </div>

      <div class="table-card">
        <div class="table-header">
          <h3 class="table-title">Lista de Clientes</h3>
          <div class="table-actions">
            <button class="btn-secondary" onclick="window.clientesModule.exportData()">
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
                <th>Email</th>
                <th>Teléfono</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="clientesTableBody">
              <tr><td colspan="7" class="text-center">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  updateMetrics() {
    this.container.querySelector("#totalClientes").textContent = this.currentData.total;
    this.container.querySelector("#clientesActivos").textContent = this.currentData.activos;
    this.container.querySelector("#clientesPremium").textContent = this.currentData.premium;
  }

  setupEventListeners() {
    this.container.querySelector("#searchClientes")
      .addEventListener("input", () => this.search());

    this.container.querySelector("#filterEstado")
      .addEventListener("change", () => this.filter());

    this.container.querySelector("#filterTipo")
      .addEventListener("change", () => this.filter());
  }

  renderTable(data = this.clientes) {
    const tbody = this.container.querySelector("#clientesTableBody");

    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay clientes registrados</td></tr>';
      return;
    }

    const tableHTML = data.map((cliente, index) => {
      const nombreCompleto = `${cliente.Nombre || ''} ${cliente.Apellido || ''}`.trim() || 'Sin nombre';
      
      return `
        <tr>
          <td>${cliente.NroDocumento || 'N/A'}</td>
          <td>${nombreCompleto}</td>
          <td>${cliente.Email || 'Sin email'}</td>
          <td>${cliente.Telefono || 'Sin teléfono'}</td>
          <td>
            <span class="status-badge ${this.getTipoClass(cliente.IDRol)}">
              ${this.getTipoText(cliente.IDRol)}
            </span>
          </td>
          <td>
            <span class="status-badge ${this.getStatusClass(cliente.Estado)}">
              ${this.getStatusText(cliente.Estado)}
            </span>
          </td>
          <td>${cliente.Direccion || 'Sin dirección'}</td>
          <td>
            <div class="action-buttons">
              <button class="btn-icon btn-view" onclick="window.clientesModule.view('${cliente.NroDocumento}')" title="Ver detalle">
                👁️
              </button>
              <button class="btn-icon btn-edit" onclick="window.clientesModule.edit('${cliente.NroDocumento}')" title="Editar">
                ✏️
              </button>
              <button class="btn-icon btn-toggle" onclick="window.clientesModule.toggleStatus('${cliente.NroDocumento}')" title="Cambiar estado">
                🔄
              </button>
              <button class="btn-icon btn-delete" onclick="window.clientesModule.delete('${cliente.NroDocumento}')" title="Eliminar">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    
    tbody.innerHTML = tableHTML;
  }

  search() {
    const term = this.container.querySelector("#searchClientes").value.toLowerCase();

    const filtered = this.clientes.filter(c =>
      `${c.Nombre} ${c.Apellido}`.toLowerCase().includes(term) ||
      (c.Email || '').toLowerCase().includes(term)
    );

    this.renderTable(filtered);
  }

  filter() {
    const estado = this.container.querySelector("#filterEstado").value;
    const tipo = this.container.querySelector("#filterTipo").value;

    let filtered = this.clientes;

    if (estado) {
      filtered = filtered.filter(c =>
        estado === "activo" ? c.Estado === "1" : c.Estado === "0"
      );
    }

    if (tipo) {
      filtered = filtered.filter(c =>
        tipo === "premium" ? c.IDRol === "2" : c.IDRol === "1"
      );
    }

    this.renderTable(filtered);
  }

  getTipoClass(rolId) {
    switch (String(rolId || '')) {
      case '2':
        return 'status-premium';
      case '1':
      default:
        return 'status-regular';
    }
  }

  getTipoText(rolId) {
    switch (String(rolId || '')) {
      case '2':
        return 'Premium';
      case '1':
      default:
        return 'Regular';
    }
  }

  getStatusClass(estado) {
    switch (String(estado || '')) {
      case '1':
        return 'status-active';
      case '0':
        return 'status-inactive';
      default:
        return 'status-unknown';
    }
  }

  getStatusText(estado) {
    switch (String(estado || '')) {
      case '1':
        return 'Activo';
      case '0':
        return 'Inactivo';
      default:
        return 'Desconocido';
    }
  }

  view(id) {
    const cliente = this.clientes.find(c => c.NroDocumento === id);
    if (!cliente) {
      alert('Cliente no encontrado');
      return;
    }

    const nombreCompleto = `${cliente.Nombre || ''} ${cliente.Apellido || ''}`.trim() || 'Sin nombre';
    
    this.container.innerHTML = `
      <div class="client-detail-view">
        <div class="detail-header">
          <button onclick="window.clientesModule.render()" class="btn-back">
            ← Volver a la lista
          </button>
          <h2>Detalle del Cliente</h2>
        </div>
        
        <div class="detail-content">
          <div class="detail-card">
            <h3>Información Personal</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <label>Documento:</label>
                <span>${cliente.NroDocumento}</span>
              </div>
              <div class="detail-item">
                <label>Nombre:</label>
                <span>${nombreCompleto}</span>
              </div>
              <div class="detail-item">
                <label>Email:</label>
                <span>${cliente.Email || 'No especificado'}</span>
              </div>
              <div class="detail-item">
                <label>Teléfono:</label>
                <span>${cliente.Telefono || 'No especificado'}</span>
              </div>
              <div class="detail-item">
                <label>Dirección:</label>
                <span>${cliente.Direccion || 'No especificada'}</span>
              </div>
              <div class="detail-item">
                <label>Rol:</label>
                <span class="status-badge ${this.getTipoClass(cliente.IDRol)}">${this.getTipoText(cliente.IDRol)}</span>
              </div>
              <div class="detail-item">
                <label>Estado:</label>
                <span class="status-badge ${this.getStatusClass(cliente.Estado)}">${this.getStatusText(cliente.Estado)}</span>
              </div>
            </div>
          </div>
          
          <div class="detail-actions">
            <button onclick="window.clientesModule.edit('${cliente.NroDocumento}')" class="btn-primary">
              ✏️ Editar Cliente
            </button>
            <button onclick="window.clientesModule.toggleStatus('${cliente.NroDocumento}')" class="btn-secondary">
              🔄 Cambiar Estado
            </button>
          </div>
        </div>
      </div>
    `;
  }

  edit(id) {
    const cliente = this.clientes.find(c => c.NroDocumento === id);
    if (!cliente) {
      alert('Cliente no encontrado');
      return;
    }

    const nombreCompleto = `${cliente.Nombre || ''} ${cliente.Apellido || ''}`.trim() || '';
    const [nombre, apellido] = nombreCompleto.split(' ').reduce((acc, part, i, arr) => {
      if (i === 0) acc[0] = part;
      else if (i === arr.length - 1) acc[1] = part;
      else acc[0] += ' ' + part;
      return acc;
    }, ['', '']);

    this.container.innerHTML = `
      <div class="client-edit-view">
        <div class="edit-header">
          <button onclick="window.clientesModule.render()" class="btn-back">
            ← Volver a la lista
          </button>
          <h2>Editar Cliente</h2>
        </div>
        
        <div class="edit-content">
          <form id="editClientForm" class="client-form">
            <div class="form-grid">
              <div class="form-group">
                <label for="editNroDocumento">Documento:</label>
                <input type="text" id="editNroDocumento" value="${cliente.NroDocumento}" readonly>
              </div>
              <div class="form-group">
                <label for="editNombre">Nombre:</label>
                <input type="text" id="editNombre" value="${nombre}" required>
              </div>
              <div class="form-group">
                <label for="editApellido">Apellido:</label>
                <input type="text" id="editApellido" value="${apellido}" required>
              </div>
              <div class="form-group">
                <label for="editEmail">Email:</label>
                <input type="email" id="editEmail" value="${cliente.Email || ''}">
              </div>
              <div class="form-group">
                <label for="editTelefono">Teléfono:</label>
                <input type="tel" id="editTelefono" value="${cliente.Telefono || ''}">
              </div>
              <div class="form-group">
                <label for="editDireccion">Dirección:</label>
                <input type="text" id="editDireccion" value="${cliente.Direccion || ''}">
              </div>
              <div class="form-group">
                <label for="editIDRol">Rol:</label>
                <select id="editIDRol">
                  <option value="1" ${cliente.IDRol == 1 ? 'selected' : ''}>Regular</option>
                  <option value="2" ${cliente.IDRol == 2 ? 'selected' : ''}>Premium</option>
                </select>
              </div>
              <div class="form-group">
                <label for="editEstado">Estado:</label>
                <select id="editEstado">
                  <option value="1" ${cliente.Estado == 1 ? 'selected' : ''}>Activo</option>
                  <option value="0" ${cliente.Estado == 0 ? 'selected' : ''}>Inactivo</option>
                </select>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" onclick="window.clientesModule.render()" class="btn-secondary">
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

    const form = this.container.querySelector('#editClientForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveClient(id);
    });
  }

  async saveClient(id) {
    const formData = {
      NroDocumento: id,
      Nombre: this.container.querySelector('#editNombre').value,
      Apellido: this.container.querySelector('#editApellido').value,
      Email: this.container.querySelector('#editEmail').value,
      Telefono: this.container.querySelector('#editTelefono').value,
      Direccion: this.container.querySelector('#editDireccion').value,
      IDRol: parseInt(this.container.querySelector('#editIDRol').value),
      Estado: parseInt(this.container.querySelector('#editEstado').value)
    };

    try {
      console.log('Actualizando cliente:', formData);
      await updateCliente(id, formData);
      alert('Cliente actualizado exitosamente');
      await this.loadData();
      this.render();
    } catch (error) {
      console.error('Error guardando cliente:', error);
      alert('Error al guardar el cliente: ' + (error.message || 'Error desconocido'));
    }
  }

  async toggleStatus(id) {
    const cliente = this.clientes.find(c => c.NroDocumento === id);
    if (!cliente) {
      alert('Cliente no encontrado');
      return;
    }

    const nuevoEstado = cliente.Estado == 1 ? 0 : 1;
    const confirmMessage = `¿Está seguro de cambiar el estado del cliente a ${nuevoEstado == 1 ? 'Activo' : 'Inactivo'}?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      console.log(`Cambiando estado de cliente ${id} a ${nuevoEstado}`);
      await toggleEstadoCliente(id, nuevoEstado);
      alert(`Estado del cliente cambiado a ${nuevoEstado == 1 ? 'Activo' : 'Inactivo'}`);
      await this.loadData();
      this.render();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      alert('Error al cambiar el estado del cliente: ' + (error.message || 'Error desconocido'));
    }
  }

  async delete(id) {
    const cliente = this.clientes.find(c => c.NroDocumento === id);
    if (!cliente) {
      alert('Cliente no encontrado');
      return;
    }

    const nombreCompleto = `${cliente.Nombre || ''} ${cliente.Apellido || ''}`.trim() || 'Sin nombre';
    
    if (!confirm(`¿Está seguro de eliminar al cliente "${nombreCompleto}" (${id})? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      console.log(`Eliminando cliente ${id}`);
      await deleteCliente(id);
      alert('Cliente eliminado exitosamente');
      await this.loadData();
      this.render();
    } catch (error) {
      console.error('Error eliminando cliente:', error);
      alert('Error al eliminar el cliente: ' + (error.message || 'Error desconocido'));
    }
  }

  showNewClientModal() {
    this.container.innerHTML = `
      <div class="client-new-view">
        <div class="new-header">
          <button onclick="window.clientesModule.render()" class="btn-back">
            ← Volver a la lista
          </button>
          <h2>Nuevo Cliente</h2>
        </div>
        
        <div class="new-content">
          <form id="newClientForm" class="client-form">
            <div class="form-grid">
              <div class="form-group">
                <label for="newNroDocumento">Documento:</label>
                <input type="text" id="newNroDocumento" required>
              </div>
              <div class="form-group">
                <label for="newNombre">Nombre:</label>
                <input type="text" id="newNombre" required>
              </div>
              <div class="form-group">
                <label for="newApellido">Apellido:</label>
                <input type="text" id="newApellido" required>
              </div>
              <div class="form-group">
                <label for="newEmail">Email:</label>
                <input type="email" id="newEmail">
              </div>
              <div class="form-group">
                <label for="newTelefono">Teléfono:</label>
                <input type="tel" id="newTelefono">
              </div>
              <div class="form-group">
                <label for="newDireccion">Dirección:</label>
                <input type="text" id="newDireccion">
              </div>
              <div class="form-group">
                <label for="newIDRol">Rol:</label>
                <select id="newIDRol">
                  <option value="1">Regular</option>
                  <option value="2">Premium</option>
                </select>
              </div>
              <div class="form-group">
                <label for="newEstado">Estado:</label>
                <select id="newEstado">
                  <option value="1">Activo</option>
                  <option value="0">Inactivo</option>
                </select>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" onclick="window.clientesModule.render()" class="btn-secondary">
                Cancelar
              </button>
              <button type="submit" class="btn-primary">
                ➕ Crear Cliente
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const form = this.container.querySelector('#newClientForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.createClient();
    });
  }

  async createClient() {
    const formData = {
      NroDocumento: this.container.querySelector('#newNroDocumento').value,
      Nombre: this.container.querySelector('#newNombre').value,
      Apellido: this.container.querySelector('#newApellido').value,
      Email: this.container.querySelector('#newEmail').value,
      Telefono: this.container.querySelector('#newTelefono').value,
      Direccion: this.container.querySelector('#newDireccion').value,
      IDRol: parseInt(this.container.querySelector('#newIDRol').value),
      Estado: parseInt(this.container.querySelector('#newEstado').value)
    };

    try {
      console.log('Creando cliente:', formData);
      await createCliente(formData);
      alert('Cliente creado exitosamente');
      await this.loadData();
      this.render();
    } catch (error) {
      console.error('Error creando cliente:', error);
      alert('Error al crear el cliente: ' + (error.message || 'Error desconocido'));
    }
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

export function renderClientes(container) {
  window.clientesModule = new ClientesModule(container);
  window.clientesModule.initialize();
}