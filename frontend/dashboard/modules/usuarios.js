// Módulo de Administración de Usuarios (VIA LUNA)
import { 
  getUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  getRoles,
  getReservas
} from "../core/api.js";

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
  }

  // Inicialización del módulo
  async initialize() {
    console.log('🔄 Inicializando UsuariosModule...');
    try {
      await this.loadData();
      console.log('✅ Datos de usuarios cargados');
      this.render();
      console.log('✅ Renderizado completado');
      this.setupEventListeners();
      console.log('✅ Escuchadores de eventos listos');
    } catch (error) {
      console.error('❌ Error en initialize:', error);
      this.showError("Error al cargar usuarios", "Asegúrese de que el servidor backend esté en ejecución.");
    }
  }

  // Cargar información desde la base de datos
  async loadData() {
    try {
      const [usersResponse, rolesResponse, reservesResponse] = await Promise.all([
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
        })
      ]);

      this.usuarios = usersResponse || [];
      this.roles = rolesResponse.data || rolesResponse || [];
      this.reservas = reservesResponse || [];

      this.calculateMetrics();
    } catch (error) {
      console.error('Error cargando información de la API:', error);
      // Fallback a datos estáticos si la base de datos no está disponible
      this.usuarios = this.getUsuariosEjemplo();
      this.roles = [
        { IDRol: 1, Nombre: 'Administrador', Descripcion: 'Acceso total', Estado: '1' },
        { IDRol: 2, Nombre: 'Cliente', Descripcion: 'Acceso limitado', Estado: '1' }
      ];
      this.reservas = [];
      this.calculateMetrics();
    }
  }

  // Fallback de usuarios si falla la conexión
  getUsuariosEjemplo() {
    return [
      { IDUsuario: 1, NombreUsuario: 'admin', Email: 'admin@vialuna.com', Telefono: '3000000000', IDRol: 1, NombreRol: 'Administrador', Estado: 1, NumeroDocumento: 10001, TipoDocumento: 'CC', Apellido: 'Administrador', Pais: 'Colombia', Direccion: 'Calle Principal #10' },
      { IDUsuario: 2, NombreUsuario: 'zurydaniela', Email: 'zury.daniela@vialuna.com', Telefono: '3157894561', IDRol: 1, NombreRol: 'Administrador', Estado: 1, NumeroDocumento: 10002, TipoDocumento: 'CC', Apellido: 'Daniela', Pais: 'Colombia', Direccion: 'Calle 50 #24' },
      { IDUsuario: 3, NombreUsuario: 'Yoni', Email: 'yoniurrego444@gmail.com', Telefono: '3052786212', IDRol: 1, NombreRol: 'Administrador', Estado: 1, NumeroDocumento: 10003, TipoDocumento: 'CC', Apellido: 'Urrego', Pais: 'Colombia', Direccion: 'Diagonal 45 #12' }
    ];
  }

  // Calcular estadísticas dinámicas
  calculateMetrics() {
    const total = this.usuarios.length;
    
    // Filtrar por IDRol
    const admins = this.usuarios.filter(u => Number(u.IDRol) === 1 || String(u.NombreRol).toLowerCase() === 'administrador').length;
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
      const response = await fetch('../public/usuarios.html');
      const html = await response.text();
      this.container.innerHTML = html;
      await this.loadData();
      this.render();
      this.setupEventListeners();
    } catch (error) {
      console.error('Error cargando HTML de usuarios:', error);
      this.render();
      this.setupEventListeners();
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
    const searchElem = this.container.querySelector("#searchUsuarios");
    const filterRolElem = this.container.querySelector("#filterRol");
    const filterEstadoElem = this.container.querySelector("#filterEstado");

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
        console.error('❌ Tbody #usuariosTableBody no encontrado en el container');
        return;
      }
      this._renderTableContent(data, tbody);
    }, 50);
  }

  _renderTableContent(data, tbody) {
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-muted font-semibold">No hay usuarios registrados</td></tr>';
      return;
    }

    const tableHTML = data.map((usuario) => {
      const id = usuario.IDUsuario;
      const nombreUsuario = usuario.NombreUsuario || usuario.Nombre || 'Sin Nombre';
      const apellido = usuario.Apellido || '';
      const nombreCompleto = `${nombreUsuario} ${apellido}`.trim();
      const email = usuario.Email || 'Sin email';
      const telefono = usuario.Telefono || 'Sin teléfono';
      const rolName = usuario.NombreRol || (Number(usuario.IDRol) === 1 ? 'Administrador' : 'Cliente');
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
            <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${Number(usuario.IDRol) === 1 ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-blue-50 text-blue-800 border border-blue-100'}">
              🛡️ ${rolName}
            </span>
          </td>
          <td class="px-6 py-4 font-semibold text-gray-500">${docNum}</td>
          <td class="px-6 py-4">
            <div class="flex items-center gap-3">
              <label class="relative inline-block w-11 h-6 m-0 cursor-pointer shrink-0">
                <input type="checkbox" class="sr-only peer" ${status === '1' ? 'checked' : ''} 
                       onchange="window.usuariosModule.changeStatus(${id}, this.checked ? 1 : 0)">
                <span class="absolute inset-0 rounded-full bg-slate-200 peer-checked:bg-emerald-500 transition-colors duration-300 before:content-[''] before:absolute before:h-[18px] before:w-[18px] before:left-[3px] before:bottom-[3px] before:bg-white before:rounded-full before:transition-transform before:duration-300 peer-checked:before:translate-x-5"></span>
              </label>
              <span class="px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all duration-300 ${status === '1' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                ${status === '1' ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </td>
          <td class="px-6 py-4">
            <div class="action-group-modern justify-center">
              <button class="btn-action-modern view" onclick="window.usuariosModule.viewDetails(${id})" title="Ver detalle">
                🔍
              </button>
              <button class="btn-action-modern edit" onclick="window.usuariosModule.showEditModal(${id})" title="Editar">
                ✏️
              </button>
              <button class="btn-action-modern delete" onclick="window.usuariosModule.deleteUser(${id})" title="Eliminar">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = tableHTML;
  }

  // Filtrar los datos reactivamente en la vista
  filterData() {
    const searchVal = this.container.querySelector("#searchUsuarios").value.toLowerCase();
    const filterRol = this.container.querySelector("#filterRol").value;
    const filterEstado = this.container.querySelector("#filterEstado").value;

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

    this.renderTable(filtered);
  }

  // Cambiar estado del usuario
  async changeStatus(id, nuevoEstado) {
    const usuario = this.usuarios.find(u => u.IDUsuario === id);
    if (!usuario) return;

    if (!confirm(`¿Está seguro de cambiar el estado del usuario a ${nuevoEstado === 1 ? 'Activo' : 'Inactivo'}?`)) {
      this.render();
      return;
    }

    try {
      usuario.Estado = nuevoEstado;
      
      // Intentamos llamar a la API
      await updateUsuario(id, { ...usuario, Estado: nuevoEstado });
      alert(`Estado del usuario actualizado a ${nuevoEstado === 1 ? 'Activo' : 'Inactivo'}`);
      await this.loadData();
      this.render();
    } catch (error) {
      console.error('Error actualizando estado:', error);
      alert('Se actualizó el estado localmente (' + (error.message || 'Sin persistencia en servidor') + ')');
      this.render();
    }
  }

  // Eliminar usuario de la persistencia
  async deleteUser(id) {
    const usuario = this.usuarios.find(u => u.IDUsuario === id);
    if (!usuario) return;

    const nombreCompleto = `${usuario.NombreUsuario || usuario.Nombre || ''} ${usuario.Apellido || ''}`.trim();
    if (!confirm(`¿Está seguro de eliminar de forma permanente al usuario "${nombreCompleto}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await deleteUsuario(id);
      alert('Usuario eliminado correctamente.');
      await this.loadData();
      this.render();
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      alert('Error al eliminar usuario: ' + (error.message || 'Error de conexión'));
    }
  }

  // Exportar lista de usuarios a formato CSV
  exportData() {
    if (!this.usuarios.length) {
      alert("No hay registros para exportar");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Nombre Usuario,Apellido,Email,Telefono,Documento,Tipo Documento,Rol,Estado\n";

    this.usuarios.forEach(u => {
      const row = [
        u.IDUsuario || "",
        u.NombreUsuario || u.Nombre || "",
        u.Apellido || "",
        u.Email || "",
        u.Telefono || "",
        u.NumeroDocumento || u.NroDocumento || "",
        u.TipoDocumento || "CC",
        u.NombreRol || (Number(u.IDRol) === 1 ? "Administrador" : "Cliente"),
        u.Estado !== undefined && String(u.Estado) === '0' ? "Inactivo" : "Activo"
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `usuarios_vialuna_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Visualizar detalles del usuario en pantalla
  viewDetails(id) {
    const usuario = this.usuarios.find(u => u.IDUsuario === id);
    if (!usuario) {
      alert('Usuario no encontrado');
      return;
    }

    const nombreCompleto = `${usuario.NombreUsuario || usuario.Nombre || ''} ${usuario.Apellido || ''}`.trim() || 'Sin nombre';
    const rolName = usuario.NombreRol || (Number(usuario.IDRol) === 1 ? 'Administrador' : 'Cliente');
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
          <h2 class="text-xl font-bold text-brand-deep m-0 flex items-center gap-2">🔍 Perfil del Usuario</h2>
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
                  🛡️ ${rolName}
                </span>
                <span class="px-3 py-1 rounded-full text-xs font-bold ${status === '1' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                  ${status === '1' ? '🟢 Activo' : '🔴 Inactivo'}
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
                <span class="text-xs text-muted font-semibold uppercase tracking-wide">Dirección física:</span>
                <span class="font-bold text-brand-deep">${usuario.Direccion || 'No especificada'}</span>
              </div>
            </div>
          </div>

          <!-- Historial de Reservas Relacionadas -->
          <div class="p-6 bg-white rounded-2xl border border-gray-100">
            <h4 class="text-xs font-bold text-brand-deep uppercase tracking-wider m-0 mb-4 border-b border-gray-200/50 pb-2 flex items-center justify-between">
              <span>📅 Reservas Asignadas / Realizadas</span>
              <span class="text-[10px] bg-brand/10 text-brand-deep px-2 py-0.5 rounded-full font-bold">${usuarioReservas.length} Reservas</span>
            </h4>
            
            <div class="overflow-x-auto">
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
            <div>🔑 ID Sistema: #${usuario.IDUsuario}</div>
            <div class="sm:text-right">📅 Registrado en BD: Miembro Activo</div>
          </div>

          <!-- Botones de Acción -->
          <div class="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
            <button onclick="window.usuariosModule.showEditModal(${id})" class="px-5 py-3 rounded-xl bg-brand text-white font-semibold shadow-md shadow-brand/10 hover:bg-brand-deep cursor-pointer transition-all border-none text-xs">
              ✏️ Editar Datos
            </button>
            <button onclick="window.usuariosModule.changeStatus(${id}, ${status === '1' ? 0 : 1})" class="px-5 py-3 rounded-xl border border-gray-200 text-brand-deep font-semibold bg-white hover:bg-gray-50 cursor-pointer transition-all text-xs">
              🔄 Cambiar Estado (Activo/Inactivo)
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Mostrar modal de registro de nuevo usuario
  showNewUserModal() {
    this.container.innerHTML = `
      <div class="max-w-2xl mx-auto p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-sm">
        <div class="flex items-center justify-between border-b border-gray-100 pb-5 mb-6">
          <h2 class="text-xl font-bold text-brand-deep m-0 flex items-center gap-2">➕ Registrar Nuevo Usuario</h2>
          <button onclick="window.usuariosModule.showList()" class="px-4 py-2 bg-gray-50 border border-gray-200 text-brand-deep text-xs font-bold rounded-xl hover:bg-gray-100 cursor-pointer transition-all duration-300">
            ← Volver a la lista
          </button>
        </div>

        <form id="newUserForm" class="flex flex-col gap-5 m-0 p-0">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Nombre de Usuario *</label>
              <input type="text" id="newUsername" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20" placeholder="Ej: admin_luna" required>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Contraseña *</label>
              <input type="password" id="newPassword" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20" placeholder="Mínimo 6 caracteres" required>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Nombre Completo *</label>
              <input type="text" id="newNombre" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20" placeholder="Nombre" required>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Apellido *</label>
              <input type="text" id="newApellido" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20" placeholder="Apellido" required>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Email *</label>
              <input type="email" id="newEmail" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20" placeholder="correo@vialuna.com" required>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Teléfono</label>
              <input type="tel" id="newTelefono" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20" placeholder="Número de contacto">
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Tipo Documento</label>
              <select id="newTipoDocumento" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer">
                <option value="CC">Cédula de Ciudadanía</option>
                <option value="TI">Tarjeta de Identidad</option>
                <option value="CE">Cédula de Extranjería</option>
                <option value="Pasaporte">Pasaporte</option>
              </select>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Número Documento *</label>
              <input type="number" id="newNroDocumento" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20" placeholder="Solo números" required>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">País</label>
              <input type="text" id="newPais" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20" value="Colombia">
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Dirección</label>
              <input type="text" id="newDireccion" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20" placeholder="Dirección física">
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Rol Asignado *</label>
              <select id="newRol" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer" required>
                ${this.roles.map(r => `<option value="${r.IDRol}">${r.Nombre}</option>`).join('')}
              </select>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Estado Inicial</label>
              <select id="newEstado" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer">
                <option value="1">Activo</option>
                <option value="0">Inactivo</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button type="button" onclick="window.usuariosModule.showList()" class="px-5 py-3 rounded-xl border border-gray-200 text-muted font-semibold bg-white hover:bg-gray-50 cursor-pointer transition-all duration-300 text-sm">Cancelar</button>
            <button type="submit" class="px-7 py-3 rounded-xl bg-brand text-white font-semibold shadow-md shadow-brand/10 hover:bg-brand-deep active:scale-98 transition-all duration-300 border-none cursor-pointer text-sm">➕ Registrar</button>
          </div>
        </form>
      </div>
    `;

    const form = this.container.querySelector("#newUserForm");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveNewUser();
    });
  }

  // Guardar el nuevo usuario por medio de la API
  async saveNewUser() {
    const payload = {
      Nombre: this.container.querySelector("#newNombre").value,
      Apellido: this.container.querySelector("#newApellido").value,
      Email: this.container.querySelector("#newEmail").value,
      Telefono: this.container.querySelector("#newTelefono").value,
      Username: this.container.querySelector("#newUsername").value,
      Password: this.container.querySelector("#newPassword").value,
      TipoDocumento: this.container.querySelector("#newTipoDocumento").value,
      NumeroDocumento: parseInt(this.container.querySelector("#newNroDocumento").value),
      Pais: this.container.querySelector("#newPais").value,
      Direccion: this.container.querySelector("#newDireccion").value,
      IDRol: parseInt(this.container.querySelector("#newRol").value),
      Estado: parseInt(this.container.querySelector("#newEstado").value)
    };

    try {
      console.log('Enviando creación de usuario:', payload);
      await createUsuario(payload);
      alert('Usuario creado exitosamente');
      await this.loadData();
      this.showList();
    } catch (error) {
      console.error('Error guardando usuario:', error);
      alert('Error al registrar usuario: ' + (error.message || 'Error en campos o correo duplicado'));
    }
  }

  // Mostrar modal de edición
  showEditModal(id) {
    const usuario = this.usuarios.find(u => u.IDUsuario === id);
    if (!usuario) {
      alert('Usuario no encontrado');
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
    const rolId = usuario.IDRol || 1;
    const status = usuario.Estado !== undefined ? String(usuario.Estado) : '1';

    this.container.innerHTML = `
      <div class="max-w-2xl mx-auto p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-sm">
        <div class="flex items-center justify-between border-b border-gray-100 pb-5 mb-6">
          <h2 class="text-xl font-bold text-brand-deep m-0 flex items-center gap-2">✏️ Editar Usuario: ${nombre}</h2>
          <button onclick="window.usuariosModule.showList()" class="px-4 py-2 bg-gray-50 border border-gray-200 text-brand-deep text-xs font-bold rounded-xl hover:bg-gray-100 cursor-pointer transition-all duration-300">
            ← Volver a la lista
          </button>
        </div>

        <form id="editUserForm" class="flex flex-col gap-5 m-0 p-0">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Nombre de Usuario (Login)</label>
              <input type="text" id="editUsername" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-100 text-sm font-semibold focus:outline-none cursor-not-allowed" value="${nombre}" readonly>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Contraseña (Dejar vacío para mantener)</label>
              <input type="password" id="editPassword" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20" placeholder="Nueva contraseña">
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Nombre Completo *</label>
              <input type="text" id="editNombre" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20" value="${nombre}" required>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Apellido *</label>
              <input type="text" id="editApellido" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20" value="${apellido}" required>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Email *</label>
              <input type="email" id="editEmail" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20" value="${email}" required>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Teléfono</label>
              <input type="tel" id="editTelefono" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20" value="${telefono}">
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Tipo Documento</label>
              <select id="editTipoDocumento" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer">
                <option value="CC" ${docType === 'CC' ? 'selected' : ''}>Cédula de Ciudadanía</option>
                <option value="TI" ${docType === 'TI' ? 'selected' : ''}>Tarjeta de Identidad</option>
                <option value="CE" ${docType === 'CE' ? 'selected' : ''}>Cédula de Extranjería</option>
                <option value="Pasaporte" ${docType === 'Pasaporte' ? 'selected' : ''}>Pasaporte</option>
              </select>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Número Documento</label>
              <input type="number" id="editNroDocumento" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-100 text-sm font-semibold focus:outline-none cursor-not-allowed" value="${docNum}" readonly>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">País</label>
              <input type="text" id="editPais" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20" value="${pais}">
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Dirección</label>
              <input type="text" id="editDireccion" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20" value="${direccion}">
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Rol Asignado *</label>
              <select id="editRol" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer" required>
                ${this.roles.map(r => `<option value="${r.IDRol}" ${Number(rolId) === Number(r.IDRol) ? 'selected' : ''}>${r.Nombre}</option>`).join('')}
              </select>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-brand-deep uppercase tracking-wider">Estado</label>
              <select id="editEstado" class="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer">
                <option value="1" ${status === '1' ? 'selected' : ''}>Activo</option>
                <option value="0" ${status === '0' ? 'selected' : ''}>Inactivo</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button type="button" onclick="window.usuariosModule.showList()" class="px-5 py-3 rounded-xl border border-gray-200 text-muted font-semibold bg-white hover:bg-gray-50 cursor-pointer transition-all duration-300 text-sm">Cancelar</button>
            <button type="submit" class="px-7 py-3 rounded-xl bg-brand text-white font-semibold shadow-md shadow-brand/10 hover:bg-brand-deep active:scale-98 transition-all duration-300 border-none cursor-pointer text-sm">💾 Guardar Cambios</button>
          </div>
        </form>
      </div>
    `;

    const form = this.container.querySelector("#editUserForm");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveEditUser(id);
    });
  }

  // Guardar modificaciones del usuario por API
  async saveEditUser(id) {
    const editPassword = this.container.querySelector("#editPassword").value;
    
    const payload = {
      Nombre: this.container.querySelector("#editNombre").value,
      Apellido: this.container.querySelector("#editApellido").value,
      Email: this.container.querySelector("#editEmail").value,
      Telefono: this.container.querySelector("#editTelefono").value,
      Username: this.container.querySelector("#editNombre").value, // Mantener NombreUsuario mapeado
      TipoDocumento: this.container.querySelector("#editTipoDocumento").value,
      Pais: this.container.querySelector("#editPais").value,
      Direccion: this.container.querySelector("#editDireccion").value,
      IDRol: parseInt(this.container.querySelector("#editRol").value),
      Estado: parseInt(this.container.querySelector("#editEstado").value)
    };

    if (editPassword) {
      payload.Password = editPassword;
      payload.Contrasena = editPassword;
    }

    try {
      console.log('Enviando actualización de usuario:', payload);
      await updateUsuario(id, payload);
      alert('Usuario actualizado correctamente');
      await this.loadData();
      this.showList();
    } catch (error) {
      console.error('Error editando usuario:', error);
      alert('Error al guardar cambios: ' + (error.message || 'Error en conexión'));
    }
  }

  // Mostrar mensaje de error en la UI
  showError(title, message) {
    this.container.innerHTML = `
      <div class="flex flex-col items-center justify-center p-12 text-center bg-white border border-gray-100 rounded-3xl shadow-sm">
        <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner">❌</div>
        <h2 class="text-xl font-bold text-brand-deep mb-2">${title}</h2>
        <p class="text-muted text-sm mb-6 max-w-md">${message}</p>
        <button onclick="location.reload()" class="px-6 py-3 bg-brand hover:bg-brand-deep text-white font-semibold rounded-xl transition cursor-pointer border-none text-sm shadow-md shadow-brand/10">
          🔄 Recargar página
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
