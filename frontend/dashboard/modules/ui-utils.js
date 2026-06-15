// ui-utils.js – shared utilities for dashboard modules
// Centralized SweetAlert2 wrapper and FontAwesome icon constants

// Simple alert wrapper: (title, text, icon)
// Simple alert wrapper that also supports config objects
export function showAlert(titleOrConfig, text, icon) {
  const normalizeIcon = (ic) => {
    if (!ic) return 'info';
    const map = {
      success: 'success',
      info: 'info',
      error: 'error',
      warning: 'warning',
      confirm: 'question',
      question: 'question'
    };
    return map[String(ic).toLowerCase()] || 'info';
  };

  const finalIcon = normalizeIcon(typeof titleOrConfig === 'object' ? titleOrConfig.icon : icon);

  // By default, ALL simple alerts will now be non-blocking toasts on the top right
  const isStringAlert = typeof titleOrConfig === 'string';
  const textMsg = isStringAlert ? text : (titleOrConfig.text || '');
  const titleMsg = isStringAlert ? titleOrConfig : (titleOrConfig.title || '');
  
  // If it's a simple call or it's a success/info icon, use Toast
  if (isStringAlert || finalIcon === 'success' || finalIcon === 'info' || finalIcon === 'error' || finalIcon === 'warning') {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: finalIcon === 'info' ? 'success' : finalIcon, // Map info to success for aesthetic reasons usually
      title: titleMsg || textMsg,
      text: titleMsg && textMsg ? textMsg : undefined,
      showConfirmButton: false,
      timer: 3500,
      timerProgressBar: true,
      customClass: {
        popup: 'colored-toast'
      }
    });
    return;
  }

  if (typeof titleOrConfig === 'object' && titleOrConfig !== null) {
    const cfg = { ...titleOrConfig };
    cfg.icon = finalIcon;
    Swal.fire(cfg);
  } else {
    Swal.fire({
      title: titleOrConfig,
      text,
      icon: finalIcon,
      confirmButtonText: 'Aceptar'
    });
  }
}


// Icon class constants for UI components
export const ICONS = {
  view: 'fa-solid fa-eye',
  edit: 'fa-solid fa-pen',
  delete: 'fa-solid fa-trash',
  statusOn: 'fa-solid fa-toggle-on',
  statusOff: 'fa-solid fa-toggle-off',
  success: 'fa-solid fa-circle-check',
  error: 'fa-solid fa-circle-xmark',
  warning: 'fa-solid fa-triangle-exclamation',
  info: 'fa-solid fa-circle-info',
  question: 'fa-solid fa-circle-question'
};

// ---------------------------------------------------
// Helper utilities used across the frontend
// ---------------------------------------------------
/** Return only items with Estado === 1 */
export function filterActive(items) {
  if (!Array.isArray(items)) return [];
  return items.filter(i => {
    const v = String(i?.Estado ?? i?.estado ?? i?.EstadoRegistro ?? '').toLowerCase();
    return ['', '1', 'true', 'activo', 'activa', 'disponible'].includes(v);
  });
}
/** Sanitize a room object: remove ID, replace undefined/null with friendly defaults */
export function sanitizeRoom(room) {
  const {
    IDHabitacion,
    NombreHabitacion = 'Sin nombre',
    ImagenUrl = '',
    Descripcion = 'Sin descripción',
    Costo = 0,
    CapacidadMaximaPersonas = 0,
    cantidad_camas = 0,
    tipo_camas = '',
    ...rest
  } = room || {};
  return {
    IDHabitacion, // keep for internal logic
    NombreHabitacion,
    ImagenUrl,
    Descripcion,
    Costo,
    CapacidadMaximaPersonas,
    cantidad_camas,
    tipo_camas,
    ...rest,
  };
}
/** Format number as price string */
export function formatPrice(num) {
  const n = Number(num);
  if (isNaN(n)) return 'COL$ –';
  // Colombian peso format without decimal places
  return `COL$ ${n.toLocaleString('es-CO')}`;
}
/** Attach tooltip text to an element (data-tooltip attribute) */
export function attachTooltip() {
  // Create a single tooltip element
  const tooltipEl = document.createElement('div');
  tooltipEl.className = 'tooltip';
  // use fixed positioning for predictable placement
  tooltipEl.style.position = 'fixed';
  document.body.appendChild(tooltipEl);

  // Handler to show tooltip (delegated)
  function show(e, el) {
    // Remove native title to avoid default browser tooltip
    if (el.hasAttribute('title')) {
      el.removeAttribute('title');
    }
    const txt = el.dataset.tooltip;
    if (!txt) return;
    tooltipEl.textContent = txt;
    tooltipEl.classList.add('show');
    // Position tooltip immediately based on current mouse event
    move(e);
  }
  // Handler to hide tooltip
  function hide() {
    tooltipEl.classList.remove('show');
  }

  // Handler to move tooltip with cursor, with 10px offset, staying within viewport
  function move(e) {
    const offset = 10;
    const tooltipRect = tooltipEl.getBoundingClientRect();
    let left = e.clientX + offset;
    let top = e.clientY + offset;
    const maxLeft = window.innerWidth - tooltipRect.width - offset;
    const maxTop = window.innerHeight - tooltipRect.height - offset;
    if (left > maxLeft) left = e.clientX - tooltipRect.width - offset;
    if (top > maxTop) top = e.clientY - tooltipRect.height - offset;
    tooltipEl.style.left = `${left + window.scrollX}px`;
    tooltipEl.style.top = `${top + window.scrollY}px`;
  }

  // Use event delegation for tooltip handling (covers dynamic elements)
  function closestTooltipElement(target) {
    if (!target) return null;
    let el = null;
    if (typeof target.closest === 'function') el = target.closest('[data-tooltip]');
    else if (target.nodeType === Node.TEXT_NODE && target.parentElement) el = target.parentElement.closest('[data-tooltip]');
    else el = target.parentElement ? target.parentElement.closest('[data-tooltip]') : null;

    if (el) {
      // Regla específica para sidebar: solo mostrar tooltip si el sidebar está colapsado
      const sidebar = el.closest('.sidebar');
      if (sidebar && !sidebar.classList.contains('collapsed')) {
        return null;
      }
    }
    return el;
  }

  document.addEventListener('mouseenter', (e) => {
    const el = closestTooltipElement(e.target);
    if (!el) return;
    show(e, el);
  }, true);

  document.addEventListener('mouseleave', (e) => {
    const el = closestTooltipElement(e.target);
    if (!el) return;
    hide();
  }, true);

  document.addEventListener('mousemove', (e) => {
    const el = closestTooltipElement(e.target);
    if (!el) return;
    move(e);
  }, true);
}

// Auto‑initialize floating tooltips after DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachTooltip);
  } else {
    attachTooltip();
  }
}

export function renderPremiumPagination(containerId, state, totalItems, globalsModulePath) {
  let paginationDiv = document.getElementById(containerId);
  if (!paginationDiv) return;

  const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;

  if (totalItems === 0) {
      paginationDiv.style.display = 'none';
      return;
  }
  paginationDiv.style.display = 'flex';
  paginationDiv.className = 'flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 mt-6 border-t border-gray-100 bg-white w-full col-span-full rounded-2xl shadow-sm';

  const startItem = ((state.currentPage - 1) * state.itemsPerPage) + 1;
  const endItem = Math.min(state.currentPage * state.itemsPerPage, totalItems);

  let buttonsHTML = `
      <button onclick="window.${globalsModulePath}.goToPage(${Math.max(1, state.currentPage - 1)})" 
              class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-brand transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
              ${state.currentPage === 1 ? 'disabled' : ''}>
          <i class="fa-solid fa-chevron-left text-xs"></i>
      </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
      if (totalPages > 7) {
          if (i !== 1 && i !== totalPages && Math.abs(i - state.currentPage) > 1) {
              if (i === 2 || i === totalPages - 1) buttonsHTML += `<span class="px-1 text-gray-400">...</span>`;
              continue;
          }
      }
      const activeClass = i === state.currentPage ? 'bg-brand text-white border-brand shadow-md shadow-brand/20' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50';
      buttonsHTML += `<button onclick="window.${globalsModulePath}.goToPage(${i})" class="w-8 h-8 flex items-center justify-center rounded-lg border font-bold text-xs cursor-pointer transition-all ${activeClass}">${i}</button>`;
  }

  buttonsHTML += `
      <button onclick="window.${globalsModulePath}.goToPage(${Math.min(totalPages, state.currentPage + 1)})" 
              class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-brand transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
              ${state.currentPage === totalPages ? 'disabled' : ''}>
          <i class="fa-solid fa-chevron-right text-xs"></i>
      </button>
  `;

  paginationDiv.innerHTML = `
    <div class="flex items-center gap-4">
        <span class="text-xs text-muted font-medium">Mostrando <strong class="text-brand-deep">${startItem}-${endItem}</strong> de <strong class="text-brand-deep">${totalItems}</strong> resultados</span>
        <div class="hidden sm:flex items-center gap-2 border-l border-gray-200 pl-4">
            <span class="text-[10px] text-muted font-bold uppercase tracking-wider">Filas:</span>
            <select onchange="window.${globalsModulePath}.changeItemsPerPage(this.value)" class="text-xs font-bold text-brand-deep bg-transparent border-none cursor-pointer focus:outline-none">
                <option value="10" ${state.itemsPerPage == 10 ? 'selected' : ''}>10</option>
                <option value="20" ${state.itemsPerPage == 20 ? 'selected' : ''}>20</option>
                <option value="50" ${state.itemsPerPage == 50 ? 'selected' : ''}>50</option>
            </select>
        </div>
    </div>
    <div class="flex gap-1.5 items-center">${buttonsHTML}</div>
  `;
}

// Global Interceptor for HTML5 Form Validation
if (typeof document !== 'undefined') {
  document.addEventListener('invalid', (e) => {
    e.preventDefault(); // Mute native browser tooltip
    let fieldName = 'Este campo';
    if (e.target) {
      // Find closest label text if possible
      const id = e.target.id;
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) {
          fieldName = label.textContent.replace('*', '').trim();
        }
      }
      if (fieldName === 'Este campo') {
        fieldName = e.target.getAttribute('placeholder') || e.target.getAttribute('name') || e.target.id || 'Un campo obligatorio';
      }
      e.target.focus();
    }
    showAlert('Campo Obligatorio', `Por favor completa: ${fieldName}`, 'warning');
  }, true);
}

// Helper to resolve high-quality image for each service
export function resolveServiceImage(item) {
    const itemNameRaw = item.nombre || item.NombreServicio || item.Nombre || '';
    const itemDesc = item.descripcion || item.Descripcion || '';
    const fullText = `${itemNameRaw} ${itemDesc}`.toLowerCase();
    
    // Check if we are in a subfolder (admin, cliente, auth, dashboard)
    const isSubfolder = typeof window !== 'undefined' && 
        (window.location.pathname.includes('/admin/') || 
         window.location.pathname.includes('/cliente/') || 
         window.location.pathname.includes('/auth/') || 
         window.location.pathname.includes('/dashboard/') ||
         window.location.pathname.includes('/pages/'));
         
    const assetsPath = isSubfolder ? '../assets' : './assets';
    
    if (fullText.includes('spa') || fullText.includes('masaje') || fullText.includes('relajacion') || fullText.includes('terapia')) {
        return `${assetsPath}/images/service/SPA.png`;
    } else if (fullText.includes('caballo') || fullText.includes('cabalgata') || fullText.includes('equino')) {
        return `${assetsPath}/images/service/cabalgata.png`;
    } else if (fullText.includes('caminata') || fullText.includes('guiado') || fullText.includes('recorrido') || fullText.includes('ecoturismo')) {
        return `${assetsPath}/images/service/caminata.png`;
    }
    
    return `${assetsPath}/images/service/SPA.png`;
}
