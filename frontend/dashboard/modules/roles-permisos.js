// Roles y Permisos Module
import { 
  getRoles, 
  getPermisos, 
  getRolesPermisos 
} from "../core/api.js";

export class RolesPermisosModule {
  constructor(container) {
    this.container = container;
    this.currentData = {
      roles: [],
      permisos: [],
      asignaciones: []
    };
    this.currentView = 'main'; // main, nuevo-rol, editar-rol, asignar-permisos
    this.currentRoleId = null;
  }

  // Initialize module
  async initialize() {
    try {
      // Cargar datos (simulados por ahora)
      await this.loadData();
      this.render();
      this.setupEventListeners();
    } catch (error) {
      this.showError('Error al cargar datos', error.message);
    }
  }

  // Load data
  async loadData() {
    try {
      console.log('🔄 Iniciando carga de datos desde API...');
      
      // Cargar datos desde la API real
      const [rolesResponse, permisosResponse, asignacionesResponse] = await Promise.all([
        getRoles().catch(err => {
          console.error('❌ Error en getRoles():', err);
          return { data: [] };
        }),
        getPermisos().catch(err => {
          console.error('❌ Error en getPermisos():', err);
          return { data: [] };
        }),
        getRolesPermisos().catch(err => {
          console.error('❌ Error en getRolesPermisos():', err);
          return { data: [] };
        })
      ]);

      console.log('📥 Respuesta API - Roles:', rolesResponse);
      console.log('📥 Respuesta API - Permisos:', permisosResponse);
      console.log('📥 Respuesta API - Asignaciones:', asignacionesResponse);

      // Verificar si hay datos
      console.log('🔍 ESTRUCTURA COMPLETA DE RESPUESTAS:');
      console.log('RolesResponse completo:', JSON.stringify(rolesResponse, null, 2));
      console.log('PermisosResponse completo:', JSON.stringify(permisosResponse, null, 2));
      console.log('AsignacionesResponse completo:', JSON.stringify(asignacionesResponse, null, 2));

      const rolesData = rolesResponse.data || rolesResponse || [];
      const permisosData = permisosResponse.data || permisosResponse || [];
      const asignacionesData = asignacionesResponse.data || asignacionesResponse || [];

      console.log('📊 Cantidad de datos recibidos:');
      console.log('  - Roles:', rolesData.length);
      console.log('  - Permisos:', permisosData.length);
      console.log('  - Asignaciones:', asignacionesData.length);

      // Si no hay datos, mostrar estructura para depuración
      if (rolesData.length === 0 && permisosData.length === 0) {
        console.log('⚠️ No se recibieron datos en .data, intentando con respuesta directa');
        console.log('rolesResponse directamente:', rolesResponse);
        console.log('permisosResponse directamente:', permisosResponse);
      }

      // Procesar roles con mapeo según estructura real de la BD
      const roles = rolesData.map((rol, index) => {
        console.log(`🔍 Procesando rol ${index}:`, rol);
        console.log(`  - IDRol: ${rol.IDRol}`);
        console.log(`  - Nombre: ${rol.Nombre}`);
        console.log(`  - Descripcion: ${rol.Descripcion}`);
        console.log(`  - Estado: ${rol.Estado}`);
        
        const rolProcesado = {
          id: rol.IDRol || rol.id || index + 1,
          nombre: rol.Nombre || rol.nombre || rol.RolNombre || `Rol ${index + 1}`,
          descripcion: rol.Descripcion || rol.descripcion || 'Sin descripción',
          estado: (rol.Estado === 1 || rol.Estado === '1' || rol.estado === 'activo' || rol.Estado === 'activo') ? 'activo' : 'inactivo',
          usuarios_count: rol.usuarios_count || rol.UsuariosCount || 0
        };
        
        console.log(`✅ Rol procesado:`, rolProcesado);
        return rolProcesado;
      });

      // Procesar permisos con mapeo según estructura real de la BD
      const permisos = permisosData.map((permiso, index) => {
        console.log(`🔍 Procesando permiso ${index}:`, permiso);
        console.log(`  - IDPermiso: ${permiso.IDPermiso}`);
        console.log(`  - NombrePermisos: ${permiso.NombrePermisos}`);
        console.log(`  - Descripcion: ${permiso.Descripcion}`);
        console.log(`  - IsActive: ${permiso.IsActive}`);
        console.log(`  - EstadoPermisos: ${permiso.EstadoPermisos}`);
        
        const permisoProcesado = {
          id: permiso.IDPermiso || permiso.id || index + 1,
          nombre: permiso.NombrePermisos || permiso.nombre || permiso.Nombre || `Permiso ${index + 1}`,
          descripcion: permiso.Descripcion || permiso.descripcion || 'Sin descripción',
          modulo: permiso.Modulo || permiso.modulo || 'general',
          estado: (permiso.IsActive === 1 || permiso.EstadoPermisos === 'Activo' || permiso.EstadoPermisos === 'activo' || permiso.estado === 'activo') ? 'activo' : 'inactivo'
        };
        
        console.log(`✅ Permiso procesado:`, permisoProcesado);
        return permisoProcesado;
      });

      // Procesar asignaciones
      const asignaciones = {};
      asignacionesData.forEach((asignacion, index) => {
        console.log(`🔍 Procesando asignación ${index}:`, asignacion);
        const rolId = asignacion.IDRol || asignacion.rol_id || asignacion.IdRol || asignacion.id_rol;
        const permisoId = asignacion.IDPermiso || asignacion.permiso_id || asignacion.IdPermiso || asignacion.id_permiso;
        
        if (rolId && permisoId) {
          if (!asignaciones[rolId]) {
            asignaciones[rolId] = [];
          }
          asignaciones[rolId].push(permisoId);
        }
      });

      this.currentData = {
        roles,
        permisos,
        asignaciones
      };

      console.log('✅ Datos procesados - Roles:', roles);
      console.log('✅ Datos procesados - Permisos:', permisos);
      console.log('✅ Datos procesados - Asignaciones:', asignaciones);

    } catch (error) {
      console.error('❌ Error general cargando datos de roles y permisos:', error);
      
      // Mostrar error detallado
      this.currentData = {
        roles: [],
        permisos: [],
        asignaciones: {}
      };
      
      // Mostrar mensaje de error al usuario con detalles
      if (this.container) {
        this.container.innerHTML = `
          <div style="padding: 40px; text-align: center; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; margin: 20px;">
            <h3 style="color: #721c24; margin-bottom: 15px;">❌ Error de Conexión con la Base de Datos</h3>
            <p style="color: #721c24; margin-bottom: 20px;">No se pudieron cargar los roles y permisos desde la base de datos.</p>
            <p style="color: #6c757d; font-size: 14px; margin-bottom: 10px;">Error: ${error.message}</p>
            <p style="color: #6c757d; font-size: 12px;">Verifique que el servidor esté en ejecución en http://localhost:3000</p>
            <div style="margin: 20px 0;">
              <button onclick="location.reload()" style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 5px;">
                🔄 Reintentar
              </button>
              <button onclick="console.log('Verificando conexión...'); fetch('http://localhost:3000/api/roles').then(r=>r.json()).then(d=>console.log('Datos de roles:', d)).catch(e=>console.error('Error:', e))" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 5px;">
                � Verificar Conexión
              </button>
            </div>
          </div>
        `;
      }
    }
  }

  // Main render
  render() {
    switch(this.currentView) {
      case 'main':
        this.renderMain();
        break;
      case 'nuevo-rol':
        this.renderNuevoRol();
        break;
      case 'editar-rol':
        this.renderEditarRol();
        break;
      case 'asignar-permisos':
        this.renderAsignarPermisos();
        break;
      case 'detalle-rol':
        this.renderDetalleRol();
        break;
      case 'detalle-permiso':
        this.renderDetallePermiso();
        break;
    }
  }

  // Render main view - ultra compacto para visibilidad completa
  renderMain() {
    this.container.innerHTML = `
      <!-- Header Ultra Compacto -->
      <header class="module-header" style="margin-bottom: 8px;">
        <div class="header-left">
          <h1 style="margin: 0; font-size: 1.5rem; color: #1f2937;">Roles y Permisos</h1>
          <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 0.8rem;">Gestión de roles y permisos del sistema</p>
        </div>
      </header>

      <!-- Two Column Layout Ultra Compacto -->
      <div class="roles-permisos-layout" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; max-width: 100%; height: calc(100vh - 120px); overflow: hidden;">
      
      <!-- SECCIÓN IZQUIERDA: ROLES -->
      <div class="roles-section" style="display: flex; flex-direction: column;">
        <div class="section-card" style="background: white; border-radius: 6px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); padding: 12px; border: 1px solid #e5e7eb; flex: 1; display: flex; flex-direction: column;">
          <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #f3f4f6;">
            <div style="min-width: 0; flex: 1;">
              <h2 style="margin: 0; color: #1f2937; font-size: 1.1rem; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                👥 Roles
                <span style="background: #3b82f6; color: white; padding: 1px 6px; border-radius: 10px; font-size: 0.65rem; font-weight: 500;">
                  ${this.currentData.roles?.length || 0}
                </span>
              </h2>
            </div>
            <button class="btn-primary-modern" onclick="window.rolesPermisosModule.showNuevoRol()" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; padding: 6px 10px; border-radius: 4px; font-weight: 500; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; gap: 3px; font-size: 0.8rem; white-space: nowrap;">
              <span style="font-size: 0.8rem;">➕</span>
              Nuevo
            </button>
          </div>
          <div class="table-container" style="overflow-y: auto; flex: 1;">
            <table class="data-table-modern" style="width: 100%; border-collapse: separate; border-spacing: 0;">
              <thead style="position: sticky; top: 0; background: white; z-index: 10;">
                <tr>
                  <th style="padding: 6px 8px; text-align: left; background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 600; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em;">Nombre</th>
                  <th style="padding: 6px 8px; text-align: left; background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 600; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em;">Estado</th>
                  <th style="padding: 6px 8px; text-align: center; background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 600; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em;">Acciones</th>
                </tr>
              </thead>
              <tbody id="rolesTable">
                ${this.renderRolesTable()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- SECCIÓN DERECHA: PERMISOS -->
      <div class="permisos-section" style="display: flex; flex-direction: column;">
        <div class="section-card" style="background: white; border-radius: 6px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); padding: 12px; border: 1px solid #e5e7eb; flex: 1; display: flex; flex-direction: column;">
          <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #f3f4f6;">
            <div style="min-width: 0; flex: 1;">
              <h2 style="margin: 0; color: #1f2937; font-size: 1.1rem; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                🔐 Permisos
                <span style="background: #10b981; color: white; padding: 1px 6px; border-radius: 10px; font-size: 0.65rem; font-weight: 500;">
                  ${this.currentData.permisos?.length || 0}
                </span>
              </h2>
            </div>
            <div style="margin-right: 6px;">
              <button class="btn-primary-modern" onclick="window.rolesPermisosModule.showNuevoPermiso()" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 6px 10px; border-radius: 4px; font-weight: 500; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; gap: 3px; font-size: 0.8rem; white-space: nowrap;">
                <span style="font-size: 0.8rem;">➕</span>
                Nuevo
              </button>
            </div>
          </div>
          <div class="permisos-list" style="overflow-y: auto; flex: 1;">
            ${this.renderPermisosList()}
          </div>
        </div>
      </div>

    </div>
  `;
  }

  // Render roles table - ultra compacto
  renderRolesTable() {
    if (!this.currentData.roles || this.currentData.roles.length === 0) {
      return '<tr><td colspan="3" style="text-align: center; padding: 15px; color: #6b7280; font-style: italic;">No hay roles registrados</td></tr>';
    }
    
    return this.currentData.roles.map(rol => {
      return `
        <tr style="border-bottom: 1px solid #f3f4f6; transition: all 0.2s ease;" onmouseover="this.style.backgroundColor='#f9fafb'" onmouseout="this.style.backgroundColor='white'">
          <td style="padding: 6px 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 24px; height: 24px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.7rem; flex-shrink: 0;">
                ${rol.nombre.charAt(0).toUpperCase()}
              </div>
              <div style="min-width: 0; flex: 1;">
                <div style="font-weight: 600; color: #1f2937; font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${rol.nombre}</div>
                <div style="color: #6b7280; font-size: 0.7rem; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${rol.descripcion}</div>
              </div>
            </div>
          </td>
          <td style="padding: 6px 8px;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <label style="position: relative; display: inline-block; width: 32px; height: 18px; cursor: pointer;">
                <input type="checkbox" 
                       ${rol.estado === 'activo' ? 'checked' : ''} 
                       onchange="window.rolesPermisosModule.toggleEstadoRol(${rol.id}, this.checked)"
                       data-rol-id="${rol.id}"
                       style="opacity: 0; width: 0; height: 0;">
                <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${rol.estado === 'activo' ? '#10b981' : '#d1d5db'}; transition: 0.3s; border-radius: 18px;">
                  <span style="position: absolute; content: ''; height: 14px; width: 14px; left: ${rol.estado === 'activo' ? '18px' : '2px'}; bottom: 2px; background-color: white; transition: 0.3s; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,0.1);"></span>
                </span>
              </label>
              <span style="padding: 1px 4px; border-radius: 6px; font-size: 0.6rem; font-weight: 500; background: ${rol.estado === 'activo' ? '#dcfce7' : '#fee2e2'}; color: ${rol.estado === 'activo' ? '#166534' : '#dc2626'}; white-space: nowrap;">
                ${rol.estado === 'activo' ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </td>
          <td style="padding: 6px 8px;">
            <div style="display: flex; gap: 3px; justify-content: center;">
              <button onclick="window.rolesPermisosModule.editarRol(${rol.id})" title="Editar rol" style="width: 24px; height: 24px; border: none; border-radius: 4px; background: #f3f4f6; color: #6b7280; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;" onmouseover="this.style.background='#e5e7eb'; this.style.color='#374151';" onmouseout="this.style.background='#f3f4f6'; this.style.color='#6b7280';">
                ✏️
              </button>
              <button onclick="window.rolesPermisosModule.verDetalleRol(${rol.id})" title="Ver detalles" style="width: 24px; height: 24px; border: none; border-radius: 4px; background: #f3f4f6; color: #6b7280; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;" onmouseover="this.style.background='#dbeafe'; this.style.color='#2563eb';" onmouseout="this.style.background='#f3f4f6'; this.style.color='#6b7280';">
                👁️
              </button>
              <button onclick="window.rolesPermisosModule.asignarPermisos(${rol.id})" title="Gestionar permisos" style="width: 24px; height: 24px; border: none; border-radius: 4px; background: #f3f4f6; color: #6b7280; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;" onmouseover="this.style.background='#d1fae5'; this.style.color='#059669';" onmouseout="this.style.background='#f3f4f6'; this.style.color='#6b7280';">
                🔐
              </button>
              <button onclick="window.rolesPermisosModule.eliminarRol(${rol.id})" title="Eliminar rol" style="width: 24px; height: 24px; border: none; border-radius: 4px; background: #f3f4f6; color: #6b7280; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;" onmouseover="this.style.background='#fee2e2'; this.style.color='#dc2626';" onmouseout="this.style.background='#f3f4f6'; this.style.color='#6b7280';">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Render permissions list - ultra compacto
  renderPermisosList() {
    if (!this.currentData.permisos || this.currentData.permisos.length === 0) {
      return '<div style="text-align: center; padding: 15px; color: #6b7280; font-style: italic;">No hay permisos registrados</div>';
    }
    
    const permisosHTML = this.currentData.permisos.map(permiso => {
      return `
        <tr style="border-bottom: 1px solid #f3f4f6; transition: all 0.2s ease;" onmouseover="this.style.backgroundColor='#f9fafb'" onmouseout="this.style.backgroundColor='white'">
          <td style="padding: 6px 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 24px; height: 24px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.7rem; flex-shrink: 0;">
                🔐
              </div>
              <div style="min-width: 0; flex: 1;">
                <div style="font-weight: 600; color: #1f2937; font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${permiso.nombre}</div>
                <div style="color: #6b7280; font-size: 0.7rem; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${permiso.descripcion}</div>
              </div>
            </div>
          </td>
          <td style="padding: 6px 8px;">
            <span style="padding: 2px 6px; border-radius: 8px; font-size: 0.6rem; font-weight: 500; background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd; white-space: nowrap;">
              ${permiso.modulo || 'general'}
            </span>
          </td>
          <td style="padding: 6px 8px;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <label style="position: relative; display: inline-block; width: 32px; height: 18px; cursor: pointer;">
                <input type="checkbox" 
                       ${permiso.estado === 'activo' ? 'checked' : ''} 
                       onchange="window.rolesPermisosModule.toggleEstadoPermiso(${permiso.id}, this.checked)"
                       data-permiso-id="${permiso.id}"
                       style="opacity: 0; width: 0; height: 0;">
                <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${permiso.estado === 'activo' ? '#10b981' : '#d1d5db'}; transition: 0.3s; border-radius: 18px;">
                  <span style="position: absolute; content: ''; height: 14px; width: 14px; left: ${permiso.estado === 'activo' ? '18px' : '2px'}; bottom: 2px; background-color: white; transition: 0.3s; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,0.1);"></span>
                </span>
              </label>
            </div>
          </td>
          <td style="padding: 6px 8px;">
            <div style="display: flex; gap: 3px; justify-content: center;">
              <button onclick="window.rolesPermisosModule.editarPermiso(${permiso.id})" title="Editar permiso" style="width: 24px; height: 24px; border: none; border-radius: 4px; background: #f3f4f6; color: #6b7280; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;" onmouseover="this.style.background='#e5e7eb'; this.style.color='#374151';" onmouseout="this.style.background='#f3f4f6'; this.style.color='#6b7280';">
                ✏️
              </button>
              <button onclick="window.rolesPermisosModule.verDetallePermiso(${permiso.id})" title="Ver detalles" style="width: 24px; height: 24px; border: none; border-radius: 4px; background: #f3f4f6; color: #6b7280; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;" onmouseover="this.style.background='#dbeafe'; this.style.color='#2563eb';" onmouseout="this.style.background='#f3f4f6'; this.style.color='#6b7280';">
                👁️
              </button>
              <button onclick="window.rolesPermisosModule.eliminarPermiso(${permiso.id})" title="Eliminar permiso" style="width: 24px; height: 24px; border: none; border-radius: 4px; background: #f3f4f6; color: #6b7280; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;" onmouseover="this.style.background='#fee2e2'; this.style.color='#dc2626';" onmouseout="this.style.background='#f3f4f6'; this.style.color='#6b7280';">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    
    const finalHTML = `
      <div class="permisos-table">
        <table class="data-table-modern" style="width: 100%; border-collapse: separate; border-spacing: 0;">
          <thead style="position: sticky; top: 0; background: white; z-index: 10;">
            <tr>
              <th style="padding: 6px 8px; text-align: left; background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 600; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em;">Permiso</th>
              <th style="padding: 6px 8px; text-align: left; background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 600; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em;">Módulo</th>
              <th style="padding: 6px 8px; text-align: left; background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 600; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em;">Estado</th>
              <th style="padding: 6px 8px; text-align: center; background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 600; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${permisosHTML}
          </tbody>
        </table>
      </div>
    `;
    
    return finalHTML;
  }

  // Render nuevo rol
  renderNuevoRol() {
    this.container.innerHTML = `
      <!-- Header -->
      <header class="module-header">
        <div class="header-left">
          <button class="btn-secondary" onclick="window.rolesPermisosModule.showMain()">
            <span>←</span> Volver
          </button>
          <h1>➕ Nuevo Rol</h1>
        </div>
      </header>

      <!-- Form -->
      <div class="form-card">
        <form id="nuevoRolForm">
          <div class="form-row">
            <div class="form-group">
              <label for="rolNombre">Nombre del Rol *</label>
              <input type="text" id="rolNombre" name="nombre" required class="form-control" placeholder="Ej: Administrador">
            </div>
            <div class="form-group">
              <label for="rolDescripcion">Descripción *</label>
              <textarea id="rolDescripcion" name="descripcion" required class="form-control" rows="3" placeholder="Descripción del rol"></textarea>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="rolEstado">Estado</label>
              <select id="rolEstado" name="estado" class="form-control">
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="window.rolesPermisosModule.showMain()">
              <span>✖</span> Cancelar
            </button>
            <button type="submit" class="btn-success">
              <span>💾</span> Guardar Rol
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // Render editar rol
  renderEditarRol() {
    const rol = this.currentData.roles.find(r => r.id === this.currentRoleId);
    if (!rol) return;

    this.container.innerHTML = `
      <!-- Header -->
      <header class="module-header">
        <div class="header-left">
          <button class="btn-secondary" onclick="window.rolesPermisosModule.showMain()">
            <span>←</span> Volver
          </button>
          <h1>✏️ Editar Rol: ${rol.nombre}</h1>
        </div>
      </header>

      <!-- Form -->
      <div class="form-card">
        <form id="editarRolForm">
          <input type="hidden" name="id" value="${rol.id}">
          <div class="form-row">
            <div class="form-group">
              <label for="rolNombre">Nombre del Rol *</label>
              <input type="text" id="rolNombre" name="nombre" value="${rol.nombre}" required class="form-control">
            </div>
            <div class="form-group">
              <label for="rolDescripcion">Descripción *</label>
              <textarea id="rolDescripcion" name="descripcion" required class="form-control" rows="3">${rol.descripcion}</textarea>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="rolEstado">Estado</label>
              <select id="rolEstado" name="estado" class="form-control">
                <option value="activo" ${rol.estado === 'activo' ? 'selected' : ''}>Activo</option>
                <option value="inactivo" ${rol.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
              </select>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="window.rolesPermisosModule.showMain()">
              <span>✖</span> Cancelar
            </button>
            <button type="submit" class="btn-success">
              <span>💾</span> Actualizar Rol
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // Render asignar permisos
  renderAsignarPermisos() {
    const rol = this.currentData.roles.find(r => r.id === this.currentRoleId);
    if (!rol) return;

    const rolPermisos = this.currentData.asignaciones[rol.id] || [];

    this.container.innerHTML = `
      <!-- Header -->
      <header class="module-header">
        <div class="header-left">
          <button class="btn-secondary" onclick="window.rolesPermisosModule.showMain()">
            <span>←</span> Volver
          </button>
          <h1>Asignar Permisos - ${rol.nombre}</h1>
        </div>
      </header>

      <!-- Form -->
      <div class="form-card">
        <form id="asignarPermisosForm">
          <input type="hidden" name="rolId" value="${rol.id}">
          
          <div class="permissions-assignment">
            <h3>Seleccionar Permisos para "${rol.nombre}"</h3>
            
            ${this.currentData.permisos.map(permiso => `
              <div class="permission-checkbox">
                <label class="checkbox-label">
                  <input type="checkbox" 
                         name="permisos" 
                         value="${permiso.id}"
                         ${rolPermisos.includes(permiso.id) ? 'checked' : ''}
                         class="form-checkbox">
                  <div class="checkbox-content">
                    <strong>${permiso.nombre}</strong>
                    <small>${permiso.descripcion}</small>
                    <span class="permission-module-tag">${permiso.modulo}</span>
                  </div>
                </label>
              </div>
            `).join('')}
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="window.rolesPermisosModule.showMain()">
              <span>✖</span> Cancelar
            </button>
            <button type="submit" class="btn-primary">
              <span>💾</span> Guardar Asignación
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // Setup event listeners
  setupEventListeners() {
    // Nuevo rol form
    const nuevoRolForm = this.container.querySelector('#nuevoRolForm');
    if (nuevoRolForm) {
      nuevoRolForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.guardarNuevoRol(e.target);
      });
    }

    // Editar rol form
    const editarRolForm = this.container.querySelector('#editarRolForm');
    if (editarRolForm) {
      editarRolForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.actualizarRol(e.target);
      });
    }

    // Nuevo permiso form
    const nuevoPermisoForm = this.container.querySelector('#nuevoPermisoForm');
    if (nuevoPermisoForm) {
      nuevoPermisoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.guardarNuevoPermiso(e.target);
      });
    }

    // Editar permiso form
    const editarPermisoForm = this.container.querySelector('#editarPermisoForm');
    if (editarPermisoForm) {
      editarPermisoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.actualizarPermiso(e.target);
      });
    }

    // Asignar permisos form
    const asignarPermisosForm = this.container.querySelector('#asignarPermisosForm');
    if (asignarPermisosForm) {
      asignarPermisosForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.guardarAsignacionPermisos(e.target);
      });
    }
  }

  // Navigation methods
  showMain() {
    this.currentView = 'main';
    this.render();
    this.setupEventListeners();
  }

  showNuevoRol() {
    this.currentView = 'nuevo-rol';
    this.render();
    this.setupEventListeners();
  }

  editarRol(id) {
    this.currentRoleId = id;
    this.currentView = 'editar-rol';
    this.render();
    this.setupEventListeners();
  }

  asignarPermisos(id) {
    this.currentRoleId = id;
    this.currentView = 'asignar-permisos';
    this.render();
    this.setupEventListeners();
  }

  // CRUD operations
  async guardarNuevoRol(form) {
    const formData = new FormData(form);
    const nuevoRol = {
      id: Math.max(...this.currentData.roles.map(r => r.id)) + 1,
      nombre: formData.get('nombre'),
      descripcion: formData.get('descripcion'),
      estado: formData.get('estado'),
      usuarios_count: 0
    };

    this.currentData.roles.push(nuevoRol);
    this.currentData.asignaciones[nuevoRol.id] = [];
    
    this.showMain();
    this.showSuccess('Rol creado exitosamente');
  }

  async actualizarRol(form) {
    const formData = new FormData(form);
    const id = parseInt(formData.get('id'));
    
    const rolIndex = this.currentData.roles.findIndex(r => r.id === id);
    if (rolIndex !== -1) {
      this.currentData.roles[rolIndex] = {
        ...this.currentData.roles[rolIndex],
        nombre: formData.get('nombre'),
        descripcion: formData.get('descripcion'),
        estado: formData.get('estado')
      };
    }
    
    this.showMain();
    this.showSuccess('Rol actualizado exitosamente');
  }

  async guardarAsignacionPermisos(form) {
    const formData = new FormData(form);
    const rolId = parseInt(formData.get('rolId'));
    
    const permisosSeleccionados = [];
    const checkboxes = form.querySelectorAll('input[name="permisos"]:checked');
    checkboxes.forEach(cb => permisosSeleccionados.push(parseInt(cb.value)));
    
    this.currentData.asignaciones[rolId] = permisosSeleccionados;
    
    this.showMain();
    this.showSuccess('Permisos asignados exitosamente');
  }

  async eliminarRol(id) {
    if (confirm('¿Está seguro de que desea eliminar este rol? Esta acción no se puede deshacer.')) {
      const rolIndex = this.currentData.roles.findIndex(r => r.id === id);
      if (rolIndex !== -1) {
        this.currentData.roles.splice(rolIndex, 1);
        delete this.currentData.asignaciones[id];
        this.render();
        this.setupEventListeners();
        this.showSuccess('Rol eliminado exitosamente');
      }
    }
  }

  // Utility methods
  refreshRoles() {
    this.loadData();
    this.render();
    this.setupEventListeners();
  }

  showNuevoPermiso() {
    this.currentView = 'nuevo-permiso';
    this.renderNuevoPermiso();
    this.setupEventListeners();
  }

  renderNuevoPermiso() {
    this.container.innerHTML = `
      <!-- Header -->
      <header class="module-header">
        <div class="header-left">
          <button class="btn-secondary" onclick="window.rolesPermisosModule.showMain()">
            <span>←</span> Volver
          </button>
          <h1>➕ Nuevo Permiso</h1>
        </div>
      </header>

      <!-- Form -->
      <div class="form-card">
        <form id="nuevoPermisoForm">
          <div class="form-row">
            <div class="form-group">
              <label for="permisoNombre">Nombre del Permiso *</label>
              <input type="text" id="permisoNombre" name="nombre" required class="form-control" placeholder="Ej: Ver clientes">
            </div>
            <div class="form-group">
              <label for="permisoModulo">Módulo *</label>
              <select id="permisoModulo" name="modulo" required class="form-control">
                <option value="">Seleccionar módulo</option>
                <option value="clientes">Clientes</option>
                <option value="reservas">Reservas</option>
                <option value="habitaciones">Habitaciones</option>
                <option value="pagos">Pagos</option>
                <option value="reportes">Reportes</option>
                <option value="usuarios">Usuarios</option>
                <option value="sistema">Sistema</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="permisoDescripcion">Descripción *</label>
              <textarea id="permisoDescripcion" name="descripcion" required class="form-control" rows="3" placeholder="Descripción del permiso"></textarea>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="window.rolesPermisosModule.showMain()">
              <span>✖</span> Cancelar
            </button>
            <button type="submit" class="btn-success">
              <span>💾</span> Guardar Permiso
            </button>
          </div>
        </form>
      </div>
    `;
  }

  editarPermiso(id) {
    const permiso = this.currentData.permisos.find(p => p.id === id);
    if (!permiso) return;

    this.currentPermisoId = id;
    this.currentView = 'editar-permiso';
    this.renderEditarPermiso();
    this.setupEventListeners();
  }

  renderEditarPermiso() {
    const permiso = this.currentData.permisos.find(p => p.id === this.currentPermisoId);
    if (!permiso) return;

    this.container.innerHTML = `
      <!-- Header -->
      <header class="module-header">
        <div class="header-left">
          <button class="btn-secondary" onclick="window.rolesPermisosModule.showMain()">
            <span>←</span> Volver
          </button>
          <h1>✏️ Editar Permiso: ${permiso.nombre}</h1>
        </div>
      </header>

      <!-- Form -->
      <div class="form-card">
        <form id="editarPermisoForm">
          <input type="hidden" name="id" value="${permiso.id}">
          <div class="form-row">
            <div class="form-group">
              <label for="permisoNombre">Nombre del Permiso *</label>
              <input type="text" id="permisoNombre" name="nombre" value="${permiso.nombre}" required class="form-control">
            </div>
            <div class="form-group">
              <label for="permisoModulo">Módulo *</label>
              <select id="permisoModulo" name="modulo" required class="form-control">
                <option value="clientes" ${permiso.modulo === 'clientes' ? 'selected' : ''}>Clientes</option>
                <option value="reservas" ${permiso.modulo === 'reservas' ? 'selected' : ''}>Reservas</option>
                <option value="habitaciones" ${permiso.modulo === 'habitaciones' ? 'selected' : ''}>Habitaciones</option>
                <option value="pagos" ${permiso.modulo === 'pagos' ? 'selected' : ''}>Pagos</option>
                <option value="reportes" ${permiso.modulo === 'reportes' ? 'selected' : ''}>Reportes</option>
                <option value="usuarios" ${permiso.modulo === 'usuarios' ? 'selected' : ''}>Usuarios</option>
                <option value="sistema" ${permiso.modulo === 'sistema' ? 'selected' : ''}>Sistema</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="permisoDescripcion">Descripción *</label>
              <textarea id="permisoDescripcion" name="descripcion" required class="form-control" rows="3">${permiso.descripcion}</textarea>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="window.rolesPermisosModule.showMain()">
              <span>✖</span> Cancelar
            </button>
            <button type="submit" class="btn-success">
              <span>💾</span> Actualizar Permiso
            </button>
          </div>
        </form>
      </div>
    `;
  }

  async guardarNuevoPermiso(form) {
    const formData = new FormData(form);
    const nuevoPermiso = {
      id: Math.max(...this.currentData.permisos.map(p => p.id)) + 1,
      nombre: formData.get('nombre'),
      descripcion: formData.get('descripcion'),
      modulo: formData.get('modulo')
    };

    this.currentData.permisos.push(nuevoPermiso);
    
    this.showMain();
    this.showSuccess('Permiso creado exitosamente');
  }

  async actualizarPermiso(form) {
    const formData = new FormData(form);
    const id = parseInt(formData.get('id'));
    
    const permisoIndex = this.currentData.permisos.findIndex(p => p.id === id);
    if (permisoIndex !== -1) {
      this.currentData.permisos[permisoIndex] = {
        ...this.currentData.permisos[permisoIndex],
        nombre: formData.get('nombre'),
        descripcion: formData.get('descripcion'),
        modulo: formData.get('modulo')
      };
    }
    
    this.showMain();
    this.showSuccess('Permiso actualizado exitosamente');
  }

  // Render vista detalle rol
  renderDetalleRol() {
    const rol = this.currentData.roles.find(r => r.id === this.currentRoleId);
    if (!rol) return;

    const permisosAsignados = this.currentData.asignaciones[rol.id] || [];
    const permisosDetails = permisosAsignados.map(pId => 
      this.currentData.permisos.find(p => p.id === pId)
    ).filter(p => p);

    this.container.innerHTML = `
      <!-- Header -->
      <header class="module-header">
        <div class="header-left">
          <button class="btn-secondary" onclick="window.rolesPermisosModule.showMain()">
            <span>←</span> Volver
          </button>
          <h1>👁️ Detalle del Rol: ${rol.nombre}</h1>
        </div>
      </header>

      <!-- Detail Card -->
      <div class="detail-card">
        <div class="detail-header">
          <div class="detail-info">
            <h2>${rol.nombre}</h2>
            <p>${rol.descripcion}</p>
            <div class="detail-meta">
              <span class="badge ${rol.estado === 'activo' ? 'badge-success' : 'badge-warning'}">
                ${rol.estado === 'activo' ? '🟢 Activo' : '🔴 Inactivo'}
              </span>
              <span class="badge badge-info">${rol.usuarios_count} usuarios</span>
            </div>
          </div>
          <div class="detail-actions">
            <button class="btn-secondary" onclick="window.rolesPermisosModule.editarRol(${rol.id})">
              <span>✏️</span> Editar
            </button>
          </div>
        </div>

        <div class="detail-section">
          <h3>🔐 Permisos Asignados</h3>
          <div class="permissions-grid">
            ${permisosDetails.length > 0 ? permisosDetails.map(permiso => `
              <div class="permission-item">
                <div class="permission-info">
                  <strong>${permiso.nombre}</strong>
                  <small>${permiso.descripcion}</small>
                  <span class="badge badge-info">${permiso.modulo}</span>
                </div>
              </div>
            `).join('') : '<p class="text-muted">Este rol no tiene permisos asignados</p>'}
          </div>
        </div>
      </div>
    `;
    this.setupEventListeners();
  }

  // Render vista detalle permiso
  renderDetallePermiso() {
    const permiso = this.currentData.permisos.find(p => p.id === this.currentPermisoId);
    if (!permiso) return;

    // Encontrar roles que tienen este permiso
    const rolesConPermiso = Object.keys(this.currentData.asignaciones)
      .filter(rolId => this.currentData.asignaciones[rolId].includes(permiso.id))
      .map(rolId => this.currentData.roles.find(r => r.id === parseInt(rolId)))
      .filter(r => r);

    this.container.innerHTML = `
      <!-- Header -->
      <header class="module-header">
        <div class="header-left">
          <button class="btn-secondary" onclick="window.rolesPermisosModule.showMain()">
            <span>←</span> Volver
          </button>
          <h1>👁️ Detalle del Permiso: ${permiso.nombre}</h1>
        </div>
      </header>

      <!-- Detail Card -->
      <div class="detail-card">
        <div class="detail-header">
          <div class="detail-info">
            <h2>${permiso.nombre}</h2>
            <p>${permiso.descripcion}</p>
            <div class="detail-meta">
              <span class="badge badge-info">${permiso.modulo}</span>
              <span class="badge ${permiso.estado === 'activo' ? 'badge-success' : 'badge-warning'}">
                ${permiso.estado === 'activo' ? '🟢 Activo' : '🔴 Inactivo'}
              </span>
            </div>
          </div>
          <div class="detail-actions">
            <button class="btn-secondary" onclick="window.rolesPermisosModule.editarPermiso(${permiso.id})">
              <span>✏️</span> Editar
            </button>
          </div>
        </div>

        <div class="detail-section">
          <h3>👥 Roles Asociados</h3>
          <div class="roles-list">
            ${rolesConPermiso.length > 0 ? rolesConPermiso.map(rol => `
              <div class="role-item">
                <div class="role-info">
                  <strong>${rol.nombre}</strong>
                  <small>${rol.descripcion}</small>
                  <span class="badge ${rol.estado === 'activo' ? 'badge-success' : 'badge-warning'}">
                    ${rol.estado === 'activo' ? '🟢 Activo' : '🔴 Inactivo'}
                  </span>
                </div>
              </div>
            `).join('') : '<p class="text-muted">Este permiso no está asignado a ningún rol</p>'}
          </div>
        </div>
      </div>
    `;
    this.setupEventListeners();
  }

  // Métodos para mostrar detalles
  verDetalleRol(id) {
    this.currentRoleId = id;
    this.currentView = 'detalle-rol';
    this.render();
    this.setupEventListeners();
  }

  verDetallePermiso(id) {
    this.currentPermisoId = id;
    this.currentView = 'detalle-permiso';
    this.render();
    this.setupEventListeners();
  }

  // Métodos para toggle de estado
  async toggleEstadoRol(id, estado) {
    const rol = this.currentData.roles.find(r => r.id === id);
    if (rol) {
      rol.estado = estado ? 'activo' : 'inactivo';
      this.showSuccess(`Rol ${estado ? 'activado' : 'desactivado'} exitosamente`);
    }
  }

  async toggleEstadoPermiso(id, estado) {
    const permiso = this.currentData.permisos.find(p => p.id === id);
    if (permiso) {
      permiso.estado = estado ? 'activo' : 'inactivo';
      this.showSuccess(`Permiso ${estado ? 'activado' : 'desactivado'} exitosamente`);
    }
  }

  async eliminarPermiso(id) {
    if (confirm('¿Está seguro de que desea eliminar este permiso? Esta acción no se puede deshacer.')) {
      const permisoIndex = this.currentData.permisos.findIndex(p => p.id === id);
      if (permisoIndex !== -1) {
        this.currentData.permisos.splice(permisoIndex, 1);
        // Remover de todas las asignaciones
        Object.keys(this.currentData.asignaciones).forEach(rolId => {
          this.currentData.asignaciones[rolId] = this.currentData.asignaciones[rolId].filter(pId => pId !== id);
        });
        this.render();
        this.setupEventListeners();
        this.showSuccess('Permiso eliminado exitosamente');
      }
    }
  }

  showSuccess(message) {
    // Mostrar notificación de éxito
    const notification = document.createElement('div');
    notification.className = 'notification notification-success';
    notification.innerHTML = `
      <span>✅</span> ${message}
    `;
    this.container.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
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
export function renderRolesPermisos(container) {
  window.rolesPermisosModule = new RolesPermisosModule(container);
  window.rolesPermisosModule.initialize();
}
