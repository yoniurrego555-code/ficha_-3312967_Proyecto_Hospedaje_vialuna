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
  }

  // Inicialización del módulo
  async initialize() {
    console.log('🔄 Inicializando RolesPermisosModule...');
    try {
      await this.loadData();
      this.render();
      console.log('✅ Vista de Roles y Permisos lista');
    } catch (error) {
      console.error('❌ Error al inicializar RolesPermisosModule:', error);
      this.showError('Error al cargar datos', error.message || 'Verifique la conexión con el servidor.');
    }
  }

  // Carga de datos desde la API
  async loadData() {
    try {
      console.log('🔄 Cargando Roles, Permisos y Relaciones de la BD...');
      
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
      console.error('Error general de la API, cargando ejemplos:', error);
      this.roles = this.getRolesEjemplo();
      this.permisos = this.getPermisosEjemplo();
      this.originalAsignaciones = [];
      this.asignaciones = { 1: [1, 2, 3, 4, 5, 6], 2: [5, 6, 7] };
      this.usuarios = [];
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
        ? 'border-brand bg-brand/5 shadow-sm ring-1 ring-brand/30' 
        : 'border-gray-100 hover:border-brand/40 bg-white hover:bg-gray-50/50';

      return `
        <div onclick="window.rolesPermisosModule.selectRole(${id})" 
             class="p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer flex flex-col gap-3 relative ${selectClass}">
          
          <div class="flex items-start justify-between">
            <div>
              <h3 class="m-0 text-sm font-extrabold text-brand-deep">${nombre}</h3>
              <p class="m-0 text-xs text-muted mt-1 max-w-[220px] leading-relaxed truncate">${desc}</p>
            </div>
            
            <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${status === '1' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
              ${status === '1' ? 'Activo' : 'Inactivo'}
            </span>
          </div>

          <!-- Badges de información -->
          <div class="flex items-center gap-2 mt-1">
            <span class="px-2 py-1 bg-brand-light/10 text-brand-deep text-[10px] rounded-lg font-semibold flex items-center gap-1">
              🔑 ${permCount} Permisos
            </span>
            <span class="px-2 py-1 bg-gray-100 text-gray-700 text-[10px] rounded-lg font-semibold flex items-center gap-1">
              👥 ${userCount} Usuarios
            </span>
          </div>

          <!-- Acciones de edición rápida -->
          <div class="flex justify-end gap-1.5 border-t border-gray-100 pt-2.5 mt-1" onclick="event.stopPropagation()">
            <button onclick="window.rolesPermisosModule.showEditRoleModal(${id})" 
                    class="p-1 px-2 text-[10px] bg-gray-50 hover:bg-gray-100 text-brand-deep border border-gray-200 rounded-md font-semibold transition" title="Editar">
              ✏️ Editar
            </button>
            <button onclick="window.rolesPermisosModule.deleteRole(${id})" 
                    class="p-1 px-2 text-[10px] bg-red-50 hover:bg-red-100 text-red-700 border border-red-100 rounded-md font-semibold transition" title="Eliminar">
              🗑️ Eliminar
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Acción al seleccionar un rol de la columna izquierda
  selectRole(id) {
    this.currentRoleId = id;
    this.tempSelectedPermisos = new Set(this.asignaciones[id] || []);

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
    if (n.includes('dashboard') || n.includes('sistema') || n.includes('consultar')) return '💻 DASHBOARD Y SISTEMA';
    if (n.includes('usuario')) return '👥 USUARIOS Y CUENTAS';
    if (n.includes('rol') || n.includes('permiso')) return '🔐 ROLES Y ACCESOS';
    if (n.includes('reserva')) return '📅 RESERVAS Y PLANES';
    if (n.includes('habitacion') || n.includes('habitación')) return '🏨 HABITACIONES';
    if (n.includes('servicio')) return '🍽️ SERVICIOS';
    if (n.includes('paquete')) return '📦 PAQUETES';
    if (n.includes('cliente') || n.includes('perfil')) return '👤 CLIENTES';
    return '⚙️ MÓDULO GENERAL';
  }

  // Renderizar panel derecho de permisos agrupados
  renderPermissionsPanel() {
    const container = this.container.querySelector("#permissionsPanelBody");
    if (!container) return;

    if (!this.permisos.length) {
      container.innerHTML = '<div class="text-xs text-center text-muted italic p-6">No hay permisos registrados en el sistema</div>';
      return;
    }

    // Agrupar los permisos por módulo
    const grupos = {};
    this.permisos.forEach(perm => {
      const mod = this.getModuloPermiso(perm.NombrePermisos || perm.nombre);
      if (!grupos[mod]) {
        grupos[mod] = [];
      }
      grupos[mod].push(perm);
    });

    let panelHTML = '';

    // Renderizar cada bloque/bloque modular
    Object.entries(grupos).forEach(([moduloName, permList]) => {
      // Verificar si todos los permisos de este módulo están marcados
      const todosMarcadosInModulo = permList.every(p => this.tempSelectedPermisos.has(p.IDPermiso || p.id));

      panelHTML += `
        <div class="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          <!-- Encabezado del Módulo -->
          <div class="bg-gray-50/75 p-3 px-4 flex items-center justify-between border-b border-gray-100">
            <span class="text-xs font-extrabold text-brand-deep">${moduloName}</span>
            <label class="flex items-center gap-1.5 text-[10px] font-bold text-muted cursor-pointer">
              <input type="checkbox" class="rounded border-gray-300 text-brand focus:ring-brand" 
                     ${todosMarcadosInModulo ? 'checked' : ''} 
                     onchange="window.rolesPermisosModule.toggleModulePermissions('${moduloName}', this.checked)">
              Marcar todo
            </label>
          </div>

          <!-- Listado de Permisos Individuales -->
          <div class="p-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-3">
            ${permList.map(perm => {
              const pId = perm.IDPermiso || perm.id;
              const pName = perm.NombrePermisos || perm.nombre;
              const pDesc = perm.Descripcion || 'Sin descripción disponible';
              const isChecked = this.tempSelectedPermisos.has(pId);

              return `
                <label class="flex items-start gap-3 p-2.5 rounded-lg border border-gray-50 hover:border-brand-light/30 hover:bg-brand-light/[0.02] cursor-pointer transition">
                  <input type="checkbox" value="${pId}" class="mt-0.5 rounded border-gray-300 text-brand focus:ring-brand cursor-pointer" 
                         ${isChecked ? 'checked' : ''} 
                         onchange="window.rolesPermisosModule.togglePermission(${pId}, this.checked)">
                  <div class="flex flex-col gap-0.5 min-w-0">
                    <span class="text-xs font-bold text-brand-deep truncate">${pName}</span>
                    <span class="text-[10px] text-muted leading-relaxed truncate md:max-w-[200px]" title="${pDesc}">${pDesc}</span>
                  </div>
                </label>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });

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
    } else {
      this.tempSelectedPermisos.clear();
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
      console.log(`💾 Guardando permisos para rol #${this.currentRoleId}...`);
      
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
        alert('No se detectaron cambios en los accesos del rol.');
        return;
      }

      // Procesar eliminaciones
      await Promise.all(aEliminar.map(rel => {
        const idRolPermiso = rel.IDRolPermiso || rel.id;
        console.log(`🗑️ Eliminando relación RolPermiso #${idRolPermiso}`);
        return deleteRolPermiso(idRolPermiso);
      }));

      // Procesar inserciones
      await Promise.all(aCrear.map(permId => {
        console.log(`➕ Añadiendo permiso #${permId} al rol #${this.currentRoleId}`);
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
      alert('Error al guardar asignaciones en el servidor: ' + (error.message || 'Error desconocido'));
    }
  }

  // Modal para agregar nuevo rol
  showNewRoleModal() {
    const modalHTML = `
      <div id="roleModalOverlay" class="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
          <div class="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <h3 class="text-base font-extrabold text-brand-deep m-0">➕ Crear Nuevo Perfil de Rol</h3>
            <button onclick="document.getElementById('roleModalOverlay').remove()" class="bg-transparent border-none text-muted hover:text-brand-deep text-lg cursor-pointer">✕</button>
          </div>
          <form id="newRoleForm" class="flex flex-col gap-4 m-0 p-0">
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-bold text-brand-deep uppercase tracking-wider">Nombre del Rol *</label>
              <input type="text" id="roleName" class="h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand/20 text-xs font-semibold" placeholder="Ej: Recepcionista" required>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-bold text-brand-deep uppercase tracking-wider">Descripción del Rol *</label>
              <textarea id="roleDesc" rows="3" class="p-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand/20 text-xs font-semibold resize-none" placeholder="Breve resumen de atribuciones..." required></textarea>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-bold text-brand-deep uppercase tracking-wider">Estado Inicial</label>
              <select id="roleStatus" class="h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none text-xs font-semibold cursor-pointer">
                <option value="1">🟢 Activo</option>
                <option value="0">🔴 Inactivo</option>
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
      
      const payload = {
        Nombre: document.getElementById("roleName").value,
        Descripcion: document.getElementById("roleDesc").value,
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
        alert('Error al crear el rol: ' + (err.message || 'Error en servidor'));
      }
    });
  }

  // Modal para agregar nuevo permiso
  showNewPermissionModal() {
    const modalHTML = `
      <div id="permModalOverlay" class="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
          <div class="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <h3 class="text-base font-extrabold text-brand-deep m-0">🔑 Crear Nuevo Permiso</h3>
            <button onclick="document.getElementById('permModalOverlay').remove()" class="bg-transparent border-none text-muted hover:text-brand-deep text-lg cursor-pointer">✕</button>
          </div>
          <form id="newPermForm" class="flex flex-col gap-4 m-0 p-0">
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-bold text-brand-deep uppercase tracking-wider">Nombre del Permiso *</label>
              <input type="text" id="permName" class="h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand/20 text-xs font-semibold" placeholder="Ej: Consultar facturas" required>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-bold text-brand-deep uppercase tracking-wider">Descripción del Permiso *</label>
              <textarea id="permDesc" rows="3" class="p-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand/20 text-xs font-semibold resize-none" placeholder="Explique qué privilegios otorga..." required></textarea>
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
        alert('Error al crear el permiso: ' + (err.message || 'Error en servidor'));
      }
    });
  }

  // Modal para editar rol existente
  showEditRoleModal(id) {
    const rol = this.roles.find(r => r.IDRol === id);
    if (!rol) return;

    const modalHTML = `
      <div id="editRoleModalOverlay" class="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
          <div class="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <h3 class="text-base font-extrabold text-brand-deep m-0">✏️ Editar Perfil de Rol: ${rol.Nombre}</h3>
            <button onclick="document.getElementById('editRoleModalOverlay').remove()" class="bg-transparent border-none text-muted hover:text-brand-deep text-lg cursor-pointer">✕</button>
          </div>
          <form id="editRoleForm" class="flex flex-col gap-4 m-0 p-0">
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-bold text-brand-deep uppercase tracking-wider">Nombre del Rol *</label>
              <input type="text" id="editRoleName" class="h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand/20 text-xs font-semibold" value="${rol.Nombre}" required>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-bold text-brand-deep uppercase tracking-wider">Descripción del Rol *</label>
              <textarea id="editRoleDesc" rows="3" class="p-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand/20 text-xs font-semibold resize-none" required>${rol.Descripcion || ''}</textarea>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-bold text-brand-deep uppercase tracking-wider">Estado</label>
              <select id="editRoleStatus" class="h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none text-xs font-semibold cursor-pointer">
                <option value="1" ${String(rol.Estado) === '1' || rol.Estado === 'activo' ? 'selected' : ''}>🟢 Activo</option>
                <option value="0" ${String(rol.Estado) === '0' || rol.Estado === 'inactivo' ? 'selected' : ''}>🔴 Inactivo</option>
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
      
      const payload = {
        Nombre: document.getElementById("editRoleName").value,
        Descripcion: document.getElementById("editRoleDesc").value,
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
        alert('Error al guardar cambios del rol: ' + (err.message || 'Error en servidor'));
      }
    });
  }

  // Eliminar un rol de la base de datos
  async deleteRole(id) {
    const rol = this.roles.find(r => r.IDRol === id);
    if (!rol) return;

    if (!confirm(`¿Está seguro de eliminar el rol "${rol.Nombre}"? Todos los usuarios vinculados perderán su asignación y las relaciones de permisos se borrarán. Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      console.log(`🗑️ Eliminando rol #${id}...`);
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
              <span class="text-4xl mb-2">👈</span>
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
      alert('Error al eliminar el rol: ' + (err.message || 'Error del servidor. Asegúrese de que no tenga llaves foráneas activas.'));
    }
  }

  // Notificación de éxito flotante y elegante
  showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-5 right-5 bg-brand text-white font-semibold py-3.5 px-6 rounded-2xl shadow-xl flex items-center gap-2 border border-brand-light/20 animate-in slide-in-from-bottom duration-300 z-50 text-xs';
    notification.innerHTML = `<span>✅</span> ${message}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('animate-out', 'fade-out', 'duration-300');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Notificación de error en la UI
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

  // Fallbacks de roles
  getRolesEjemplo() {
    return [
      { IDRol: 1, Nombre: 'Administrador', Descripcion: 'Acceso total al sistema', Estado: 1 },
      { IDRol: 2, Nombre: 'Cliente', Descripcion: 'Acceso limitado a funciones de cliente', Estado: 1 }
    ];
  }

  // Fallbacks de permisos
  getPermisosEjemplo() {
    return [
      { IDPermiso: 1, NombrePermisos: 'Gestionar dashboard', Descripcion: 'Visualizar y administrar el dashboard', IsActive: 1 },
      { IDPermiso: 2, NombrePermisos: 'Gestionar usuarios', Descripcion: 'Crear, editar y eliminar usuarios', IsActive: 1 },
      { IDPermiso: 3, NombrePermisos: 'Gestionar roles', Descripcion: 'Administrar roles del sistema', IsActive: 1 },
      { IDPermiso: 4, NombrePermisos: 'Gestionar permisos', Descripcion: 'Administrar permisos y asignaciones', IsActive: 1 },
      { IDPermiso: 5, NombrePermisos: 'Gestionar reservas', Descripcion: 'Crear, editar y cancelar reservas', IsActive: 1 },
      { IDPermiso: 6, NombrePermisos: 'Consultar habitaciones', Descripcion: 'Visualizar habitaciones disponibles', IsActive: 1 },
      { IDPermiso: 7, NombrePermisos: 'Editar perfil cliente', Descripcion: 'Actualizar datos del cliente', IsActive: 1 }
    ];
  }
}

// Función exportada de carga para el SPA
export function renderRolesPermisos(container) {
  console.log('🎯 renderRolesPermisos llamado con container:', container);
  window.rolesPermisosModule = new RolesPermisosModule(container);
  window.rolesPermisosModule.initialize();
}
