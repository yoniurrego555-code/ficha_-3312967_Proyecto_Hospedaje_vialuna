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
      inactivos: 0
    };
  }

  async initialize() {
    console.log('ðŸ”„ Inicializando ClientesModule...');
    try {
      await this.loadData();
      console.log('âœ… Datos cargados');
      this.render();
      console.log('âœ… Render completado');
      this.setupEventListeners();
      console.log('âœ… Event listeners configurados');
    } catch (error) {
      console.error('âŒ Error en initialize:', error);
      this.showError("Error al cargar clientes", "Recarga la pÃ¡gina");
    }
  }

  async loadData() {
    try {
      const response = await getClientes();

      this.clientes = (response.data || response || []).map(c => ({
        ...c,
        Estado: String(c.Estado),
        IDRol: String(c.IDRol)
      }));

      this.calculateMetrics();
    } catch (error) {
      console.error('Error cargando clientes desde API:', error);
      this.clientes = [];
      this.calculateMetrics();
      throw error;
    }
  }

  calculateMetrics() {
    const total = this.clientes.length;
    const activos = this.clientes.filter(c => c.Estado === '1').length;
    const inactivos = this.clientes.filter(c => c.Estado === '0').length;

    this.currentData = { total, activos, inactivos };
  }

  render(data = this.clientes) {
    this.updateMetrics();
    this.renderTable(data);
    // Ensure module is always available globally after render
    window.clientesModule = this;
  }

  async showList() {
    try {
      // Recargar el HTML de clientes desde el servidor
      const response = await fetch('../admin/clientes.html');
      if (!response.ok) throw new Error('No se pudo cargar la vista de clientes');
      const html = await response.text();
      this.container.innerHTML = html;
      
      // Ahora renderizar la tabla con el HTML correcto
      this.render();
      this.setupEventListeners();
    } catch (error) {
      console.error('Error recargando HTML de clientes:', error);
      // Si falla la recarga, intentar renderizar con el contenido actual
      this.render();
      this.setupEventListeners();
    }
  }

  updateMetrics() {
    const totalElement = this.container.querySelector("#totalClientes");
    const activosElement = this.container.querySelector("#clientesActivos");
    const inactivosElement = this.container.querySelector("#clientesInactivos");

    if (totalElement) totalElement.textContent = this.currentData.total;
    if (activosElement) activosElement.textContent = this.currentData.activos;
    if (inactivosElement) inactivosElement.textContent = this.currentData.inactivos;
  }

  setupEventListeners() {
    const searchElement = this.container.querySelector("#searchClientes");
    const filterEstadoElement = this.container.querySelector("#filterEstado");

    if (searchElement) {
      searchElement.addEventListener("input", () => this.search());
    }

    if (filterEstadoElement) {
      filterEstadoElement.addEventListener("change", () => this.filter());
    }
  }

  renderTable(data = this.clientes) {
    // Esperar un ciclo de renderizado para asegurar que el DOM estÃ© actualizado
    setTimeout(() => {
      const tbody = this.container.querySelector("#clientesTableBody");
      const table = this.container.querySelector("table");
      const tableWrapper = table ? table.closest('.table-container') : null;
      
      if (table) table.className = "w-full border-collapse text-left text-sm text-gray-500";
      if (tableWrapper) tableWrapper.className = "bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden";

      if (!tbody) {
        console.error('âŒ tbody #clientesTableBody no encontrado en container');
        return;
      }
      
      this._renderTableContent(data, tbody);
    }, 50);
  }

  _renderTableContent(data, tbody) {
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-8 text-center text-muted font-semibold">No hay huÃ©spedes registrados</td></tr>';
      return;
    }

    const tableHTML = data.map((cliente, index) => {
      const nombreCompleto = `${cliente.Nombre || cliente.Nombres || ''} ${cliente.Apellido || cliente.Apellidos || ''}`.trim() || 'Sin nombre';
      const docType = cliente.TipoDocumento || 'CC';
      const docNum = cliente.NroDocumento || cliente.nro_documento || 'N/A';
      const status = String(cliente.Estado);
      
      return `
        <tr class="hover:bg-gray-50/50 transition-all duration-200">
          <td class="px-6 py-4 font-semibold text-brand-deep">${docType}</td>
          <td class="px-6 py-4 font-semibold text-gray-400">${docNum}</td>
          <td class="px-6 py-4 font-semibold text-brand-deep">${nombreCompleto}</td>
          <td class="px-6 py-4 text-xs text-muted">${cliente.Email || 'Sin email'}</td>
          <td class="px-6 py-4 font-semibold text-gray-600">${cliente.Telefono || 'Sin telÃ©fono'}</td>
          <td class="px-6 py-4">
            <div class="flex items-center gap-3">
              <label class="relative inline-block w-11 h-6 m-0 cursor-pointer shrink-0">
                <input type="checkbox" class="sr-only peer" ${status == '1' ? 'checked' : ''} 
                       onchange="window.clientesModule.changeStatusFromDropdown('${docNum}', this.checked ? 1 : 0)">
                <span class="absolute inset-0 rounded-full bg-slate-200 peer-checked:bg-emerald-500 transition-colors duration-300 before:content-[''] before:absolute before:h-[18px] before:w-[18px] before:left-[3px] before:bottom-[3px] before:bg-white before:rounded-full before:transition-transform before:duration-300 peer-checked:before:translate-x-5"></span>
              </label>
              <span class="px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all duration-300 ${status == '1' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                ${status == '1' ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </td>
          <td class="px-6 py-4">
            <div class="action-group-modern">
              <button class="btn-action-modern view" onclick="window.clientesModule.view('${docNum}')" title="Ver detalle">
                ðŸ”
              </button>
              <button class="btn-action-modern edit" onclick="window.clientesModule.edit('${docNum}')" title="Editar">
                âœï¸
              </button>
              <button class="btn-action-modern delete" onclick="window.clientesModule.delete('${docNum}')" title="Eliminar">
                ðŸ—‘ï¸
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
      `${c.Nombre || c.Nombres || ''} ${c.Apellido || c.Apellidos || ''}`.toLowerCase().includes(term) ||
      (c.Email || '').toLowerCase().includes(term) ||
      (c.NroDocumento || c.nro_documento || '').toLowerCase().includes(term)
    );

    this.renderTable(filtered);
  }

  filter() {
    const estadoElem = this.container.querySelector("#filterEstado");
    const estado = estadoElem ? estadoElem.value : "";

    let filtered = this.clientes;

    if (estado) {
      filtered = filtered.filter(c =>
        estado === "activo" ? c.Estado === "1" : c.Estado === "0"
      );
    }

    this.renderTable(filtered);
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

  // Export Data to CSV
  exportData() {
    if (!this.clientes.length) {
      alert("No hay clientes para exportar");
      return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Tipo Documento,Documento,Nombre,Email,Telefono,Estado\n";
    
    this.clientes.forEach(c => {
      const nombreCompleto = `${c.Nombre || c.Nombres || ''} ${c.Apellido || c.Apellidos || ''}`.trim();
      const row = [
        c.TipoDocumento || "CC",
        c.NroDocumento || "",
        nombreCompleto,
        c.Email || "",
        c.Telefono || "",
        c.Estado == "1" ? "Activo" : "Inactivo"
      ].map(val => `"${val.replace(/"/g, '""')}"`).join(",");
      
      csvContent += row + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `clientes_vialuna_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  view(id) {
    const cliente = this.clientes.find(c => (c.NroDocumento || c.nro_documento) === id);
    if (!cliente) {
      alert('Cliente no encontrado');
      return;
    }

    const nombreCompleto = `${cliente.Nombre || cliente.Nombres || ''} ${cliente.Apellido || cliente.Apellidos || ''}`.trim() || 'Sin nombre';
    
    this.container.innerHTML = `
      <div class="max-w-2xl mx-auto p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-sm">
        <div class="flex items-center justify-between border-b border-gray-100 pb-5 mb-6">
          <h2 class="text-xl font-bold text-brand-deep m-0 flex items-center gap-2">ðŸ” Detalle del HuÃ©sped</h2>
          <button onclick="window.clientesModule.showList()" class="px-4 py-2 bg-gray-50 border border-gray-200 text-brand-deep text-xs font-bold rounded-xl hover:bg-gray-100 cursor-pointer transition-all duration-300">
            â† Volver a la lista
          </button>
        </div>
        
        <div class="flex flex-col gap-6">
          <!-- Main Details -->
          <div class="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-4">
            <h3 class="text-xs font-bold text-brand-deep uppercase tracking-wider m-0">InformaciÃ³n Personal</h3>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div class="flex flex-col gap-1">
                <span class="text-xs text-muted font-semibold uppercase tracking-wide">Tipo Documento:</span>
                <span class="font-bold text-brand-deep">${cliente.TipoDocumento || 'CC'}</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-xs text-muted font-semibold uppercase tracking-wide">Nro Documento:</span>
                <span class="font-bold text-brand-deep">${cliente.NroDocumento || cliente.nro_documento}</span>
              </div>
              <div class="flex flex-col gap-1 sm:col-span-2">
                <span class="text-xs text-muted font-semibold uppercase tracking-wide">Nombre Completo:</span>
                <span class="font-bold text-brand-deep text-base">${nombreCompleto}</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-xs text-muted font-semibold uppercase tracking-wide">Email:</span>
                <span class="font-bold text-brand-deep text-xs break-all">${cliente.Email || 'No especificado'}</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-xs text-muted font-semibold uppercase tracking-wide">TelÃ©fono:</span>
                <span class="font-bold text-brand-deep">${cliente.Telefono || 'No especificado'}</span>
              </div>
              <div class="flex flex-col gap-1 sm:col-span-2 mt-2 pt-2 border-t border-gray-200/50">
                <span class="text-xs text-muted font-semibold uppercase tracking-wide">Estado Cuenta:</span>
                <span class="inline-block px-3 py-1 rounded-full text-xs font-bold w-max mt-1 ${cliente.Estado == '1' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                  ${this.getStatusText(cliente.Estado)}
                </span>
              </div>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
            <button onclick="window.clientesModule.edit('${id}')" class="px-5 py-3 rounded-xl bg-brand text-white font-semibold shadow-md shadow-brand/10 hover:bg-brand-deep cursor-pointer transition-all border-none text-xs">
              âœï¸ Editar HuÃ©sped
            </button>
            <button onclick="window.clientesModule.toggleStatus('${id}')" class="px-5 py-3 rounded-xl border border-gray-200 text-brand-deep font-semibold bg-white hover:bg-gray-50 cursor-pointer transition-all text-xs">
              ðŸ”„ Cambiar Estado
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Ensure module is globally available for onclick handlers
    window.clientesModule = this;
  }

  edit(id) {
    const cliente = this.clientes.find(c => (c.NroDocumento || c.nro_documento) === id);
    if (!cliente) {
      alert('Cliente no encontrado');
      return;
    }

    const nombre = cliente.Nombre || cliente.Nombres || '';
    const apellido = cliente.Apellido || cliente.Apellidos || '';

    this.container.innerHTML = `
      <div class="max-w-2xl mx-auto p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-sm">
        <div class="flex items-center justify-between border-b border-gray-100 pb-5 mb-6">
          <h2 class="text-xl font-bold text-brand-deep m-0 flex items-center gap-2">âœï¸ Editar HuÃ©sped</h2>
          <button onclick="window.clientesModule.showList()" class="px-4 py-2 bg-gray-50 border border-gray-200 text-brand-deep text-xs font-bold rounded-xl hover:bg-gray-100 cursor-pointer transition-all duration-300">
            â† Volver a la lista
          </button>
        </div>
        
        <form id="editClientForm" class="flex flex-col gap-5 m-0 p-0">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Tipo Documento:</label>
              <select id="editTipoDocumento" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer">
                <option value="CC" ${cliente.TipoDocumento === 'CC' ? 'selected' : ''}>CÃ©dula de CiudadanÃ­a</option>
                <option value="TI" ${cliente.TipoDocumento === 'TI' ? 'selected' : ''}>Tarjeta de Identidad</option>
                <option value="CE" ${cliente.TipoDocumento === 'CE' ? 'selected' : ''}>CÃ©dula de ExtranjerÃ­a</option>
                <option value="Pasaporte" ${cliente.TipoDocumento === 'Pasaporte' ? 'selected' : ''}>Pasaporte</option>
              </select>
            </div>
            
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Documento:</label>
              <input type="text" id="editNroDocumento" value="${cliente.NroDocumento || cliente.nro_documento}" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-100 text-sm font-semibold focus:outline-none cursor-not-allowed" readonly>
            </div>
            
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Nombre:</label>
              <input type="text" id="editNombre" value="${nombre}" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20" required>
            </div>
            
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Apellido:</label>
              <input type="text" id="editApellido" value="${apellido}" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20" required>
            </div>
            
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Email:</label>
              <input type="email" id="editEmail" value="${cliente.Email || ''}" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20">
            </div>
            
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">TelÃ©fono:</label>
              <input type="tel" id="editTelefono" value="${cliente.Telefono || ''}" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20">
            </div>

            <div class="flex flex-col gap-2 sm:col-span-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Estado:</label>
              <select id="editEstado" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer">
                <option value="1" ${cliente.Estado == 1 ? 'selected' : ''}>Activo</option>
                <option value="0" ${cliente.Estado == 0 ? 'selected' : ''}>Inactivo</option>
              </select>
            </div>
          </div>
          
          <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button type="button" onclick="window.clientesModule.showList()" class="px-5 py-3 rounded-xl border border-gray-200 text-muted font-semibold bg-white hover:bg-gray-50 cursor-pointer transition-all duration-300 text-sm">Cancelar</button>
            <button type="submit" class="px-7 py-3 rounded-xl bg-brand text-white font-semibold shadow-md shadow-brand/10 hover:bg-brand-deep active:scale-98 transition-all duration-300 border-none cursor-pointer text-sm">ðŸ’¾ Guardar Cambios</button>
          </div>
        </form>
      </div>
    `;

    const form = this.container.querySelector('#editClientForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveClient(id);
    });
    
    // Ensure module is globally available for onclick handlers
    window.clientesModule = this;
  }

  async saveClient(id) {
    const formData = {
      NroDocumento: id,
      Nombre: this.container.querySelector('#editNombre').value,
      Apellido: this.container.querySelector('#editApellido').value,
      Email: this.container.querySelector('#editEmail').value,
      Telefono: this.container.querySelector('#editTelefono').value,
      TipoDocumento: this.container.querySelector('#editTipoDocumento').value,
      IDRol: 1, // Defaulting regular role
      Estado: parseInt(this.container.querySelector('#editEstado').value)
    };

    try {
      console.log('Actualizando cliente:', formData);
      await updateCliente(id, formData);
      alert('Cliente actualizado exitosamente');
      await this.loadData();
      this.showList();
    } catch (error) {
      console.error('Error guardando cliente:', error);
      alert('Error al guardar el cliente: ' + (error.message || 'Error desconocido'));
    }
  }

  async toggleStatus(id) {
    const cliente = this.clientes.find(c => (c.NroDocumento || c.nro_documento) === id);
    if (!cliente) {
      alert('Cliente no encontrado');
      return;
    }

    const nuevoEstado = cliente.Estado == 1 ? 0 : 1;
    await this._doChangeStatus(id, nuevoEstado);
  }

  async changeStatusFromDropdown(id, nuevoEstado) {
    await this._doChangeStatus(id, nuevoEstado);
  }

  async _doChangeStatus(id, nuevoEstado) {
    const confirmMessage = `Â¿EstÃ¡ seguro de cambiar el estado del cliente a ${nuevoEstado == 1 ? 'Activo' : 'Inactivo'}?`;
    
    if (!confirm(confirmMessage)) {
      this.render(); // Re-render to revert the dropdown selection if cancelled
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
      this.render();
    }
  }

  async delete(id) {
    const cliente = this.clientes.find(c => (c.NroDocumento || c.nro_documento) === id);
    if (!cliente) {
      alert('Cliente no encontrado');
      return;
    }

    const nombreCompleto = `${cliente.Nombre || cliente.Nombres || ''} ${cliente.Apellido || cliente.Apellidos || ''}`.trim() || 'Sin nombre';
    
    if (!confirm(`Â¿EstÃ¡ seguro de eliminar al cliente "${nombreCompleto}" (${id})? Esta acciÃ³n no se puede deshacer.`)) {
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
      <div class="max-w-2xl mx-auto p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-sm">
        <div class="flex items-center justify-between border-b border-gray-100 pb-5 mb-6">
          <h2 class="text-xl font-bold text-brand-deep m-0 flex items-center gap-2">âž• Registrar Nuevo HuÃ©sped</h2>
          <button onclick="window.clientesModule.showList()" class="px-4 py-2 bg-gray-50 border border-gray-200 text-brand-deep text-xs font-bold rounded-xl hover:bg-gray-100 cursor-pointer transition-all duration-300">
            â† Volver a la lista
          </button>
        </div>
        
        <form id="newClientForm" class="flex flex-col gap-5 m-0 p-0">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Tipo Documento:</label>
              <select id="newTipoDocumento" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer">
                <option value="CC">CÃ©dula de CiudadanÃ­a</option>
                <option value="TI">Tarjeta de Identidad</option>
                <option value="CE">CÃ©dula de ExtranjerÃ­a</option>
                <option value="Pasaporte">Pasaporte</option>
              </select>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Documento:</label>
              <input type="text" id="newNroDocumento" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20" required>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Nombre:</label>
              <input type="text" id="newNombre" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20" required>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Apellido:</label>
              <input type="text" id="newApellido" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20" required>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Email:</label>
              <input type="email" id="newEmail" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20">
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">TelÃ©fono:</label>
              <input type="tel" id="newTelefono" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20">
            </div>
            <div class="flex flex-col gap-2 sm:col-span-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Estado Inicial:</label>
              <select id="newEstado" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer">
                <option value="1">Activo</option>
                <option value="0">Inactivo</option>
              </select>
            </div>
          </div>
          
          <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button type="button" onclick="window.clientesModule.showList()" class="px-5 py-3 rounded-xl border border-gray-200 text-muted font-semibold bg-white hover:bg-gray-50 cursor-pointer transition-all duration-300 text-sm">Cancelar</button>
            <button type="submit" class="px-7 py-3 rounded-xl bg-brand text-white font-semibold shadow-md shadow-brand/10 hover:bg-brand-deep active:scale-98 transition-all duration-300 border-none cursor-pointer text-sm">âž• Crear Cliente</button>
          </div>
        </form>
      </div>
    `;

    const form = this.container.querySelector('#newClientForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.createClient();
    });
    
    // Ensure module is globally available for onclick handlers
    window.clientesModule = this;
  }

  async createClient() {
    const formData = {
      NroDocumento: this.container.querySelector('#newNroDocumento').value,
      Nombre: this.container.querySelector('#newNombre').value,
      Apellido: this.container.querySelector('#newApellido').value,
      Email: this.container.querySelector('#newEmail').value,
      Telefono: this.container.querySelector('#newTelefono').value,
      TipoDocumento: this.container.querySelector('#newTipoDocumento').value,
      IDRol: 1, // Regular guest role
      Estado: parseInt(this.container.querySelector('#newEstado').value)
    };

    try {
      console.log('Creando cliente:', formData);
      await createCliente(formData);
      alert('Cliente creado exitosamente');
      await this.loadData();
      this.showList();
    } catch (error) {
      console.error('Error creando cliente via API:', error);
      alert('Error al crear el cliente: ' + (error.message || 'Error desconocido'));
    }
  }

  showError(title, message) {
    this.container.innerHTML = `
      <div class="flex flex-col items-center justify-center p-12 text-center">
        <h2 class="text-xl font-bold text-brand-deep mb-2">${title}</h2>
        <p class="text-muted text-sm mb-6">${message}</p>
        <button onclick="location.reload()" class="px-5 py-3 bg-brand hover:bg-brand-deep text-white font-semibold rounded-xl transition cursor-pointer border-none text-sm shadow-md shadow-brand/10">
          Recargar pÃ¡gina
        </button>
      </div>
    `;
  }
}

export function renderClientes(container) {
  console.log('ðŸŽ¯ renderClientes llamado con container:', container);
  window.clientesModule = new ClientesModule(container);
  console.log('ðŸ“¦ ClientesModule creado');
  window.clientesModule.initialize();
  console.log('ðŸš€ initialize() llamado');
}

