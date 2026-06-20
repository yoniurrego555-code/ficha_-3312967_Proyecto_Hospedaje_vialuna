// Módulo de Roles y Permisos (VIA LUNA)
import { 
  getRoles, 
  getPermisos, 
  getRolesPermisos,
  createRol,
  updateRol,
  deleteRol,
  createRolPermiso,
  deleteRolPermiso,
  createPermiso,
  getUsuarios
} from "../core/api.js";

const showAlert = (title, text, icon) => Swal.fire(title, text, icon);

export class RolesPermisosModule {
  constructor(container) {
    this.container = container;
    
    // Datos en memoria
    this.roles = [];
    this.permisos = [];
    this.originalAsignaciones = []; // Mapeo plano de relaciones
    this.asignaciones = {};         // Relaciones agrupadas: { [IDRol]: [IDPermiso1, IDPermiso2, ...] }
    this.usuarios = [];             // Lista de usuarios para calcular counts por rol
    
    // Control de selección en la vista
    this.currentRoleId = null;
    this.tempSelectedPermisos = new Set(); // Copia temporal para el panel de permisos activo
    this.enabledModules = new Set(); // Estado visual de los módulos seleccionados
  }

  // Inicialización del módulo
  async initialize() {
    console.log('<i class="fa-solid fa-rotate-right"></i> Inicializando RolesPermisosModule...');
    try {
      await this.loadData();
      await this.ensureDefaultPermissions();
      this.render();
      console.log('<i class="fa-solid fa-check"></i> Vista de Roles y Permisos lista');
    } catch (error) {
      console.error('<i class="fa-solid fa-xmark"></i> Error al inicializar RolesPermisosModule:', error);
      this.showError('Error al cargar datos', error.message || 'Verifique la conexión con el servidor.');
    }
  }

  // Asegurar que todos los módulos tengan al menos un permiso en la BD
  async ensureDefaultPermissions() {
    const modulosFijos = ['Dashboard', 'Clientes', 'Reservas', 'Habitaciones', 'Servicios', 'Paquetes', 'Usuarios', 'Roles & Permisos'];
    const existingModules = new Set(this.permisos.map(p => this.getModuloPermiso(p.NombrePermisos || p.nombre)));
    
    let added = false;
    for (const m of modulosFijos) {
      if (!existingModules.has(m)) {
        try {
          console.log(`Auto-creando permiso base para el módulo: ${m}`);
          await createPermiso({
            NombrePermisos: `Gestionar ${m}`,
            Descripcion: `Permiso general para el módulo de ${m}`,
            EstadoPermisos: "Activo",
            IsActive: 1
          });
          added = true;
        } catch (e) {
          console.error(`Error auto-creando permiso para ${m}:`, e);
        }
      }
    }
    
    if (added) {
      // Recargar datos para obtener los IDs de los permisos recién creados
      await this.loadData();
    }
  }

  // Carga de datos desde la API
  async loadData() {
    try {
      console.log('<i class="fa-solid fa-rotate-right"></i> Cargando Roles, Permisos y Relaciones de la BD...');
      
      const [rolesRes, permisosRes, rpRes, usersRes] = await Promise.all([
        getRoles().catch(err => { console.error("Error getRoles:", err); return []; }),
        getPermisos().catch(err => { console.error("Error getPermisos:", err); return []; }),
        getRolesPermisos().catch(err => { console.error("Error getRolesPermisos:", err); return []; }),
        getUsuarios().catch(err => { console.error("Error getUsuarios:", err); return []; })
      ]);

      this.roles = rolesRes.data || rolesRes || [];
      this.permisos = permisosRes.data || permisosRes || [];
      this.originalAsignaciones = rpRes.data || rpRes || [];
      this.usuarios = usersRes || [];

      // Estructurar relaciones en formato: { [IDRol]: [IDPermiso, IDPermiso, ...] }
      this.asignaciones = {};
      this.originalAsignaciones.forEach(rel => {
        const rolId = rel.IDRol || rel.rol_id;
        const permId = rel.IDPermiso || rel.permiso_id;
        if (rolId && permId) {
          if (!this.asignaciones[rolId]) {
            this.asignaciones[rolId] = [];
          }
          this.asignaciones[rolId].push(permId);
        }
      });

      console.log('📊 Datos cargados:', {
        roles: this.roles.length,
        permisos: this.permisos.length,
        relaciones: this.originalAsignaciones.length,
        usuarios: this.usuarios.length
      });

    } catch (error) {
      console.error('Error general de la API:', error);
      this.showError("Error", "No se pudieron cargar los roles y permisos del servidor.");
      return;
    }
  }

  // Renderizar la vista principal
  render() {
    const rolesBadge = this.container.querySelector("#rolesCountBadge");
    if (rolesBadge) rolesBadge.textContent = this.roles.length;

    this.renderRolesList();

    // Si hay un rol seleccionado, volver a cargarlo en el panel derecho. Si no, dejar vacío.
    if (this.currentRoleId) {
      this.selectRole(this.currentRoleId);
    }
    window.rolesPermisosModule = this;
  }

  // Renderizar la lista de roles (Columna Izquierda)
  renderRolesList() {
    const container = this.container.querySelector("#rolesCardsContainer");
    if (!container) return;

    if (!this.roles.length) {
      container.innerHTML = '<div class="text-xs text-center text-muted italic p-6">No hay roles registrados</div>';
      return;
    }

    container.innerHTML = this.roles.map(rol => {
      const id = rol.IDRol;
      const nombre = rol.Nombre || 'Sin Nombre';
      const desc = rol.Descripcion || 'Sin descripción del rol';
      const status = rol.Estado !== undefined ? String(rol.Estado) : '1';
      
      // Contar permisos y usuarios
      const permCount = this.asignaciones[id] ? this.asignaciones[id].length : 0;
      const userCount = this.usuarios.filter(u => Number(u.IDRol) === Number(id)).length;
      
      const isSelected = this.currentRoleId === id;
      const selectClass = isSelected 
        ? 'border-brand bg-brand/[0.03] shadow-md ring-1 ring-brand/20 scale-[1.01]' 
        : 'border-gray-100 hover:border-brand/30 bg-white hover:bg-gray-50/50 shadow-sm hover:shadow-md';

      return `
        <div onclick="window.rolesPermisosModule.selectRole(${id})" 
             class="p-4 rounded-2xl border transition-all duration-300 cursor-pointer group flex flex-col gap-4 relative ${selectClass}">
          
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-light/20 to-brand/10 text-brand flex flex-shrink-0 items-center justify-center text-xl shadow-inner border border-brand/10">
              <i class="fa-solid fa-user-shield"></i>
            </div>
            <div class="flex-grow min-w-0">
              <div class="flex items-center justify-between gap-2 mb-1">
                <h3 class="m-0 text-base font-extrabold text-brand-deep truncate">${nombre}</h3>
                <span class="px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${status === '1' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                  ${status === '1' ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <p class="m-0 text-[11px] text-muted leading-relaxed line-clamp-2">${desc}</p>
            </div>
          </div>

          <!-- Divider -->
          <div class="h-px w-full bg-gradient-to-r from-transparent via-gray-100 to-transparent"></div>

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg text-[10px] font-bold text-gray-600 border border-gray-100 shadow-sm">
                <i class="fa-solid fa-key text-brand/80"></i> <span>${permCount}</span> <span class="hidden sm:inline">Permisos</span>
              </div>
              <div class="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg text-[10px] font-bold text-gray-600 border border-gray-100 shadow-sm">
                <i class="fa-solid fa-users text-blue-500/80"></i> <span>${userCount}</span> <span class="hidden sm:inline">Usuarios</span>
              </div>
            </div>
            
            <div class="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-300" onclick="event.stopPropagation()">
              <button onclick="window.rolesPermisosModule.showEditRoleModal(${id})" 
                      class="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-brand hover:text-white text-brand-deep transition-colors shadow-sm" title="Editar">
                <i class="fa-solid fa-pen text-[11px]"></i>
              </button>
              <button onclick="window.rolesPermisosModule.deleteRole(${id})" 
                      class="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-red-500 hover:text-white text-red-600 transition-colors shadow-sm" title="Eliminar">
                <i class="fa-solid fa-trash text-[11px]"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Acción al seleccionar un rol de la columna izquierda
  selectRole(id) {
    this.currentRoleId = id;
    this.tempSelectedPermisos = new Set(this.asignaciones[id] || []);

    // Calcular módulos habilitados basado en los permisos
    this.enabledModules = new Set();
    const modulosFijos = ['Dashboard', 'Clientes', 'Reservas', 'Habitaciones', 'Servicios', 'Paquetes', 'Usuarios', 'Roles & Permisos'];
    const grupos = {};
    modulosFijos.forEach(m => grupos[m] = []);
    this.permisos.forEach(perm => {
      const mod = this.getModuloPermiso(perm.NombrePermisos || perm.nombre);
      if (grupos[mod]) grupos[mod].push(perm);
    });
    
    modulosFijos.forEach(m => {
      const perms = grupos[m];
      if (perms.length > 0 && perms.every(p => this.tempSelectedPermisos.has(p.IDPermiso || p.id))) {
        this.enabledModules.add(m);
      }
    });

    // Re-render de roles para marcar el seleccionado
    this.renderRolesList();

    // Actualizar indicadores del panel
    const rol = this.roles.find(r => r.IDRol === id);
    const indicator = this.container.querySelector("#selectedRoleIndicator");
    if (indicator && rol) {
      indicator.innerHTML = `Gestionando privilegios para: <span class="text-brand-deep font-bold border-b-2 border-brand">${rol.Nombre}</span>`;
    }

    // Mostrar controles y footer
    const controls = this.container.querySelector("#panelHeaderControls");
    const footer = this.container.querySelector("#panelFooterActions");
    if (controls) controls.classList.remove("hidden");
    if (footer) footer.classList.remove("hidden");

    this.renderPermissionsPanel();
  }

  // Agrupador inteligente de permisos por módulo del sistema
  getModuloPermiso(nombre) {
    const n = nombre.toLowerCase();
    if (n.includes('cliente') || n.includes('perfil')) return 'Clientes';
    if (n.includes('reserva')) return 'Reservas';
    if (n.includes('habitacion') || n.includes('habitación')) return 'Habitaciones';
    if (n.includes('servicio')) return 'Servicios';
    if (n.includes('paquete')) return 'Paquetes';
    if (n.includes('usuario')) return 'Usuarios';
    if (n.includes('rol') || n.includes('permiso')) return 'Roles & Permisos';
    return 'Dashboard';
  }

  // Renderizar panel derecho de permisos agrupados
  renderPermissionsPanel() {
    const container = this.container.querySelector("#permissionsPanelBody");
    if (!container) return;

    if (!this.permisos.length) {
      container.innerHTML = '<div class="text-xs text-center text-muted italic p-6">No hay permisos registrados en el sistema</div>';
      return;
    }

    const modulosFijos = [
      { id: 'Dashboard', icon: 'fa-solid fa-chart-line' },
      { id: 'Clientes', icon: 'fa-solid fa-users' },
      { id: 'Reservas', icon: 'fa-regular fa-calendar-check' },
      { id: 'Habitaciones', icon: 'fa-solid fa-bed' },
      { id: 'Servicios', icon: 'fa-solid fa-bell-concierge' },
      { id: 'Paquetes', icon: 'fa-solid fa-box-open' },
      { id: 'Usuarios', icon: 'fa-solid fa-user-shield' },
      { id: 'Roles & Permisos', icon: 'fa-solid fa-lock' }
    ];

    const grupos = {};
    modulosFijos.forEach(m => grupos[m.id] = []);

    this.permisos.forEach(perm => {
      const mod = this.getModuloPermiso(perm.NombrePermisos || perm.nombre);
      if (grupos[mod]) {
        grupos[mod].push(perm);
      }
    });

    let panelHTML = '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">';

    modulosFijos.forEach(modulo => {
      const moduloName = modulo.id;
      const permList = grupos[moduloName];
      
      const todosMarcadosInModulo = this.enabledModules.has(moduloName);

      const activeBg = todosMarcadosInModulo ? 'bg-brand/[0.05] border-brand/30 ring-1 ring-brand/10' : 'bg-white border-gray-100 hover:border-brand/30 hover:bg-gray-50 shadow-sm';

      panelHTML += `
        <div class="flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${activeBg}">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-lg bg-white flex flex-shrink-0 items-center justify-center text-brand-deep border border-gray-100 shadow-sm">
              <i class="${modulo.icon} text-[15px]"></i>
            </div>
            <div class="flex flex-col justify-center min-w-0 pr-2">
              <h3 class="m-0 text-[13px] font-extrabold text-brand-deep leading-tight truncate">${moduloName}</h3>
              <p class="m-0 text-[10px] text-muted mt-0.5 leading-tight truncate">Acceso al módulo</p>
            </div>
          </div>
          <div class="flex-shrink-0">
            <label class="relative inline-flex items-center cursor-pointer mb-0">
              <input type="checkbox" class="sr-only peer" 
                     ${todosMarcadosInModulo ? 'checked' : ''} 
                     onchange="window.rolesPermisosModule.toggleModulePermissions('${moduloName}', this.checked)">
              <div class="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[110%] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand shadow-inner"></div>
            </label>
          </div>
        </div>
      `;
    });

    panelHTML += '</div>';
    container.innerHTML = panelHTML;
  }

  // Activar/desactivar un permiso específico
  togglePermission(permId, isChecked) {
    if (isChecked) {
      this.tempSelectedPermisos.add(permId);
    } else {
      this.tempSelectedPermisos.delete(permId);
    }
    this.renderPermissionsPanel();
  }

  // Activar/desactivar todos los permisos de un módulo modular
  toggleModulePermissions(moduloName, isChecked) {
    if (isChecked) {
      this.enabledModules.add(moduloName);
    } else {
      this.enabledModules.delete(moduloName);
    }

    this.permisos.forEach(perm => {
      const pId = perm.IDPermiso || perm.id;
      const mod = this.getModuloPermiso(perm.NombrePermisos || perm.nombre);
      if (mod === moduloName) {
        if (isChecked) {
          this.tempSelectedPermisos.add(pId);
        } else {
          this.tempSelectedPermisos.delete(pId);
        }
      }
    });
    this.renderPermissionsPanel();
  }

  // Activar/desactivar todos los permisos del panel (global)
  selectAllPermissions(isChecked) {
    if (isChecked) {
      this.permisos.forEach(p => this.tempSelectedPermisos.add(p.IDPermiso || p.id));
      ['Dashboard', 'Clientes', 'Reservas', 'Habitaciones', 'Servicios', 'Paquetes', 'Usuarios', 'Roles & Permisos'].forEach(m => this.enabledModules.add(m));
    } else {
      this.tempSelectedPermisos.clear();
      this.enabledModules.clear();
    }
    this.renderPermissionsPanel();
  }

  // Restablecer la selección a los datos de la base de datos
  resetCurrentSelection() {
    if (!this.currentRoleId) return;
    this.selectRole(this.currentRoleId);
    this.showSuccess('Selección de permisos restablecida.');
  }

  // Guardar asignaciones de permisos en la base de datos (Real API Sync)
  async saveCurrentAssignments() {
    if (!this.currentRoleId) return;

    try {
      console.log(`<i class="fa-solid fa-floppy-disk"></i> Guardando permisos para rol #${this.currentRoleId}...`);
      
      // Obtener asignaciones guardadas en BD para este rol
      const guardados = this.originalAsignaciones.filter(rel => 
        Number(rel.IDRol || rel.rol_id) === Number(this.currentRoleId)
      );

      const guardadosPermIds = guardados.map(g => g.IDPermiso || g.permiso_id);

      // 1. Determinar cuáles se deben eliminar: están en BD pero no en tempSelectedPermisos
      const aEliminar = guardados.filter(g => 
        !this.tempSelectedPermisos.has(g.IDPermiso || g.permiso_id)
      );

      // 2. Determinar cuáles se deben crear: están en tempSelectedPermisos pero no en BD
      const aCrear = Array.from(this.tempSelectedPermisos).filter(id => 
        !guardadosPermIds.includes(id)
      );

      console.log('Diff de sincronización:', {
        totalSeleccionados: this.tempSelectedPermisos.size,
        aEliminar: aEliminar.length,
        aCrear: aCrear.length
      });

      // Si no hay cambios, avisar
      if (aEliminar.length === 0 && aCrear.length === 0) {
        Swal.fire('', 'No se detectaron cambios en los accesos del rol.', 'info');
        return;
      }

      // Procesar eliminaciones
      await Promise.all(aEliminar.map(rel => {
        const idRolPermiso = rel.IDRolPermiso || rel.id;
        console.log(`<i class="fa-solid fa-trash"></i> Eliminando relación RolPermiso #${idRolPermiso}`);
        return deleteRolPermiso(idRolPermiso);
      }));

      // Procesar inserciones
      await Promise.all(aCrear.map(permId => {
        console.log(`<i class="fa-solid fa-plus"></i> Añadiendo permiso #${permId} al rol #${this.currentRoleId}`);
        return createRolPermiso({ 
          IDRol: this.currentRoleId, 
          IDPermiso: permId 
        });
      }));

      this.showSuccess('Cambios guardados con éxito en la base de datos.');
      
      // Recargar datos y renderizar
      await this.loadData();
      this.render();

    } catch (error) {
      console.error('Error guardando asignaciones en API:', error);
      Swal.fire('Error', 'Error al guardar asignaciones en el servidor: ' + (error.message || 'Error desconocido'), 'error');
    }
  }

  // Modal para agregar nuevo rol
  showNewRoleModal() {
    const modalHTML = `
      <div id="roleModalOverlay" class="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
          <div class="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <h3 class="text-base font-extrabold text-brand-deep m-0"><i class="fa-solid fa-plus"></i> Crear Nuevo Perfil de Rol</h3>
            <button onclick="document.getElementById('roleModalOverlay').remove()" class="bg-transparent border-none text-muted hover:text-brand-deep text-lg cursor-pointer">✕</button>
          </div>
          <form id="newRoleForm" class="flex flex-col gap-4 m-0 p-0">
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-bold text-brand-deep uppercase tracking-wider">Nombre del Rol *</label>
              <input type="text" id="roleName" maxlength="50" oninput="this.value = this.value.replace(/[0-9]/g, '')" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" placeholder="Ej: Recepcionista">
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-bold text-brand-deep uppercase tracking-wider">Descripción del Rol *</label>
              <textarea id="roleDesc" rows="3" maxlength="150" class="w-full min-h-[100px] p-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all resize-y" placeholder="Breve resumen de atribuciones..."></textarea>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-bold text-brand-deep uppercase tracking-wider">Estado Inicial</label>
              <select id="roleStatus" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all cursor-pointer">
                <option value="1"><i class="fa-solid fa-circle text-emerald-500 mr-1"></i> Activo</option>
                <option value="0"><i class="fa-solid fa-circle text-red-500 mr-1"></i> Inactivo</option>
              </select>
            </div>
            <div class="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
              <button type="button" onclick="document.getElementById('roleModalOverlay').remove()" class="px-4 py-2 border border-gray-200 bg-white rounded-lg font-bold text-[11px] text-muted hover:bg-gray-50 cursor-pointer">Cancelar</button>
              <button type="submit" class="px-5 py-2 bg-brand text-white border-none rounded-lg font-extrabold text-[11px] hover:bg-brand-deep shadow-md shadow-brand/10 cursor-pointer">Crear Rol</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const overlay = document.createElement('div');
    overlay.innerHTML = modalHTML;
    document.body.appendChild(overlay.firstElementChild);

    const form = document.getElementById("newRoleForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const nombre = document.getElementById("roleName").value.trim();
      const desc = document.getElementById("roleDesc").value.trim();
      
      if (!nombre) {
        showAlert('Error', 'Debes ingresar un nombre para el rol.', 'error');
        return;
      }
      if (!desc) {
        showAlert('Error', 'Debes ingresar una descripción para el rol.', 'error');
        return;
      }

      const payload = {
        Nombre: nombre,
        Descripcion: desc,
        Estado: document.getElementById("roleStatus").value
      };

      try {
        console.log('Enviando creación de rol:', payload);
        await createRol(payload);
        this.showSuccess('Rol creado exitosamente.');
        document.getElementById('roleModalOverlay').remove();
        await this.loadData();
        this.render();
      } catch (err) {
        console.error('Error creando rol:', err);
        Swal.fire('Error', 'Error al crear el rol: ' + (err.message || 'Error en servidor'), 'error');
      }
    });
  }

  // Modal para agregar nuevo permiso
  showNewPermissionModal() {
    const modalHTML = `
      <div id="permModalOverlay" class="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
          <div class="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <h3 class="text-base font-extrabold text-brand-deep m-0"><i class="fa-solid fa-key"></i> Crear Nuevo Permiso</h3>
            <button onclick="document.getElementById('permModalOverlay').remove()" class="bg-transparent border-none text-muted hover:text-brand-deep text-lg cursor-pointer">✕</button>
          </div>
          <form id="newPermForm" class="flex flex-col gap-4 m-0 p-0">
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-bold text-brand-deep uppercase tracking-wider">Nombre del Permiso *</label>
              <input type="text" id="permName" maxlength="50" oninput="this.value = this.value.replace(/[0-9]/g, '')" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" placeholder="Ej: Consultar facturas" required>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-bold text-brand-deep uppercase tracking-wider">Descripción del Permiso *</label>
              <textarea id="permDesc" rows="3" maxlength="150" class="w-full min-h-[100px] p-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all resize-y" placeholder="Explique qué privilegios otorga..." required></textarea>
            </div>
            <div class="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
              <button type="button" onclick="document.getElementById('permModalOverlay').remove()" class="px-4 py-2 border border-gray-200 bg-white rounded-lg font-bold text-[11px] text-muted hover:bg-gray-50 cursor-pointer">Cancelar</button>
              <button type="submit" class="px-5 py-2 bg-brand text-white border-none rounded-lg font-extrabold text-[11px] hover:bg-brand-deep shadow-md shadow-brand/10 cursor-pointer">Crear Permiso</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const overlay = document.createElement('div');
    overlay.innerHTML = modalHTML;
    document.body.appendChild(overlay.firstElementChild);

    const form = document.getElementById("newPermForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const payload = {
        NombrePermisos: document.getElementById("permName").value,
        Descripcion: document.getElementById("permDesc").value,
        EstadoPermisos: "Activo",
        IsActive: 1
      };

      try {
        console.log('Enviando creación de permiso:', payload);
        await createPermiso(payload);
        this.showSuccess('Permiso del sistema creado con éxito.');
        document.getElementById('permModalOverlay').remove();
        await this.loadData();
        this.render();
      } catch (err) {
        console.error('Error creando permiso:', err);
        Swal.fire('Error', 'Error al crear el permiso: ' + (err.message || 'Error en servidor'), 'error');
      }
    });
  }

  // Modal para editar rol existente
  showEditRoleModal(id) {
    const rol = this.roles.find(r => r.IDRol === id);
    if (!rol) return;

    if (String(rol.Nombre).toLowerCase() === 'administrador' || String(rol.Nombre).toLowerCase() === 'admin') {
      showAlert('Advertencia', 'El rol de Administrador principal no puede ser editado.', 'warning');
      return;
    }

    const modalHTML = `
      <div id="editRoleModalOverlay" class="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
          <div class="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <h3 class="text-base font-extrabold text-brand-deep m-0"><i class="fa-solid fa-pen"></i> Editar Perfil de Rol: ${rol.Nombre}</h3>
            <button onclick="document.getElementById('editRoleModalOverlay').remove()" class="bg-transparent border-none text-muted hover:text-brand-deep text-lg cursor-pointer">✕</button>
          </div>
          <form id="editRoleForm" class="flex flex-col gap-4 m-0 p-0">
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-bold text-brand-deep uppercase tracking-wider">Nombre del Rol *</label>
              <input type="text" id="editRoleName" maxlength="50" oninput="this.value = this.value.replace(/[0-9]/g, '')" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all" value="${rol.Nombre}">
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-bold text-brand-deep uppercase tracking-wider">Descripción del Rol *</label>
              <textarea id="editRoleDesc" rows="3" maxlength="150" class="w-full min-h-[100px] p-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all resize-y">${rol.Descripcion || ''}</textarea>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-bold text-brand-deep uppercase tracking-wider">Estado</label>
              <select id="editRoleStatus" class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all cursor-pointer">
                <option value="1" ${String(rol.Estado) === '1' || rol.Estado === 'activo' ? 'selected' : ''}><i class="fa-solid fa-circle text-emerald-500 mr-1"></i> Activo</option>
                <option value="0" ${String(rol.Estado) === '0' || rol.Estado === 'inactivo' ? 'selected' : ''}><i class="fa-solid fa-circle text-red-500 mr-1"></i> Inactivo</option>
              </select>
            </div>
            <div class="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
              <button type="button" onclick="document.getElementById('editRoleModalOverlay').remove()" class="px-4 py-2 border border-gray-200 bg-white rounded-lg font-bold text-[11px] text-muted hover:bg-gray-50 cursor-pointer">Cancelar</button>
              <button type="submit" class="px-5 py-2 bg-brand text-white border-none rounded-lg font-extrabold text-[11px] hover:bg-brand-deep shadow-md shadow-brand/10 cursor-pointer">Guardar Cambios</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const overlay = document.createElement('div');
    overlay.innerHTML = modalHTML;
    document.body.appendChild(overlay.firstElementChild);

    const form = document.getElementById("editRoleForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const nombre = document.getElementById("editRoleName").value.trim();
      const desc = document.getElementById("editRoleDesc").value.trim();

      if (!nombre) {
        showAlert('Error', 'Debes ingresar un nombre para el rol.', 'error');
        return;
      }
      if (!desc) {
        showAlert('Error', 'Debes ingresar una descripción para el rol.', 'error');
        return;
      }

      const payload = {
        Nombre: nombre,
        Descripcion: desc,
        Estado: document.getElementById("editRoleStatus").value
      };

      try {
        console.log(`Enviando edición para rol #${id}:`, payload);
        await updateRol(id, payload);
        this.showSuccess('Rol actualizado correctamente.');
        document.getElementById('editRoleModalOverlay').remove();
        await this.loadData();
        this.render();
      } catch (err) {
        console.error('Error editando rol:', err);
        Swal.fire('Error', 'Error al guardar cambios del rol: ' + (err.message || 'Error en servidor'), 'error');
      }
    });
  }

  // Eliminar un rol de la base de datos
  async deleteRole(id) {
    const rol = this.roles.find(r => r.IDRol === id);
    if (!rol) return;

    if (String(rol.Nombre).toLowerCase() === 'administrador' || String(rol.Nombre).toLowerCase() === 'admin') {
      showAlert('Advertencia', 'El rol de Administrador principal no puede ser eliminado.', 'warning');
      return;
    }

    const confirmRes = await Swal.fire({
      title: '¿Eliminar Rol?',
      text: `¿Está seguro de eliminar el rol "${rol.Nombre}"? Todos los usuarios vinculados perderán su asignación y las relaciones de permisos se borrarán. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!confirmRes.isConfirmed) {
      return;
    }

    try {
      console.log(`<i class="fa-solid fa-trash"></i> Eliminando rol #${id}...`);
      await deleteRol(id);
      this.showSuccess('Rol eliminado con éxito.');
      
      // Deseleccionar si el rol eliminado era el seleccionado
      if (this.currentRoleId === id) {
        this.currentRoleId = null;
        
        // Ocultar controles del panel derecho
        const controls = this.container.querySelector("#panelHeaderControls");
        const footer = this.container.querySelector("#panelFooterActions");
        if (controls) controls.classList.add("hidden");
        if (footer) footer.classList.add("hidden");
        
        const indicator = this.container.querySelector("#selectedRoleIndicator");
        if (indicator) indicator.textContent = 'Seleccione un rol de la lista para gestionar sus accesos.';
        
        const panelBody = this.container.querySelector("#permissionsPanelBody");
        if (panelBody) {
          panelBody.innerHTML = `
            <div class="flex flex-col items-center justify-center p-12 text-center text-muted">
              <span class="text-4xl mb-2"><i class="fa-solid fa-hand-point-left"></i></span>
              <p class="m-0 font-bold text-brand-deep text-sm">Selecciona un Rol</p>
              <p class="m-0 text-xs mt-1 text-muted max-w-[240px]">Para editar, otorgar o denegar accesos en tiempo real, elige uno de los roles del panel izquierdo.</p>
            </div>
          `;
        }
      }

      await this.loadData();
      this.render();
    } catch (err) {
      console.error('Error al eliminar rol:', err);
      showAlert('Error', 'Error al eliminar el rol: ' + (err.message || 'Error del servidor. Asegúrese de que no tenga llaves foráneas activas.'), 'error');
    }
  }

  // Notificación de éxito flotante y elegante
  showSuccess(message) {
    showAlert('Información', message, 'info');
  }

  // Notificación de error en la UI
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

// Función exportada de carga para el SPA
export function renderRolesPermisos(container) {
  console.log('🎯 renderRolesPermisos llamado con container:', container);
  window.rolesPermisosModule = new RolesPermisosModule(container);
  window.rolesPermisosModule.initialize();
}
