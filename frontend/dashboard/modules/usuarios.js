// Módulo de Administración de Usuarios (VIA LUNA)
import { 
  getUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  getRoles,
  getReservas,
  getClientes,
  toggleEstadoCliente
} from "../core/api.js";
import { showAlert, ICONS } from './ui-utils.js';
import { buildCountryOptions, findCountry, bindCountryDial } from '../../js/shared/countries.js';


function isAdminUser(u) {
  if (!u) return false;
  const username = String(u.NombreUsuario || u.Username || u.Nombre || '').trim().toLowerCase();
  if (username === 'yoni' || username === 'zury') return true;
  return Number(u.IDRol) === 1 || String(u.NombreRol).toLowerCase() === 'administrador';
}

class UsuariosModule {
  constructor(container) {
    this.container = container;
    this.usuarios = [];
    this.roles = [];
    this.reservas = [];
    this.metrics = {
      total: 0,
      admins: 0,
      clients: 0,
      activos: 0
    };
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.currentFilteredData = [];
  }

  // Inicialización del módulo
  async initialize() {
    console.log('<i class="fa-solid fa-rotate-right"></i> Inicializando UsuariosModule...');
    try {
      await this.loadData();
      console.log('<i class="fa-solid fa-check"></i> Datos de usuarios cargados');
      this.render();
      console.log('<i class="fa-solid fa-check"></i> Renderizado completado');
      this.setupEventListeners();
      console.log('<i class="fa-solid fa-check"></i> Escuchadores de eventos listos');
    } catch (error) {
      console.error('<i class="fa-solid fa-xmark"></i> Error en initialize:', error);
      this.showError("Error al cargar usuarios", "Asegúrese de que el servidor backend esté en ejecución.");
    }
  }

  // Cargar información desde la base de datos
  async loadData() {
    try {
      const [usersResponse, rolesResponse, reservesResponse, clientsResponse] = await Promise.all([
        getUsuarios().catch(err => {
          console.error("Error getUsuarios:", err);
          return [];
        }),
        getRoles().catch(err => {
          console.error("Error getRoles:", err);
          return { data: [] };
        }),
        getReservas().catch(err => {
          console.error("Error getReservas:", err);
          return [];
        }),
        getClientes().catch(err => {
          console.error("Error getClientes:", err);
          return [];
        })
      ]);

      const mappedClients = (clientsResponse || []).map(c => ({
        IDUsuario: `C_${c.NroDocumento}`,
        NombreUsuario: c.Email || 'Huésped',
        Nombre: c.Nombre,
        Apellido: c.Apellido,
        Email: c.Email,
        Telefono: c.Telefono,
        IDRol: c.IDRol || 2,
        NombreRol: 'Cliente',
        Estado: c.Estado,
        NumeroDocumento: c.NroDocumento,
        TipoDocumento: c.TipoDocumento,
        Pais: c.Pais,
        Departamento: c.Departamento,
        Direccion: c.Direccion,
        _isClient: true,
        _originalId: c.NroDocumento
      }));

      this.usuarios = [...(usersResponse || []), ...mappedClients];
      this.roles = rolesResponse.data || rolesResponse || [];
      this.reservas = reservesResponse || [];

      this.calculateMetrics();
    } catch (error) {
      console.error('Error cargando información de la API:', error);
      this.usuarios = [];
      this.roles = [];
      this.reservas = [];
      this.calculateMetrics();
      this.showError("Error", "No se pudieron cargar los datos del servidor.");
    }
  }

  // Calcular estadísticas dinámicas
  calculateMetrics() {
    const total = this.usuarios.length;
    
    // Filtrar por IDRol
    const admins = this.usuarios.filter(u => isAdminUser(u)).length;
    const clients = this.usuarios.filter(u => Number(u.IDRol) === 2 || String(u.NombreRol).toLowerCase() === 'cliente').length;
    
    // Todos son activos por defecto en la BD actual al no tener columna Estado en la tabla usuarios física,
    // pero si tienen estado, filtramos. Si no, mostramos todos como activos.
    const activos = this.usuarios.filter(u => u.Estado === undefined || String(u.Estado) === '1').length;

    this.metrics = { total, admins, clients, activos };
  }

  // Render general de la vista
  render(data = this.usuarios) {
    this.updateMetrics();
    this.renderTable(data);
    window.usuariosModule = this;
  }

  // Recargar y mostrar la lista principal
  async showList() {
    try {
      const response = await fetch('../admin/usuarios.html');
      const html = await response.text();
      this.container.innerHTML = html;
      await this.loadData();
      this.render();
      this.setupEventListeners();
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      this.showError("Error", "No se pudieron cargar los datos del servidor.");
      return;
    }
  }

  // Actualizar métricas en la interfaz
  updateMetrics() {
    const totalElem = this.container.querySelector("#totalUsuarios");
    const adminsElem = this.container.querySelector("#totalAdmins");
    const clientsElem = this.container.querySelector("#totalClients");
    const activosElem = this.container.querySelector("#usuariosActivos");

    if (totalElem) totalElem.textContent = this.metrics.total;
    if (adminsElem) adminsElem.textContent = this.metrics.admins;
    if (clientsElem) clientsElem.textContent = this.metrics.clients;
    if (activosElem) activosElem.textContent = this.metrics.activos;
  }

  // Registrar eventos de filtros y búsquedas
  setupEventListeners() {
    const searchElem = document.getElementById("searchUsuarios");
    const filterRolElem = document.getElementById("filterRol");
    const filterEstadoElem = document.getElementById("filterEstado");

    if (searchElem) {
      searchElem.addEventListener("input", () => this.filterData());
    }
    if (filterRolElem) {
      filterRolElem.addEventListener("change", () => this.filterData());
    }
    if (filterEstadoElem) {
      filterEstadoElem.addEventListener("change", () => this.filterData());
    }
  }

  // Renderizar la tabla con los registros de usuarios
  renderTable(data = this.usuarios) {
    setTimeout(() => {
      const tbody = this.container.querySelector("#usuariosTableBody");
      if (!tbody) {
        console.error('<i class="fa-solid fa-xmark"></i> Tbody #usuariosTableBody no encontrado en el container');
        return;
      }
      this._renderTableContent(data, tbody);
    }, 50);
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
      tbody.innerHTML = `<tr><td colspan="6">
        <div class="col-span-full py-16 px-6 text-center bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3">
          <span class="text-4xl">📭</span>
          <h4 class="text-brand-deep font-bold text-lg m-0">No hay usuarios registrados</h4>
          <p class="text-muted text-sm max-w-sm m-0 py-2 italic">Intenta cambiar los filtros de búsqueda o agrega un nuevo usuario desde el panel superior.</p>
        </div>
      </td></tr>`;
      this._renderPaginationControls(0);
      return;
    }
    const tableHTML = paginatedData.map((usuario) => {
      const id = usuario.IDUsuario;
      const nombreUsuario = usuario.NombreUsuario || usuario.Nombre || 'Sin Nombre';
      const apellido = usuario.Apellido || '';
      const nombreCompleto = `${nombreUsuario} ${apellido}`.trim();
      const email = usuario.Email || 'Sin email';
      const telefono = usuario.Telefono || 'Sin teléfono';
      const rolName = usuario.NombreRol || (isAdminUser(usuario) ? 'Administrador' : 'Cliente');
      const docNum = usuario.NumeroDocumento || usuario.NroDocumento || 'N/A';
      
      // Estado virtual si no existe en la BD
      const status = usuario.Estado !== undefined ? String(usuario.Estado) : '1';
      
      // Generar iniciales para el avatar
      const iniciales = nombreCompleto
        .split(' ')
        .map(n => n.charAt(0))
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'U';

      const isProtected = isAdminUser(usuario);

      const actionButtons = isProtected ? `
            <div class="action-group-modern justify-center">
              <button class="btn-action-modern view" onclick="window.usuariosModule.viewDetails('${id}')" title="Ver detalle"><i class="fa-solid fa-eye"></i></button>
              <button class="btn-action-modern locked" title="Protegido" disabled><i class="fa-solid fa-lock"></i></button>
            </div>
          ` : `
            <div class="action-group-modern justify-center">
              <button class="btn-action-modern view" onclick="window.usuariosModule.viewDetails('${id}')" title="Ver detalle"><i class="fa-solid fa-eye"></i></button>
              <button class="btn-action-modern edit" onclick="window.usuariosModule.showEditModal('${id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
              <button class="btn-action-modern delete" onclick="window.usuariosModule.deleteUser('${id}')" title="Anular"><i class="fa-solid fa-ban"></i></button>
            </div>
          `;

      return `
        <tr class="hover:bg-gray-50/50 transition-all duration-200">
          <td class="px-6 py-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-brand-light/10 text-brand-deep font-bold flex items-center justify-center text-sm shadow-sm shrink-0 border border-brand-light/20">
                ${iniciales}
              </div>
              <div class="min-w-0">
                <div class="font-semibold text-brand-deep truncate max-w-[180px]">${nombreCompleto}</div>
                <div class="text-xs text-muted truncate max-w-[180px]">${email}</div>
              </div>
            </div>
          </td>
          <td class="px-6 py-4">
            <div class="text-sm font-semibold text-gray-700">${telefono}</div>
            <div class="text-xs text-muted">Teléfono</div>
          </td>
          <td class="px-6 py-4">
            <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${isAdminUser(usuario) ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-blue-50 text-blue-800 border border-blue-100'}">
              <i class="fa-solid fa-shield-halved"></i> ${rolName}
            </span>
          </td>
          <td class="px-6 py-4 font-semibold text-gray-500">${docNum}</td>
          <td class="px-6 py-4">
            <div class="flex items-center gap-3">
              <label class="relative inline-block w-11 h-6 m-0 cursor-pointer shrink-0">
                  <input type="checkbox" class="sr-only peer" ${status === '1' ? 'checked' : ''} 
                    onchange='window.usuariosModule.changeStatus(${JSON.stringify(id)}, this.checked ? 1 : 0)'>
                <span class="absolute inset-0 rounded-full bg-slate-200 peer-checked:bg-emerald-500 transition-colors duration-300 before:content-[''] before:absolute before:h-[18px] before:w-[18px] before:left-[3px] before:bottom-[3px] before:bg-white before:rounded-full before:transition-transform before:duration-300 peer-checked:before:translate-x-5"></span>
              </label>
              <span class="px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all duration-300 ${status === '1' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                ${status === '1' ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </td>
          <td class="px-6 py-4">
            <div class="action-group-modern justify-center">
              <button class="btn-action-modern view" onclick='window.usuariosModule.viewDetails(${JSON.stringify(id)})' title="Ver detalle">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button class="btn-action-modern edit" onclick='window.usuariosModule.showEditModal(${JSON.stringify(id)})' title="Editar">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn-action-modern delete" onclick='window.usuariosModule.deleteUser(${JSON.stringify(id)})' title="Anular">
                <i class="fa-solid fa-ban"></i>
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
    
    const startItem = ((this.currentPage - 1) * this.itemsPerPage) + 1;
    const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);
    
    let buttonsHTML = `
        <button onclick="window.usuariosModule.goToPage(${Math.max(1, this.currentPage - 1)})" 
                class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-brand transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                ${this.currentPage === 1 ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-left text-xs"></i>
        </button>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7) {
            if (i !== 1 && i !== totalPages && Math.abs(i - this.currentPage) > 1) {
                if (i === 2 || i === totalPages - 1) buttonsHTML += `<span class="px-1 text-gray-400">...</span>`;
                continue;
            }
        }
        const activeClass = i === this.currentPage ? 'bg-brand text-white border-brand' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50';
        buttonsHTML += `<button onclick="window.usuariosModule.goToPage(${i})" class="w-8 h-8 flex items-center justify-center rounded-lg border font-semibold text-xs cursor-pointer transition-colors ${activeClass}">${i}</button>`;
    }

    buttonsHTML += `
        <button onclick="window.usuariosModule.goToPage(${Math.min(totalPages, this.currentPage + 1)})" 
                class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-brand transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                ${this.currentPage === totalPages ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-right text-xs"></i>
        </button>
    `;
    
    paginationDiv.innerHTML = `
      <div class="flex items-center gap-4">
          <span class="text-xs text-muted font-medium">Mostrando <strong class="text-brand-deep">${startItem}-${endItem}</strong> de <strong class="text-brand-deep">${totalItems}</strong> resultados</span>
          <div class="hidden sm:flex items-center gap-2 border-l border-gray-200 pl-4">
              <span class="text-[10px] text-muted font-bold uppercase tracking-wider">Filas:</span>
              <select onchange="window.usuariosModule.changeItemsPerPage(this.value)" class="text-xs font-bold text-brand-deep bg-transparent border-none cursor-pointer focus:outline-none">
                  <option value="10" ${this.itemsPerPage == 10 ? 'selected' : ''}>10</option>
                  <option value="20" ${this.itemsPerPage == 20 ? 'selected' : ''}>20</option>
                  <option value="50" ${this.itemsPerPage == 50 ? 'selected' : ''}>50</option>
              </select>
          </div>
      </div>
      <div class="flex gap-1.5 items-center">${buttonsHTML}</div>
    `;
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

  // Filtrar los datos reactivamente en la vista
  filterData() {
    const searchVal = document.getElementById("searchUsuarios") ? document.getElementById("searchUsuarios").value.toLowerCase() : "";
    const filterRol = document.getElementById("filterRol") ? document.getElementById("filterRol").value : "";
    const filterEstado = document.getElementById("filterEstado") ? document.getElementById("filterEstado").value : "";

    const filtered = this.usuarios.filter(u => {
      const nombreUsuario = u.NombreUsuario || u.Nombre || '';
      const apellido = u.Apellido || '';
      const nombreCompleto = `${nombreUsuario} ${apellido}`.toLowerCase();
      const email = (u.Email || '').toLowerCase();
      const docNum = String(u.NumeroDocumento || u.NroDocumento || '');
      
      const matchesSearch = nombreCompleto.includes(searchVal) || email.includes(searchVal) || docNum.includes(searchVal);
      const matchesRol = !filterRol || String(u.IDRol) === filterRol;
      
      const userStatus = u.Estado !== undefined ? String(u.Estado) : '1';
      const matchesEstado = !filterEstado || userStatus === filterEstado;

      return matchesSearch && matchesRol && matchesEstado;
    });

    this.currentPage = 1;
    this.renderTable(filtered);
  }

  // Cambiar estado del usuario
  async changeStatus(id, nuevoEstado) {
    const usuario = this.usuarios.find(u => (u.IDUsuario || u.id_usuario || u.id) == id);
    if (!usuario) return;

    const isProtected = isAdminUser(usuario);
    if (isProtected) {
      showAlert('Advertencia', 'Los Administradores están protegidos y no pueden ser inactivados.', 'warning');
      this.render(); // Reset the UI toggle
      return;
    }

    const result = await Swal.fire({ // confirmation kept as is
      title: '¿Cambiar estado?',
      text: `¿Está seguro de cambiar el estado del usuario a ${nuevoEstado === 1 ? 'Activo' : 'Inactivo'}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) {
      this.render();
      return;
    }

    try {
      usuario.Estado = nuevoEstado;
      
      // Intentamos llamar a la API
      if (usuario._isClient) {
        await toggleEstadoCliente(usuario._originalId, nuevoEstado);
      } else {
        await updateUsuario(id, { ...usuario, Estado: nuevoEstado });
      }
      showAlert('Información', `Estado del usuario actualizado a ${nuevoEstado === 1 ? 'Activo' : 'Inactivo'}`, 'success');
      await this.loadData();
      this.render();
    } catch (error) {
      console.error('Error actualizando estado:', error);
      showAlert('Error', 'Se actualizó el estado localmente (' + (error.message || 'Sin persistencia en servidor') + ')', 'error');
      this.render();
    }
  }

  // Eliminar usuario de la persistencia
  async deleteUser(id) {
    const usuario = this.usuarios.find(u => u.IDUsuario === id);
    if (!usuario) return;

    const isProtected = isAdminUser(usuario);
    if (isProtected) {
      showAlert('Advertencia', 'Los Administradores están protegidos y no se pueden eliminar.', 'warning');
      return;
    }

    const nombreCompleto = `${usuario.NombreUsuario || usuario.Nombre || ''} ${usuario.Apellido || ''}`.trim();
    const confirmRes = await Swal.fire({
      title: '¿Anular Registro?',
      text: `¿Está seguro de anular de forma permanente al usuario "${nombreCompleto}"? Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar'
    });
    if (!confirmRes.isConfirmed) {
      return;
    }

    try {
      await deleteUsuario(id);
      showAlert('Información', 'Usuario anulado correctamente.', 'success');
      await this.loadData();
      this.render();
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      showAlert('Error', 'Error al eliminar usuario: ' + (error.message || 'Error de conexión'), 'error');
    }
  }

  // Exportar lista de usuarios a formato Excel con SheetJS
  exportData() {
    if (!this.usuarios.length) {
      showAlert('Atención', "No hay registros para exportar", 'warning');
      return;
    }
    
    if (typeof XLSX === 'undefined') {
        showAlert('Error', 'La librería SheetJS no está cargada.', 'error');
        return;
    }
    
    const ws_data = this.usuarios.map(u => ({
        "ID": u.IDUsuario || "",
        "Nombre Usuario": u.NombreUsuario || u.Nombre || "",
        "Apellido": u.Apellido || "",
        "Email": u.Email || "",
        "Teléfono": u.Telefono || "",
        "Documento": u.NumeroDocumento || u.NroDocumento || "",
        "Tipo Documento": u.TipoDocumento || "CC",
        "Rol": u.NombreRol || (isAdminUser(u) ? "Administrador" : "Cliente"),
        "Estado": u.Estado !== undefined && String(u.Estado) === '0' ? "Inactivo" : "Activo"
    }));
    
    const ws = XLSX.utils.json_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Usuarios");
    XLSX.writeFile(wb, `usuarios_vialuna_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // Visualizar detalles del usuario en pantalla
  viewDetails(id) {
    const usuario = this.usuarios.find(u => u.IDUsuario === id);
    if (!usuario) {
      showAlert('Error', 'Usuario no encontrado', 'error');
      return;
    }

    const nombreCompleto = `${usuario.NombreUsuario || usuario.Nombre || ''} ${usuario.Apellido || ''}`.trim() || 'Sin nombre';
    const rolName = usuario.NombreRol || (isAdminUser(usuario) ? 'Administrador' : 'Cliente');
    const docType = usuario.TipoDocumento || 'CC';
    const docNum = usuario.NumeroDocumento || usuario.NroDocumento || 'N/A';
    const status = usuario.Estado !== undefined ? String(usuario.Estado) : '1';
    
    // Obtener iniciales para el avatar
    const iniciales = nombreCompleto
      .split(' ')
      .map(n => n.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

    // Filtrar las reservas que correspondan a este usuario (por correo, documento o nombre)
    const usuarioReservas = this.reservas.filter(res => {
      const emailMatch = res.EmailCliente && String(res.EmailCliente).toLowerCase() === String(usuario.Email).toLowerCase();
      const docMatch = (res.NroDocumento || res.nro_documento) && String(res.NroDocumento || res.nro_documento) === String(docNum);
      const nameMatch = res.NombreCliente && String(res.NombreCliente).toLowerCase().includes(String(usuario.NombreUsuario || usuario.Nombre).toLowerCase());
      return emailMatch || docMatch || nameMatch;
    });

    this.container.innerHTML = `
      <div class="max-w-3xl mx-auto p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-sm">
        <div class="flex items-center justify-between border-b border-gray-100 pb-5 mb-6">
          <h2 class="text-xl font-bold text-brand-deep m-0 flex items-center gap-2"><i class="fa-solid fa-eye"></i> Perfil del Usuario</h2>
          <button onclick="window.usuariosModule.showList()" class="px-4 py-2 bg-gray-50 border border-gray-200 text-brand-deep text-xs font-bold rounded-xl hover:bg-gray-100 cursor-pointer transition-all duration-300">
            ← Volver a la lista
          </button>
        </div>

        <div class="flex flex-col gap-6">
          <!-- Tarjeta Superior de Identificación -->
          <div class="flex flex-col sm:flex-row items-center gap-5 p-6 bg-gradient-to-br from-paper to-white rounded-2xl border border-brand-light/10">
            <div class="w-20 h-20 rounded-full bg-brand/10 text-brand-deep font-extrabold flex items-center justify-center text-3xl shadow-md border border-brand-light/30">
              ${iniciales}
            </div>
            <div class="text-center sm:text-left">
              <h3 class="m-0 text-xl font-extrabold text-brand-deep">${nombreCompleto}</h3>
              <p class="m-0 text-xs font-semibold text-muted uppercase tracking-wider mt-1">Nombre de usuario: ${usuario.NombreUsuario || usuario.Nombre}</p>
              <div class="flex flex-wrap items-center gap-2 mt-3 justify-center sm:justify-start">
                <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <i class="fa-solid fa-shield-halved"></i> ${rolName}
                </span>
                <span class="px-3 py-1 rounded-full text-xs font-bold ${status === '1' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                  ${status === '1' ? '<i class="fa-solid fa-circle text-emerald-500 mr-1"></i> Activo' : '<i class="fa-solid fa-circle text-red-500 mr-1"></i> Inactivo'}
                </span>
              </div>
            </div>
          </div>

          <!-- Grid de Detalles Técnicos -->
          <div class="p-6 bg-gray-50 rounded-2xl border border-gray-100">
            <h4 class="text-xs font-bold text-brand-deep uppercase tracking-wider m-0 mb-4 border-b border-gray-200/50 pb-2">Detalles Personales e Identificación</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div class="flex flex-col gap-1">
                <span class="text-xs text-muted font-semibold uppercase tracking-wide">Tipo Documento:</span>
                <span class="font-bold text-brand-deep">${docType}</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-xs text-muted font-semibold uppercase tracking-wide">Documento:</span>
                <span class="font-bold text-brand-deep">${docNum}</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-xs text-muted font-semibold uppercase tracking-wide">Correo Electrónico:</span>
                <span class="font-bold text-brand-deep break-all">${usuario.Email || 'No especificado'}</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-xs text-muted font-semibold uppercase tracking-wide">Teléfono:</span>
                <span class="font-bold text-brand-deep">${usuario.Telefono || 'No especificado'}</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-xs text-muted font-semibold uppercase tracking-wide">País de origen:</span>
                <span class="font-bold text-brand-deep">${usuario.Pais || 'No especificado'}</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-xs text-muted font-semibold uppercase tracking-wide">Departamento:</span>
                <span class="font-bold text-brand-deep">${usuario.Departamento || 'No especificado'}</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-xs text-muted font-semibold uppercase tracking-wide">Dirección física:</span>
                <span class="font-bold text-brand-deep">${usuario.Direccion || 'No especificada'}</span>
              </div>
            </div>
          </div>

          <!-- Historial de Reservas Relacionadas -->
          <div class="p-6 bg-white rounded-2xl border border-gray-100">
            <h4 class="text-xs font-bold text-brand-deep uppercase tracking-wider m-0 mb-4 border-b border-gray-200/50 pb-2 flex items-center justify-between">
              <span><i class="fa-regular fa-calendar"></i> Reservas Asignadas / Realizadas</span>
              <span class="text-[10px] bg-brand/10 text-brand-deep px-2 py-0.5 rounded-full font-bold">${usuarioReservas.length} Reservas</span>
            </h4>
            
            <div class="responsive-scroll">
              ${usuarioReservas.length > 0 ? `
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="bg-gray-50 border-b border-gray-100 text-brand-deep">
                      <th class="p-3 font-bold">Código</th>
                      <th class="p-3 font-bold">Habitación</th>
                      <th class="p-3 font-bold">Fechas</th>
                      <th class="p-3 font-bold">Total</th>
                      <th class="p-3 font-bold">Estado</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-50">
                    ${usuarioReservas.map(r => `
                      <tr>
                        <td class="p-3 font-bold text-brand-deep">#${r.IDReserva || r.id_reserva || 'N/A'}</td>
                        <td class="p-3 font-semibold text-gray-700">${r.NombreHabitacion || r.habitacion || 'Asignada'}</td>
                        <td class="p-3 text-gray-500">${r.FechaEntrada ? r.FechaEntrada.slice(0, 10) : ''} al ${r.FechaSalida ? r.FechaSalida.slice(0, 10) : ''}</td>
                        <td class="p-3 font-semibold text-brand-deep">$${Number(r.CostoTotal || r.costo_total || 0).toLocaleString()}</td>
                        <td class="p-3">
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${String(r.EstadoReserva || r.estado).toLowerCase().includes('confirm') || String(r.EstadoReserva || r.estado).toLowerCase().includes('pagado') ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                            ${r.EstadoReserva || r.estado || 'Activo'}
                          </span>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : '<p class="text-xs text-muted m-0 py-2 italic">Este usuario no tiene un historial de reservas registrado en el hotel.</p>'}
            </div>
          </div>

          <!-- Metadatos de la cuenta -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted border-t border-gray-100 pt-4">
            <div><i class="fa-solid fa-key"></i> ID Sistema: #${usuario.IDUsuario}</div>
            <div class="sm:text-right"><i class="fa-regular fa-calendar"></i> Registrado en BD: Miembro Activo</div>
          </div>

          <!-- Botones de Acción -->
          <div class="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
            <button onclick='window.usuariosModule.showEditModal(${JSON.stringify(id)})' class="px-5 py-3 rounded-xl bg-brand text-white font-semibold shadow-md shadow-brand/10 hover:bg-brand-deep cursor-pointer transition-all border-none text-xs">
              <i class="fa-solid fa-pen"></i> Editar Datos
            </button>
            <button onclick='window.usuariosModule.changeStatus(${JSON.stringify(id)}, ${status === '1' ? 0 : 1})' class="px-5 py-3 rounded-xl border border-gray-200 text-brand-deep font-semibold bg-white hover:bg-gray-50 cursor-pointer transition-all text-xs">
              <i class="fa-solid fa-rotate-right"></i> Cambiar Estado (Activo/Inactivo)
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Mostrar modal de registro de nuevo usuario
  showNewUserModal() {
    const modalHtml = `
      <div id="userModalOverlay" class="fixed inset-0 modal-premium-backdrop z-[1000] flex items-center justify-center p-4 transition-all duration-300">
        <article class="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden transform scale-95 transition-transform duration-300">
          
          <div class="flex justify-between items-center p-6 border-b border-gray-100 bg-white z-10 shrink-0">
            <div>
              <h3 class="text-xl font-bold text-brand-deep m-0">Nuevo Usuario</h3>
              <p class="text-xs text-muted mt-1 m-0">Completa la información para registrar un nuevo usuario.</p>
            </div>
            <div class="flex items-center gap-3">
              <button type="button" onclick="document.getElementById('userModalOverlay').remove()" class="px-4 py-2 rounded-xl bg-gray-50 text-muted font-semibold hover:bg-gray-100 transition-colors border border-gray-200 cursor-pointer text-sm">Cancelar</button>
              <button type="submit" form="newUserForm" class="px-5 py-2 rounded-xl bg-brand text-white font-semibold hover:bg-brand-deep shadow-md shadow-brand/20 transition-all border-none cursor-pointer text-sm">Guardar usuario</button>
            </div>
          </div>

          <div class="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30">
            <form id="newUserForm" class="flex flex-col gap-6 m-0">
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
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Número Documento <span class="text-red-500">*</span></label>
                    <input type="text" id="newNroDocumento" maxlength="20" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" placeholder="Solo números" required>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Nombre Completo <span class="text-red-500">*</span></label>
                    <input type="text" id="newNombre" maxlength="50" oninput="this.value = this.value.replace(/[0-9]/g, '')" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" placeholder="Nombre" required>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Apellido <span class="text-red-500">*</span></label>
                    <input type="text" id="newApellido" maxlength="50" oninput="this.value = this.value.replace(/[0-9]/g, '')" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" placeholder="Apellido" required>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Email <span class="text-red-500">*</span></label>
                    <input type="email" id="newEmail" maxlength="100" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" placeholder="correo@vialuna.com" required>
                  </div>

                  <div class="flex flex-col gap-2 sm:col-span-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">País <span class="text-red-500">*</span></label>
                    <select id="newPais" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all cursor-pointer">
                      ${buildCountryOptions('CO')}
                    </select>
                  </div>
                  <div class="flex flex-col gap-2 sm:col-span-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Teléfono <span class="text-red-500">*</span></label>
                    <div class="flex items-center gap-2">
                      <span id="newUserDialCode" class="inline-flex items-center min-h-[44px] px-3 rounded-xl border border-gray-200 bg-gray-100 text-sm font-bold text-brand-deep whitespace-nowrap"></span>
                      <input type="tel" id="newTelefono" maxlength="15" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" placeholder="Número sin código" required>
                    </div>
                    <p class="text-[10px] text-muted mt-0.5">El código de país es solo referencial, no se guarda en la base de datos.</p>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Departamento</label>
                    <input type="text" id="newDepartamento" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" placeholder="Departamento o Estado" oninput="this.value = this.value.replace(/[0-9]/g, '')">
                  </div>
                  <div class="flex flex-col gap-2 sm:col-span-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Dirección</label>
                    <input type="text" id="newDireccion" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" placeholder="Dirección física">
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Login (Usuario) <span class="text-red-500">*</span></label>
                    <input type="text" id="newUsername" maxlength="50" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" placeholder="Ej: admin_luna" required>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Contraseña <span class="text-red-500">*</span></label>
                    <input type="password" id="newPassword" maxlength="50" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" placeholder="Mínimo 6 caracteres" required>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Rol Asignado <span class="text-red-500">*</span></label>
                    <select id="newRol" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all cursor-pointer" required>
                      ${this.roles.map(r => `<option value="${r.IDRol}">${r.Nombre}</option>`).join('')}
                    </select>
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

    const existing = document.getElementById('userModalOverlay');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    setTimeout(() => {
      const modal = document.getElementById('userModalOverlay');
      if(modal) {
          modal.querySelector('article').classList.remove('scale-95');
          modal.querySelector('article').classList.add('scale-100');
      }
    }, 10);

    const form = document.getElementById("newUserForm");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveNewUser();
    });

    // Vincular selector de país con prefijo telefónico
    bindCountryDial('newPais', 'newUserDialCode');
  }

  // Guardar el nuevo usuario por medio de la API
  async saveNewUser() {
    const paisSel = document.getElementById('newPais');
    const paisCode = paisSel ? paisSel.value : 'CO';
    const paisInfo = findCountry(paisCode);
    const paisName = paisInfo ? paisInfo.name : (paisSel?.options[paisSel.selectedIndex]?.textContent?.split('(')[0].trim() || 'Colombia');

    const payload = {
      Nombre: document.getElementById("newNombre").value,
      Apellido: document.getElementById("newApellido").value,
      Email: document.getElementById("newEmail").value,
      Telefono: document.getElementById("newTelefono").value,
      Username: document.getElementById("newUsername").value,
      Password: document.getElementById("newPassword").value,
      TipoDocumento: document.getElementById("newTipoDocumento").value,
      NumeroDocumento: parseInt(document.getElementById("newNroDocumento").value),
      Pais: paisName,
      Departamento: document.getElementById("newDepartamento").value,
      Direccion: document.getElementById("newDireccion").value,
      IDRol: parseInt(document.getElementById("newRol").value),
      Estado: parseInt(document.getElementById("newEstado").value)
    };

    try {
      console.log('Enviando creación de usuario:', payload);
      await createUsuario(payload);
      showAlert('Información', 'Usuario creado exitosamente', 'success');
      document.getElementById('userModalOverlay').remove();
      await this.loadData();
      this.renderTable(this.usuarios);
    } catch (error) {
      console.error('Error guardando usuario:', error);
      showAlert('Error', 'Error al registrar usuario: ' + (error.message || 'Error en campos o correo duplicado'), 'error');
    }
  }

  // Mostrar modal de edición
  async showEditModal(id) {
    const usuario = this.usuarios.find(u => u.IDUsuario === id || u.IDUsuario == id);
    if (!usuario) {
      showAlert('Error', 'Usuario no encontrado', 'error');
      return;
    }

    if (usuario._isClient) {
      if (!window.clientesModule) {
        const { renderClientes } = await import('./clientes.js');
        const dummy = document.createElement('div');
        renderClientes(dummy);
      }
      
      const originalSaveClient = window.clientesModule.saveClient.bind(window.clientesModule);
      window.clientesModule.saveClient = async (cid) => {
         await originalSaveClient(cid);
         await this.loadData();
         this.renderTable(this.usuarios);
         window.clientesModule.saveClient = originalSaveClient;
      };
      
      window.clientesModule.edit(usuario._originalId);
      return;
    }

    const unameLowerEdit = String(usuario.NombreUsuario || usuario.Nombre || '').toLowerCase();
    if (unameLowerEdit === 'yoni' || unameLowerEdit === 'zury' || unameLowerEdit.includes('yoni') || unameLowerEdit.includes('zury')) {
      showAlert('Advertencia', 'Este usuario es un Súper Admin y no puede ser editado.', 'warning');
      return;
    }

    const nombre = usuario.NombreUsuario || usuario.Nombre || '';
    const apellido = usuario.Apellido || '';
    const email = usuario.Email || '';
    const telefono = usuario.Telefono || '';
    const docType = usuario.TipoDocumento || 'CC';
    const docNum = usuario.NumeroDocumento || usuario.NroDocumento || '';
    const pais = usuario.Pais || 'Colombia';
    const direccion = usuario.Direccion || '';
    const departamento = usuario.Departamento || '';
    const rolId = usuario.IDRol || 1;
    const status = usuario.Estado !== undefined ? String(usuario.Estado) : '1';

    const modalHtml = `
      <div id="editUserModalOverlay" class="fixed inset-0 modal-premium-backdrop z-[1000] flex items-center justify-center p-4 transition-all duration-300">
        <article class="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden transform scale-95 transition-transform duration-300">
          
          <div class="flex justify-between items-center p-6 border-b border-gray-100 bg-white z-10 shrink-0">
            <div>
              <h3 class="text-xl font-bold text-brand-deep m-0">Editar Usuario: ${nombre}</h3>
              <p class="text-xs text-muted mt-1 m-0">Modifica la información del usuario.</p>
            </div>
            <div class="flex items-center gap-3">
              <button type="button" onclick="document.getElementById('editUserModalOverlay').remove()" class="px-4 py-2 rounded-xl bg-gray-50 text-muted font-semibold hover:bg-gray-100 transition-colors border border-gray-200 cursor-pointer text-sm">Cancelar</button>
              <button type="submit" form="editUserForm" class="px-5 py-2 rounded-xl bg-brand text-white font-semibold hover:bg-brand-deep shadow-md shadow-brand/20 transition-all border-none cursor-pointer text-sm">Guardar Cambios</button>
            </div>
          </div>

          <div class="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30">
            <form id="editUserForm" class="flex flex-col gap-6 m-0">
              <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-5">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Tipo Documento</label>
                    <select id="editTipoDocumento" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all cursor-pointer">
                      <option value="CC" ${docType === 'CC' ? 'selected' : ''}>Cédula de Ciudadanía</option>
                      <option value="TI" ${docType === 'TI' ? 'selected' : ''}>Tarjeta de Identidad</option>
                      <option value="CE" ${docType === 'CE' ? 'selected' : ''}>Cédula de Extranjería</option>
                      <option value="Pasaporte" ${docType === 'Pasaporte' ? 'selected' : ''}>Pasaporte</option>
                    </select>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Número Documento <span class="text-red-500">*</span></label>
                    <input type="text" id="editNroDocumento" value="${docNum}" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-100 text-sm font-semibold focus:outline-none cursor-not-allowed" readonly>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Nombre Completo <span class="text-red-500">*</span></label>
                    <input type="text" id="editNombre" value="${nombre}" maxlength="50" oninput="this.value = this.value.replace(/[0-9]/g, '')" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" required>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Apellido <span class="text-red-500">*</span></label>
                    <input type="text" id="editApellido" value="${apellido}" maxlength="50" oninput="this.value = this.value.replace(/[0-9]/g, '')" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" required>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Email <span class="text-red-500">*</span></label>
                    <input type="email" id="editEmail" value="${email}" maxlength="100" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" required>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Teléfono <span class="text-red-500">*</span></label>
                    <input type="tel" id="editTelefono" value="${telefono}" maxlength="15" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" required>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">País <span class="text-red-500">*</span></label>
                    <input type="text" id="editPais" value="${pais}" oninput="this.value = this.value.replace(/[0-9]/g, '')" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" required>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Departamento <span class="text-red-500">*</span></label>
                    <input type="text" id="editDepartamento" value="${departamento}" oninput="this.value = this.value.replace(/[0-9]/g, '')" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" required>
                  </div>
                  <div class="flex flex-col gap-2 sm:col-span-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Dirección</label>
                    <input type="text" id="editDireccion" value="${direccion}" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all">
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Rol Asignado</label>
                    <select id="editRol" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all cursor-pointer">
                      ${this.roles.map(r => `<option value="${r.IDRol}" ${Number(r.IDRol) === Number(rolId) ? 'selected' : ''}>${r.Nombre}</option>`).join('')}
                    </select>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-muted uppercase tracking-wider">Estado</label>
                    <select id="editEstado" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all cursor-pointer">
                      <option value="1" ${status === '1' ? 'selected' : ''}>Activo</option>
                      <option value="0" ${status === '0' ? 'selected' : ''}>Inactivo</option>
                    </select>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </article>
      </div>
    `;

    const existing = document.getElementById('editUserModalOverlay');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    setTimeout(() => {
      const modal = document.getElementById('editUserModalOverlay');
      if(modal) {
          modal.querySelector('article').classList.remove('scale-95');
          modal.querySelector('article').classList.add('scale-100');
      }
    }, 10);

    const form = document.getElementById("editUserForm");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveEditUser(id);
    });
  }

  // Guardar la edición de un usuario
  async saveEditUser(id) {
    const payload = {
      Nombre: document.getElementById("editNombre").value,
      Apellido: document.getElementById("editApellido").value,
      Email: document.getElementById("editEmail").value,
      Telefono: document.getElementById("editTelefono").value,
      TipoDocumento: document.getElementById("editTipoDocumento").value,
      Pais: document.getElementById("editPais").value,
      Departamento: document.getElementById("editDepartamento").value,
      Direccion: document.getElementById("editDireccion").value,
      IDRol: parseInt(document.getElementById("editRol").value),
      Estado: parseInt(document.getElementById("editEstado").value)
    };

    try {
      console.log('Enviando actualización de usuario:', payload);
      // Clear previous inline errors
      document.querySelectorAll('#editUserForm .error-message').forEach(e => { e.classList.add('hidden'); e.textContent = ''; });

      // Basic validations
      const nombreVal = String(document.getElementById("editNombre").value || '').trim();
      const apellidoVal = String(document.getElementById("editApellido").value || '').trim();
      const emailVal = String(document.getElementById("editEmail").value || '').trim();
      const telefonoVal = String(document.getElementById("editTelefono").value || '').trim();

      let hasError = false;
      if (!nombreVal || /\d/.test(nombreVal)) { const el = document.querySelector('.error-message[data-for="editNombre"]'); if (el) { el.classList.remove('hidden'); el.textContent = 'Nombre inválido.'; } hasError = true; }
      if (!apellidoVal || /\d/.test(apellidoVal)) { const el = document.querySelector('.error-message[data-for="editApellido"]'); if (el) { el.classList.remove('hidden'); el.textContent = 'Apellido inválido.'; } hasError = true; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) { const el = document.querySelector('.error-message[data-for="editEmail"]'); if (el) { el.classList.remove('hidden'); el.textContent = 'Email inválido.'; } hasError = true; }
      if (telefonoVal && !/^[0-9]{7,15}$/.test(telefonoVal)) { const el = document.querySelector('.error-message[data-for="editTelefono"]'); if (el) { el.classList.remove('hidden'); el.textContent = 'Teléfono inválido.'; } hasError = true; }

      if (hasError) { showAlert('Error', 'Corrige los campos marcados.', 'error'); return; }

      await updateUsuario(id, payload);
      showAlert('Información', 'Usuario actualizado correctamente', 'info');
      await this.loadData();
      this.showList();
    } catch (error) {
      console.error('Error editando usuario:', error);
      showAlert('Error', 'Error al guardar cambios: ' + (error.message || 'Error en conexión'), 'error');
    }
  }

  // Eliminar un usuario
  async deleteUser(id) {
    const usuario = this.usuarios.find(u => u.IDUsuario === id || u.IDUsuario == id);
    if (!usuario) return;

    if (usuario._isClient) {
      const confirm = await Swal.fire({
        title: '¿Eliminar Huésped/Cliente?',
        text: "Esta acción no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      });

      if (confirm.isConfirmed) {
        try {
          const { deleteCliente } = await import('../core/api.js');
          await deleteCliente(usuario._originalId);
          showAlert('Eliminado', 'El huésped ha sido eliminado correctamente.', 'success');
          await this.loadData();
          this.renderTable(this.usuarios);
        } catch (error) {
          console.error('Error al eliminar cliente:', error);
          showAlert('Error', 'No se pudo eliminar el huésped. Es posible que tenga reservas asociadas.', 'error');
        }
      }
      return;
    }

    const unameLower = String(usuario.NombreUsuario || usuario.Nombre || '').toLowerCase();
    if (unameLower === 'yoni' || unameLower === 'zury' || unameLower.includes('yoni') || unameLower.includes('zury')) {
      showAlert('Advertencia', 'Este usuario es un Súper Admin y no puede ser eliminado.', 'warning');
      return;
    }

    const confirm = await Swal.fire({
      title: '¿Eliminar Usuario?',
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
      try {
        await deleteUsuario(id);
        showAlert('Eliminado', 'El usuario ha sido eliminado correctamente.', 'success');
        await this.loadData();
        this.renderTable(this.usuarios);
      } catch (error) {
        console.error('Error al eliminar usuario:', error);
        showAlert('Error', 'No se pudo eliminar el usuario. Es posible que tenga registros asociados.', 'error');
      }
    }
  }

  // Mostrar mensaje de error en la UI
  showError(title, message) {
    this.container.innerHTML = `
      <div class="flex flex-col items-center justify-center p-12 text-center bg-white border border-gray-100 rounded-3xl shadow-sm">
        <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner"><i class="fa-solid fa-xmark"></i></div>
        <h2 class="text-xl font-bold text-brand-deep mb-2">${title}</h2>
        <p class="text-muted text-sm mb-6 max-w-md">${message}</p>
        <button onclick="location.reload()" class="px-6 py-3 bg-brand hover:bg-brand-deep text-white font-semibold rounded-xl transition cursor-pointer border-none text-sm shadow-md shadow-brand/10">
          <i class="fa-solid fa-rotate-right"></i> Recargar página
        </button>
      </div>
    `;
  }
}

// Función exportada de inicio para el SPA
export function renderUsuarios(container) {
  console.log('🎯 renderUsuarios llamado con container:', container);
  window.usuariosModule = new UsuariosModule(container);
  console.log('📦 UsuariosModule creado');
  window.usuariosModule.initialize();
  console.log('🚀 initialize() completado');
}
