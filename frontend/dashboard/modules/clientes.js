import { getClientes, createCliente, updateCliente, deleteCliente, toggleEstadoCliente } from "../core/api.js";

import { showAlert, ICONS, renderPremiumPagination } from "./ui-utils.js";
  class ClientesModule {
  constructor(container) {
    this.container = container;
    this.clientes = [];
    this.currentData = {
      total: 0,
      activos: 0,
      inactivos: 0
    };
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.currentFilteredData = [];
  }

  async initialize() {
    console.log('<i class="fa-solid fa-rotate-right"></i> Inicializando ClientesModule...');
    try {
      await this.loadData();
      console.log('<i class="fa-solid fa-check"></i> Datos cargados');
      this.render();
      console.log('<i class="fa-solid fa-check"></i> Render completado');
      this.setupEventListeners();
      console.log('<i class="fa-solid fa-check"></i> Event listeners configurados');
    } catch (error) {
      console.error('<i class="fa-solid fa-xmark"></i> Error en initialize:', error);
      this.showError("Error al cargar clientes", "Recarga la página");
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
      // Usar datos de ejemplo si falla la API
      this.clientes = this.getClientesEjemplo();
      this.calculateMetrics();
    }
  }

  getClientesEjemplo() {
    return [
      { IDCliente: '1', Nombre: 'Juan', Apellido: 'Pérez', Email: 'juan@example.com', Telefono: '3124567890', Estado: '1', NroDocumento: '1234567890', TipoDocumento: 'CC' },
      { IDCliente: '2', Nombre: 'María', Apellido: 'García', Email: 'maria@example.com', Telefono: '3107654321', Estado: '1', NroDocumento: '0987654321', TipoDocumento: 'CC' },
      { IDCliente: '3', Nombre: 'Carlos', Apellido: 'López', Email: 'carlos@example.com', Telefono: '3155555555', Estado: '0', NroDocumento: '5555555555', TipoDocumento: 'CE' }
    ];
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
      const response = await fetch('../public/clientes.html');
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
    const tbody = this.container.querySelector("#clientesTableBody");
    const table = this.container.querySelector("table");
    const tableWrapper = table ? table.closest('.table-container') : null;
    
    if (table) table.className = "w-full border-collapse text-left text-sm text-gray-500";
    if (tableWrapper) tableWrapper.className = "bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden";

    if (!tbody) {
      console.warn('tbody #clientesTableBody no encontrado en container (Navegación rápida o cambio de vista)');
      return;
    }
    
    this._renderTableContent(data, tbody);
  }

  _renderTableContent(data, tbody) {
    this.currentFilteredData = data;
    
    // Validate current page bounds
    const totalPages = Math.ceil(data.length / this.itemsPerPage) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    const paginatedData = data.slice(start, end);

    if (!paginatedData.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-8 text-center text-muted font-semibold">No hay huéspedes registrados</td></tr>';
      this._renderPaginationControls(0);
      return;
    }

    const tableHTML = paginatedData.map((cliente, index) => {
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
          <td class="px-6 py-4 font-semibold text-gray-600">${cliente.Telefono || 'Sin teléfono'}</td>
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
                <i class="fa-solid fa-eye"></i>
              </button>
              <button class="btn-action-modern edit" onclick="window.clientesModule.edit('${docNum}')" title="Editar">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn-action-modern delete" onclick="window.clientesModule.delete('${docNum}')" title="Eliminar">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    
    tbody.innerHTML = tableHTML;
    this._renderPaginationControls(totalPages);
  }

  _renderPaginationControls(totalPages) {
    const table = this.container.querySelector("table");
    const tableWrapper = table ? table.closest('.table-container') || table.parentElement : null;
    if (!tableWrapper) return;
    
    const totalItems = this.currentFilteredData.length;
    let paginationDiv = this.container.querySelector('#paginationContainer');
    
    if (!paginationDiv) {
      paginationDiv = document.createElement('div');
      paginationDiv.id = 'paginationContainer';
      paginationDiv.className = 'flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 mt-6 border-t border-gray-100 bg-white w-full rounded-2xl shadow-sm';
      tableWrapper.parentElement.insertBefore(paginationDiv, tableWrapper.nextSibling);
    }
    
    if (totalItems === 0) {
      paginationDiv.style.display = 'none';
      return;
    }
    paginationDiv.style.display = 'flex';

    // Use shared pagination renderer to match style used across the dashboard
    renderPremiumPagination('paginationContainer', { currentPage: this.currentPage, itemsPerPage: this.itemsPerPage }, totalItems, 'clientesModule');
  }
  
  changeItemsPerPage(value) {
    this.itemsPerPage = Number(value);
    this.currentPage = 1;
    this.renderTable(this.currentFilteredData);
  }
  
  goToPage(page) {
    this.currentPage = page;
    this.renderTable(this.currentFilteredData);
  }

  search() {
    const term = this.container.querySelector("#searchClientes").value.toLowerCase();

    const filtered = this.clientes.filter(c =>
      `${c.Nombre || c.Nombres || ''} ${c.Apellido || c.Apellidos || ''}`.toLowerCase().includes(term) ||
      (c.Email || '').toLowerCase().includes(term) ||
      (c.NroDocumento || c.nro_documento || '').toLowerCase().includes(term)
    );

    this.currentPage = 1;
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

    this.currentPage = 1;
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

  // Export Data to CSV (Actualizado a SheetJS)
  exportData() {
    if (!this.clientes.length) {
      Swal.fire('Atención', "No hay clientes para exportar", 'warning');
      return;
    }
    
    if (typeof XLSX === 'undefined') {
        Swal.fire('Error', 'La librería SheetJS no está cargada.', 'error');
        return;
    }
    
    const ws_data = this.clientes.map(c => ({
        "Tipo Documento": c.TipoDocumento || "CC",
        "Documento": c.NroDocumento || "",
        "Nombre": `${c.Nombre || c.Nombres || ''} ${c.Apellido || c.Apellidos || ''}`.trim(),
        "Email": c.Email || "",
        "Teléfono": c.Telefono || "",
        "Estado": c.Estado == "1" ? "Activo" : "Inactivo"
    }));
    
    const ws = XLSX.utils.json_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, `clientes_vialuna_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  view(id) {
    const cliente = this.clientes.find(c => (c.NroDocumento || c.nro_documento) === id);
    if (!cliente) {
      Swal.fire('Error', 'Cliente no encontrado', 'error');
      return;
    }

    const nombreCompleto = `${cliente.Nombre || cliente.Nombres || ''} ${cliente.Apellido || cliente.Apellidos || ''}`.trim() || 'Sin nombre';
    
    this.container.innerHTML = `
      <div class="max-w-2xl mx-auto p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-sm">
        <div class="flex items-center justify-between border-b border-gray-100 pb-5 mb-6">
          <h2 class="text-xl font-bold text-brand-deep m-0 flex items-center gap-2"><i class="fa-solid fa-eye"></i> Detalle del Huésped</h2>
          <button onclick="window.clientesModule.showList()" class="px-4 py-2 bg-gray-50 border border-gray-200 text-brand-deep text-xs font-bold rounded-xl hover:bg-gray-100 cursor-pointer transition-all duration-300">
            ← Volver a la lista
          </button>
        </div>
        
        <div class="flex flex-col gap-6">
          <!-- Main Details -->
          <div class="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-4">
            <h3 class="text-xs font-bold text-brand-deep uppercase tracking-wider m-0">Información Personal</h3>
            
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
                <span class="text-xs text-muted font-semibold uppercase tracking-wide">Teléfono:</span>
                <span class="font-bold text-brand-deep">${cliente.Telefono || 'No especificado'}</span>
              </div>
              <div class="flex flex-col gap-1 sm:col-span-2">
                <span class="text-xs text-muted font-semibold uppercase tracking-wide">Ubicación:</span>
                <span class="font-bold text-brand-deep">${cliente.Pais || 'Colombia'}${cliente.Departamento ? `, ${cliente.Departamento}` : ''}</span>
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
              <i class="fa-solid fa-pen"></i> Editar Huésped
            </button>
            <button onclick="window.clientesModule.toggleStatus('${id}')" class="px-5 py-3 rounded-xl border border-gray-200 text-brand-deep font-semibold bg-white hover:bg-gray-50 cursor-pointer transition-all text-xs">
              <i class="fa-solid fa-rotate-right"></i> Cambiar Estado
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
      Swal.fire('Error', 'Cliente no encontrado', 'error');
      return;
    }

    const nombre = cliente.Nombre || cliente.Nombres || '';
    const apellido = cliente.Apellido || cliente.Apellidos || '';

    const modalHtml = `
      <div id="editClientModalOverlay" class="fixed inset-0 modal-premium-backdrop z-[1000] flex items-center justify-center p-4 transition-all duration-300">
        <article class="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden transform scale-95 transition-transform duration-300">
          
          <div class="flex justify-between items-center p-6 border-b border-gray-100 bg-white z-10 shrink-0">
            <div>
              <h2 class="text-xl font-bold text-brand-deep m-0">Editar Huésped</h2>
              <p class="text-xs text-muted mt-1 m-0">Modifica la información del huésped.</p>
            </div>
            <div class="flex items-center gap-3">
              <button type="button" onclick="document.getElementById('editClientModalOverlay').remove()" class="px-4 py-2 rounded-xl bg-gray-50 text-muted font-semibold hover:bg-gray-100 transition-colors border border-gray-200 cursor-pointer text-sm">Cancelar</button>
              <button type="submit" form="editClientForm" class="px-5 py-2 rounded-xl bg-brand text-white font-semibold hover:bg-brand-deep shadow-md shadow-brand/20 transition-all border-none cursor-pointer text-sm">Guardar Cambios</button>
            </div>
          </div>
          
          <div class="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30">
            <form id="editClientForm" class="flex flex-col gap-6 m-0">
              <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-5">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Tipo Documento</label>
                    <select id="editTipoDocumento" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all cursor-pointer">
                      <option value="CC" ${cliente.TipoDocumento === 'CC' ? 'selected' : ''}>Cédula de Ciudadanía</option>
                      <option value="TI" ${cliente.TipoDocumento === 'TI' ? 'selected' : ''}>Tarjeta de Identidad</option>
                      <option value="CE" ${cliente.TipoDocumento === 'CE' ? 'selected' : ''}>Cédula de Extranjería</option>
                      <option value="Pasaporte" ${cliente.TipoDocumento === 'Pasaporte' ? 'selected' : ''}>Pasaporte</option>
                    </select>
                  </div>
                  
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Documento <span class="text-red-500">*</span></label>
                    <input type="text" id="editNroDocumento" value="${cliente.NroDocumento || cliente.nro_documento}" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-100 text-sm font-semibold focus:outline-none cursor-not-allowed" readonly>
                  </div>
                  
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Nombre <span class="text-red-500">*</span></label>
                    <input type="text" id="editNombre" value="${nombre}" maxlength="50" oninput="this.value = this.value.replace(/[0-9]/g, '')" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" required>
                  </div>
                  
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Apellido <span class="text-red-500">*</span></label>
                    <input type="text" id="editApellido" value="${apellido}" maxlength="50" oninput="this.value = this.value.replace(/[0-9]/g, '')" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" required>
                  </div>
                  
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Email <span class="text-red-500">*</span></label>
                    <input type="email" id="editEmail" value="${cliente.Email || ''}" maxlength="100" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" required>
                  </div>
                  
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Teléfono <span class="text-red-500">*</span></label>
                    <input type="tel" id="editTelefono" value="${cliente.Telefono || ''}" maxlength="15" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" required>
                  </div>
                  
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">País <span class="text-red-500">*</span></label>
                    <input type="text" id="editPais" value="${cliente.Pais || 'Colombia'}" oninput="this.value = this.value.replace(/[0-9]/g, '')" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" required>
                  </div>
                  
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Departamento <span class="text-red-500">*</span></label>
                    <input type="text" id="editDepartamento" value="${cliente.Departamento || ''}" oninput="this.value = this.value.replace(/[0-9]/g, '')" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" required>
                  </div>
                  <div class="flex flex-col gap-2 sm:col-span-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Dirección</label>
                    <input type="text" id="editDireccion" value="${cliente.Direccion || ''}" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all">
                  </div>

                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Estado</label>
                    <select id="editEstado" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all cursor-pointer">
                      <option value="1" ${cliente.Estado == 1 ? 'selected' : ''}>Activo</option>
                      <option value="0" ${cliente.Estado == 0 ? 'selected' : ''}>Inactivo</option>
                    </select>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </article>
      </div>
    `;

    const existing = document.getElementById('editClientModalOverlay');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    setTimeout(() => {
      const modal = document.getElementById('editClientModalOverlay');
      if(modal) {
          modal.querySelector('article').classList.remove('scale-95');
          modal.querySelector('article').classList.add('scale-100');
      }
    }, 10);

    const form = document.getElementById('editClientForm');
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
      Nombre: document.getElementById('editNombre').value,
      Apellido: document.getElementById('editApellido').value,
      Email: document.getElementById('editEmail').value,
      Telefono: document.getElementById('editTelefono').value,
      TipoDocumento: document.getElementById('editTipoDocumento').value,
      Pais: document.getElementById('editPais').value,
      Departamento: document.getElementById('editDepartamento').value,
      Direccion: document.getElementById('editDireccion').value,
      IDRol: 1, // Defaulting regular role
      Estado: parseInt(document.getElementById('editEstado').value)
    };

    try {
      console.log('Actualizando cliente:', formData);
      await updateCliente(id, formData);
      showAlert('Información', 'Cliente actualizado exitosamente', 'info');
      document.getElementById('editClientModalOverlay').remove();
      await this.loadData();
      this.renderTable(this.clientes);
    } catch (error) {
      console.error('Error guardando cliente:', error);
      Swal.fire('Error', 'Error al guardar el cliente: ' + (error.message || 'Error desconocido'), 'error');
    }
  }

  async toggleStatus(id) {
    const cliente = this.clientes.find(c => (c.NroDocumento || c.nro_documento) === id);
    if (!cliente) {
      showAlert('error', 'Error', 'Cliente no encontrado');
      return;
    }
    const nuevoEstado = cliente.Estado == 1 ? 0 : 1;
    await this._doChangeStatus(id, nuevoEstado);
  }

  async changeStatusFromDropdown(id, nuevoEstado) {
    await this._doChangeStatus(id, nuevoEstado);
  }

  async _doChangeStatus(id, nuevoEstado) {
    const action = nuevoEstado == 1 ? 'activar' : 'desactivar';
    const confirmResult = await Swal.fire({
      title: `¿Estás seguro de ${action} este cliente?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No'
    });

    if (!confirmResult.isConfirmed) {
      this.render(); // Revert UI if cancelled
      return;
    }

    try {
      console.log(`Cambiando estado de cliente ${id} a ${nuevoEstado}`);
      await toggleEstadoCliente(id, nuevoEstado);
      showAlert('Información', `Cliente ${action}ado correctamente`, 'info');
      await this.loadData();
      this.render();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      showAlert('error', 'Error', error.message || 'Error al cambiar el estado');
      this.render();
    }
  }

  async delete(id) {
    const cliente = this.clientes.find(c => (c.NroDocumento || c.nro_documento) === id);
    if (!cliente) {
      Swal.fire('Error', 'Cliente no encontrado', 'error');
      return;
    }

    const nombreCompleto = `${cliente.Nombre || cliente.Nombres || ''} ${cliente.Apellido || cliente.Apellidos || ''}`.trim() || 'Sin nombre';
    
    const confirmRes = await Swal.fire({
      title: '¿Eliminar Cliente?',
      text: `¿Está seguro de eliminar al cliente "${nombreCompleto}" (${id})? Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!confirmRes.isConfirmed) {
      return;
    }

    try {
      console.log(`Eliminando cliente ${id}`);
      await deleteCliente(id);
      showAlert('Información', 'Cliente eliminado exitosamente', 'info');
      await this.loadData();
      this.render();
    } catch (error) {
      console.error('Error eliminando cliente:', error);
      Swal.fire('Error', 'Error al eliminar el cliente: ' + (error.message || 'Error desconocido'), 'error');
    }
  }

  showNewClientModal() {
    const modalHtml = `
      <div id="newClientModalOverlay" class="fixed inset-0 modal-premium-backdrop z-[1000] flex items-center justify-center p-4 transition-all duration-300">
        <article class="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden transform scale-95 transition-transform duration-300">
          
          <div class="flex justify-between items-center p-6 border-b border-gray-100 bg-white z-10 shrink-0">
            <div>
              <h2 class="text-xl font-bold text-brand-deep m-0">Registrar Nuevo Huésped</h2>
              <p class="text-xs text-muted mt-1 m-0">Completa la información del huésped.</p>
            </div>
            <div class="flex items-center gap-3">
              <button type="button" onclick="document.getElementById('newClientModalOverlay').remove()" class="px-4 py-2 rounded-xl bg-gray-50 text-muted font-semibold hover:bg-gray-100 transition-colors border border-gray-200 cursor-pointer text-sm">Cancelar</button>
              <button type="submit" form="newClientForm" class="px-5 py-2 rounded-xl bg-brand text-white font-semibold hover:bg-brand-deep shadow-md shadow-brand/20 transition-all border-none cursor-pointer text-sm">Crear Cliente</button>
            </div>
          </div>
          
          <div class="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30">
            <form id="newClientForm" class="flex flex-col gap-6 m-0">
              <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-5">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Tipo Documento</label>
                    <select id="newTipoDocumento" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all cursor-pointer">
                      <option value="CC">Cédula de Ciudadanía</option>
                      <option value="TI">Tarjeta de Identidad</option>
                      <option value="CE">Cédula de Extranjería</option>
                      <option value="Pasaporte">Pasaporte</option>
                    </select>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Documento <span class="text-red-500">*</span></label>
                    <input type="text" id="newNroDocumento" maxlength="20" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" required>
                    <div class="text-xs text-red-600 mt-1 hidden error-message" data-for="newNroDocumento"></div>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Nombre <span class="text-red-500">*</span></label>
                    <input type="text" id="newNombre" maxlength="50" oninput="this.value = this.value.replace(/[0-9]/g, '')" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" required>
                    <div class="text-xs text-red-600 mt-1 hidden error-message" data-for="newNombre"></div>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Apellido <span class="text-red-500">*</span></label>
                    <input type="text" id="newApellido" maxlength="50" oninput="this.value = this.value.replace(/[0-9]/g, '')" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" required>
                    <div class="text-xs text-red-600 mt-1 hidden error-message" data-for="newApellido"></div>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Email <span class="text-red-500">*</span></label>
                    <input type="email" id="newEmail" maxlength="100" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" required>
                    <div class="text-xs text-red-600 mt-1 hidden error-message" data-for="newEmail"></div>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Teléfono <span class="text-red-500">*</span></label>
                    <input type="tel" id="newTelefono" maxlength="15" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" required>
                    <div class="text-xs text-red-600 mt-1 hidden error-message" data-for="newTelefono"></div>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">País <span class="text-red-500">*</span></label>
                    <input type="text" id="newPais" value="Colombia" oninput="this.value = this.value.replace(/[0-9]/g, '')" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" required>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Departamento <span class="text-red-500">*</span></label>
                    <input type="text" id="newDepartamento" oninput="this.value = this.value.replace(/[0-9]/g, '')" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" required>
                  </div>
                  <div class="flex flex-col gap-2 sm:col-span-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Dirección</label>
                    <input type="text" id="newDireccion" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all">
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Estado Inicial</label>
                    <select id="newEstado" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all cursor-pointer">
                      <option value="1">Activo</option>
                      <option value="0">Inactivo</option>
                    </select>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </article>
      </div>
    `;

    const existing = document.getElementById('newClientModalOverlay');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    setTimeout(() => {
      const modal = document.getElementById('newClientModalOverlay');
      if(modal) {
          modal.querySelector('article').classList.remove('scale-95');
          modal.querySelector('article').classList.add('scale-100');
      }
    }, 10);

    const form = document.getElementById('newClientForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.createClient();
    });
    
    // Ensure module is globally available for onclick handlers
    window.clientesModule = this;
  }

  async createClient() {
    // Clear inline errors
    document.querySelectorAll('#newClientForm .error-message').forEach(e => { e.classList.add('hidden'); e.textContent = ''; });

    const nro = (document.getElementById('newNroDocumento').value || '').trim();
    const nombre = (document.getElementById('newNombre').value || '').trim();
    const apellido = (document.getElementById('newApellido').value || '').trim();
    const email = (document.getElementById('newEmail').value || '').trim();
    const telefono = (document.getElementById('newTelefono').value || '').trim();
    const pais = (document.getElementById('newPais').value || '').trim();
    const departamento = (document.getElementById('newDepartamento').value || '').trim();
    const direccion = (document.getElementById('newDireccion').value || '').trim();
    const tipoDoc = document.getElementById('newTipoDocumento').value;
    const estadoVal = parseInt(document.getElementById('newEstado').value);

    let hasError = false;
    if (!/^[0-9]+$/.test(nro)) { const el = document.querySelector('.error-message[data-for="newNroDocumento"]'); if (el) { el.classList.remove('hidden'); el.textContent = 'Documento debe ser numérico.'; } hasError = true; }
    if (!nombre || /\d/.test(nombre)) { const el = document.querySelector('.error-message[data-for="newNombre"]'); if (el) { el.classList.remove('hidden'); el.textContent = 'Nombre inválido.'; } hasError = true; }
    if (!apellido || /\d/.test(apellido)) { const el = document.querySelector('.error-message[data-for="newApellido"]'); if (el) { el.classList.remove('hidden'); el.textContent = 'Apellido inválido.'; } hasError = true; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { const el = document.querySelector('.error-message[data-for="newEmail"]'); if (el) { el.classList.remove('hidden'); el.textContent = 'Email inválido.'; } hasError = true; }
    if (telefono && !/^[0-9]{7,15}$/.test(telefono)) { const el = document.querySelector('.error-message[data-for="newTelefono"]'); if (el) { el.classList.remove('hidden'); el.textContent = 'Teléfono inválido.'; } hasError = true; }

    if (hasError) {
      showAlert('Error', 'Corrige los campos marcados.', 'error');
      return;
    }

    const formData = {
      NroDocumento: nro,
      Nombre: nombre,
      Apellido: apellido,
      Email: email || null,
      Telefono: telefono || null,
      Pais: pais || null,
      Departamento: departamento || null,
      Direccion: direccion || null,
      TipoDocumento: tipoDoc,
      IDRol: 1, // Regular guest role
      Estado: estadoVal
    };

    try {
      console.log('Creando cliente:', formData);
      await createCliente(formData);
      showAlert('Información', 'Cliente creado exitosamente', 'info');
      document.getElementById('newClientModalOverlay').remove();
      await this.loadData();
      this.renderTable(this.clientes);
    } catch (error) {
      console.error('Error creando cliente via API:', error);
      showAlert('Error', 'Error al crear el cliente: ' + (error.message || 'Error desconocido'), 'error');
    }
  }

  showError(title, message) {
    this.container.innerHTML = `
      <div class="flex flex-col items-center justify-center p-12 text-center">
        <h2 class="text-xl font-bold text-brand-deep mb-2">${title}</h2>
        <p class="text-muted text-sm mb-6">${message}</p>
        <button onclick="location.reload()" class="px-5 py-3 bg-brand hover:bg-brand-deep text-white font-semibold rounded-xl transition cursor-pointer border-none text-sm shadow-md shadow-brand/10">
          Recargar página
        </button>
      </div>
    `;
  }
}

export function renderClientes(container) {
  console.log('🎯 renderClientes llamado con container:', container);
  window.clientesModule = new ClientesModule(container);
  console.log('📦 ClientesModule creado');
  window.clientesModule.initialize();
  console.log('🚀 initialize() llamado');
}
