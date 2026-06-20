import { 
  getClientes, 
  getHabitaciones, 
  getPaquetes, 
  getServicios, 
  getReservas,
  crearReserva,
  actualizarReserva,
  cancelarReserva
} from "../core/api.js";
import { getAppUrl } from "../core/authGuard.js";
import { showAlert } from "./ui-utils.js";
import { getStatusClass, getStatusText } from "../../js/shared/reservaStatus.js";
import { formatCurrency } from "../../js/shared/helpers.js";

// Admin Reservas module
export class ReservasAdminModule {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      isClientMode: options.isClientMode || false,
      showListOnly: options.showListOnly || false,
      showFormOnly: options.showFormOnly || false,
      ...options
    };
    
    // Global reference for onclick handlers
    window.reservasModule = this;

    this.currentData = {
      clientes: [],
      habitaciones: [],
      paquetes: [],
      servicios: [],
      reservas: [],
      selectedRoom: null,
      selectedPackages: [],
      selectedServices: []
    };
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.currentFilteredData = [];
    this.refs = {};
  }

  // Initialize reservas module
  async initialize() {
    try {
      let clientes, habitaciones, paquetes, servicios, reservas;

      try {
        [clientes, habitaciones, paquetes, servicios, reservas] = await Promise.all([
          getClientes(),
          getHabitaciones(),
          getPaquetes(),
          getServicios(),
          getReservas()
        ]);
      } catch (apiError) {
        console.error('Error cargando datos desde API:', apiError);
        this.showError("Error de Conexión", "No se pudieron cargar los datos del servidor. Intente recargar la página.");
        return; // Salir de la función si falla la carga
      }

      // Solo dejamos logs de métricas básicas
      console.log('Resumen de datos cargados:', {
        clientes: clientes.length,
        habitaciones: habitaciones.length,
        paquetes: paquetes.length,
        servicios: servicios.length,
        reservas: reservas.length
      });

      this.currentData = {
        clientes,
        habitaciones,
        paquetes,
        servicios,
        reservas,
        selectedRoom: null,
        selectedPackages: [],
        selectedServices: []
      };

      // Setup references
      this.setupReferences();

      // Render data
      this.renderClientes(clientes);
      this.renderRooms(habitaciones);
      this.renderPackages(paquetes);
      this.renderServices(servicios);
      this.currentFilteredData = reservas;
      this.renderReservationsTable(reservas);
      this.updateMetrics();

      // Ensure Chart.js is loaded before rendering charts
      const loadChartJs = () => {
        return new Promise((resolve, reject) => {
          if (window.Chart) {
            resolve();
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
          script.onload = () => resolve();
          script.onerror = (e) => reject(new Error('Failed to load Chart.js'));
          document.head.appendChild(script);
        });
      };
      await loadChartJs();
        this.renderCharts();
        this.setupEventListeners();
        this.initFlatpickr();

    } catch (error) {
      console.error("Error inicializando reservas:", error);
      this.showError("Error al cargar datos", "No se pudieron cargar los datos de las reservas. Por favor, intente nuevamente.");
    }
  }

  // Setup DOM references
  setupReferences() {
    this.refs = {
      totalReservations: this.container.querySelector("#totalReservations"),
      activeReservations: this.container.querySelector("#activeReservations"),
      todayReservations: this.container.querySelector("#todayReservations"),
      monthlyRevenue: this.container.querySelector("#monthlyRevenue"),
      reservationsTableBody: this.container.querySelector("#reservationsTableBody"),
      reservationFormSection: this.container.querySelector("#reservationFormSection"),
      reservationsListSection: this.container.querySelector("#reservationsListSection"),
      showReservationFormBtn: this.container.querySelector("#showReservationFormBtn"),
      cancelNewReservationBtn: this.container.querySelector("#cancelNewReservationBtn"),
      reservationForm: this.container.querySelector("#reservationForm"),
      editReservationSection: this.container.querySelector("#editReservationSection"),
      editReservationContainer: this.container.querySelector("#editReservationContainer"),
      clienteSelect: this.container.querySelector("#clienteSelect"),
      documentoInput: this.container.querySelector("#documentoInput"),
      nombreClienteReadOnly: this.container.querySelector("#nombreClienteReadOnly"),
      fechaInicio: this.container.querySelector("#fechaInicio"),
      fechaFin: this.container.querySelector("#fechaFin"),
      horaEntrada: this.container.querySelector("#horaEntrada"),
      horaSalida: this.container.querySelector("#horaSalida"),
      roomSelection: this.container.querySelector("#roomSelection"),
      packagesGrid: this.container.querySelector("#packagesGrid"),
      servicesGrid: this.container.querySelector("#servicesGrid"),
      metodoPago: this.container.querySelector("#metodoPago"),
      estadoReserva: this.container.querySelector("#estadoReserva"),
      subtotal: this.container.querySelector("#subtotal"),
      totalAmount: this.container.querySelector("#totalAmount"),
      clearFormBtn: this.container.querySelector("#clearFormBtn"),
      searchReservations: this.container.querySelector("#searchReservations"),
      filterStatus: this.container.querySelector("#filterStatus")
    };

    // Make standard time readonly
    if (this.refs.horaEntrada) this.refs.horaEntrada.setAttribute('readonly', 'true');
    if (this.refs.horaSalida) this.refs.horaSalida.setAttribute('readonly', 'true');

    // Apply mode-specific configurations
    this.applyModeConfigurations();
  }

  // Apply mode-specific configurations (client mode, form-only, list-only)
  applyModeConfigurations() {
    // Client mode: hide client selection and document input
    if (this.options.isClientMode) {
      if (this.refs.clienteSelect) {
        this.refs.clienteSelect.parentElement.style.display = 'none';
        this.refs.clienteSelect.required = false;
      }
      if (this.refs.documentoInput) {
        this.refs.documentoInput.parentElement.style.display = 'none';
      }
    }

    // Show form only: hide list section and show form section
    if (this.options.showFormOnly) {
      if (this.refs.reservationsListSection) {
        this.refs.reservationsListSection.style.display = 'none';
      }
      if (this.refs.reservationFormSection) {
        this.refs.reservationFormSection.style.display = 'block';
      }
    }

    // Show list only: hide form section and show list section
    if (this.options.showListOnly) {
      if (this.refs.reservationFormSection) {
        this.refs.reservationFormSection.style.display = 'none';
      }
      if (this.refs.reservationsListSection) {
        this.refs.reservationsListSection.style.display = 'block';
      }
    }
  }

  // Render clients
  renderClientes(clientes) {
    const activeClients = clientes.filter(c => Number(c.Estado) === 1);
    
    // Guardamos activeClients en la instancia para buscar después
    this.activeClients = activeClients;

    // Populate datalist for documentoInput
    const datalist = this.container.querySelector("#documentosList");
    if (datalist) {
      const docSet = new Set();
      datalist.innerHTML = activeClients.map(c => {
        const doc = String(c.NroDocumento || c.nro_documento || c.documento || '').trim();
        if (!doc || docSet.has(doc)) return '';
        docSet.add(doc);
        return `<option value="${doc}"></option>`;
      }).join('');
    }

    // Sync from documentoInput (datalist selection) to readonly & hidden field
    if (this.refs.documentoInput) {
      this.refs.documentoInput.addEventListener('input', (e) => {
        const doc = e.target.value.trim();
        const foundClient = this.activeClients.find(c => String(c.NroDocumento || c.nro_documento || c.documento || '').trim() === doc);
        
        if (foundClient) {
          const nombreCompleto = foundClient.NombreCompleto || 
                               `${foundClient.Nombres || ''} ${foundClient.Apellidos || ''}`.trim() || 
                               foundClient.nombre_completo ||
                               `${foundClient.nombres || ''} ${foundClient.apellidos || ''}`.trim() ||
                               foundClient.nombre || 
                               foundClient.Nombre ||
                               `${foundClient.PrimerNombre || ''} ${foundClient.PrimerApellido || ''}`.trim() ||
                               'Cliente sin nombre';
          const clienteId = foundClient.id_cliente || foundClient.IDCliente || foundClient.id || foundClient.ID || foundClient.NroDocumento || foundClient.nro_documento;
          
          if (this.refs.nombreClienteReadOnly) this.refs.nombreClienteReadOnly.value = nombreCompleto;
          if (this.refs.clienteSelect) this.refs.clienteSelect.value = clienteId;
        } else {
          if (this.refs.nombreClienteReadOnly) this.refs.nombreClienteReadOnly.value = '';
          if (this.refs.clienteSelect) this.refs.clienteSelect.value = '';
        }
        this.calculateTotal();
      });
    }
    
    this.setupDateRestrictions();
  }

  // ── UTILIDAD FECHAS ──────────────────────────────────────────
  // Normaliza cualquier campo de fecha a 'YYYY-MM-DD' sin problemas
  // de zona horaria (evita off-by-one que crea new Date('2025-06-17') en UTC-5).
  _normDate(value) {
    if (!value) return '';
    // Si ya viene como 'YYYY-MM-DD'
    const iso = String(value).split('T')[0];
    return iso.length === 10 ? iso : '';
  }

  // Devuelve 'YYYY-MM-DD' de hoy en zona local (no UTC).
  _todayLocal() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Suma N días a una fecha 'YYYY-MM-DD' → 'YYYY-MM-DD' (sin UTC shift).
  _addDays(dateStr, n) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d + n);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  // Setup date restrictions
  setupDateRestrictions() {
    const today = this._todayLocal();
    
    if (this.refs.fechaInicio) {
      this.refs.fechaInicio.setAttribute('min', today);
      this.refs.fechaInicio.addEventListener('change', (e) => {
        const startDate = e.target.value;
        if (this.refs.fechaFin && startDate) {
          const minEndStr = this._addDays(startDate, 1);
          this.refs.fechaFin.setAttribute('min', minEndStr);
          if (this.refs.fechaFin.value && this.refs.fechaFin.value <= startDate) {
            this.refs.fechaFin.value = '';
          }
        }
        this.calculateTotal();
      });
    }
    
    if (this.refs.fechaFin) {
      this.refs.fechaFin.setAttribute('min', this._addDays(today, 1));
      this.refs.fechaFin.addEventListener('change', () => this.calculateTotal());
    }
  }

  // Helper to resolve room image
  resolveRoomImage(hab) {
    let imgName = (Array.isArray(hab.imagenes) && hab.imagenes[0]) || hab.ImagenUrl || hab.imagenUrl || hab.imagen || hab.ImagenHabitacion;
    if (imgName && typeof imgName === 'object' && imgName.type === 'Buffer') {
        imgName = String.fromCharCode.apply(null, imgName.data);
    }
    if (typeof imgName === 'string' && imgName.trim() !== '' && imgName !== 'null' && imgName !== '[object Object]') {
      if (imgName.startsWith('http')) return imgName;
      if (imgName.startsWith('/')) return imgName;
      // If it's a filename, assume uploads
      if (/^[\w\- .]+\.(png|jpg|jpeg|webp|gif)$/i.test(imgName)) return `/uploads/${imgName}`;
      // If it references uploads but missing leading slash
      if (imgName.toLowerCase().includes('uploads')) return imgName.startsWith('/') ? imgName : `/${imgName}`;
      const cleanName = imgName.replace(/^((\.{2}\/)+assets\/images\/rooms\/)/, '').replace('assets/images/rooms/', '');
      return getAppUrl('assets/images/rooms/' + cleanName);
    }
    
    // Fallback based on type
    const type = String(hab.tipo || hab.Tipo || hab.NombreHabitacion || '').toLowerCase();
    if (type.includes('familiar')) return getAppUrl('assets/images/rooms/familiar.png');
    if (type.includes('pareja')) return getAppUrl('assets/images/rooms/parejas.png');
    return getAppUrl('assets/images/rooms/individual.png');
  }

  // Render rooms
  renderRooms(habitaciones) {
    const activeRooms = this.currentData.selectedRoom ? [this.currentData.selectedRoom] : [];
    const availableRooms = habitaciones.filter(h => {
        const estado = h.estado !== undefined ? h.estado : (h.Estado !== undefined ? h.Estado : 1);
        return Number(estado) === 1 || String(estado).toLowerCase() === 'disponible';
    });
    
    if (!this.refs.roomSelection) return;
    
    this.refs.roomSelection.innerHTML = availableRooms.map(hab => {
      const isSelected = activeRooms.find(r => (r.id_habitacion || r.IDHabitacion) == (hab.id_habitacion || hab.IDHabitacion));
      return `
        <div class="room-card ${isSelected ? 'selected' : ''}" 
             data-id="${hab.id_habitacion || hab.IDHabitacion}"
             style="cursor: pointer; border-radius: 16px; overflow: hidden; background: white; border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: all 0.3s ease;">
          <div class="room-image" style="height: 150px; position: relative;">
            <img src="${this.resolveRoomImage(hab)}" 
                 onerror="this.onerror=null; this.src='${getAppUrl('assets/images/rooms/individual.png')}'"
                 style="width: 100%; height: 100%; object-fit: cover;">
            ${isSelected ? '<div style="position: absolute; top: 10px; right: 10px; background: var(--brand); color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">✓</div>' : ''}
          </div>
          <div class="room-info" style="padding: 15px;">
            <h4 style="margin: 0 0 5px 0; color: var(--brand-deep);">${hab.tipo || hab.Tipo || hab.NombreHabitacion || 'Habitación'}</h4>
            <p style="margin: 0 0 10px 0; font-size: 0.85rem; color: var(--muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${hab.descripcion || hab.Descripcion || 'Habitación confortable con todos los servicios básicos.'}
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 700; color: var(--brand); font-size: 1.1rem;">$${this.formatCurrency(hab.precio || hab.Precio || hab.Costo || 0)}</span>
              <span style="font-size: 0.8rem; color: var(--muted);">👤 ${ (String(hab.tipo || hab.Tipo || hab.NombreHabitacion || '').toLowerCase().includes('familiar')) ? 5 : (hab.capacidad || hab.Capacidad || 2) } Pers.</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Add click handlers
    this.container.querySelectorAll('.room-card').forEach(card => {
      card.addEventListener('click', () => {
        const roomId = parseInt(card.dataset.id);
        const currentSelectedId = this.currentData.selectedRoom ? (this.currentData.selectedRoom.id_habitacion || this.currentData.selectedRoom.IDHabitacion) : null;
        
        if (currentSelectedId == roomId) {
          // Deselect if already selected
          this.currentData.selectedRoom = null;
        } else {
          // Select new room
          this.currentData.selectedRoom = this.currentData.habitaciones.find(h => parseInt(h.id_habitacion || h.IDHabitacion) === roomId);
          this.bloquearFechasOcupadas(roomId);
        }
        
        // Re-render to update selection visual
        this.renderRooms(this.currentData.habitaciones);
        this.calculateTotal();
      });
    });
  }

  // Render packages
  renderPackages(paquetes) {
    const activePackages = paquetes.filter(p => {
        const estado = p.estado !== undefined ? p.estado : (p.Estado !== undefined ? p.Estado : 1);
        return Number(estado) === 1;
    });
    
    if (activePackages.length === 0) {
        this.refs.packagesGrid.innerHTML = '<div class="text-center py-6 text-muted font-semibold col-span-2">No hay paquetes disponibles.</div>';
        return;
    }

    this.refs.packagesGrid.className = "grid grid-cols-1 sm:grid-cols-2 gap-4 w-full box-border";
    
    this.refs.packagesGrid.innerHTML = activePackages.map(pkg => {
      const isSelected = this.currentData.selectedPackages.find(p => (p.id_paquete || p.IDPaquete) == (pkg.id_paquete || pkg.IDPaquete));
      let imgSrc = pkg.ImagenUrl || pkg.imagenUrl || pkg.Imagen || pkg.imagen || pkg.ImagenPaquete || null;
      if (imgSrc && typeof imgSrc === 'object' && imgSrc.type === 'Buffer') {
          imgSrc = String.fromCharCode.apply(null, imgSrc.data);
      }
      if (imgSrc === 'null') imgSrc = null;
      // Normalize filename-only or uploads path
      if (typeof imgSrc === 'string' && imgSrc.trim()) {
        imgSrc = imgSrc.trim();
        if (imgSrc.startsWith('/http')) imgSrc = imgSrc.substring(1);

        if (imgSrc.startsWith('http')) {
          // Keep absolute URL
        } else if (/^[\w\- .]+\.(png|jpg|jpeg|webp|gif)$/i.test(imgSrc)) {
          imgSrc = `/uploads/${imgSrc}`;
        } else if (imgSrc.toLowerCase().includes('uploads') && !imgSrc.startsWith('/')) {
          imgSrc = `/${imgSrc}`;
        }
      }
      const displayTitle = pkg.nombre || pkg.Nombre || pkg.NombrePaquete || 'Paquete';
      
      return `
        <div class="package-checkbox modern-package">
          <input type="checkbox" id="pkg_${pkg.id_paquete || pkg.IDPaquete}" 
                 class="package-check-input"
                 data-package-id="${pkg.id_paquete || pkg.IDPaquete}" 
                 ${isSelected ? 'checked' : ''}
                 style="position: absolute; opacity: 0; cursor: pointer;">
          <label for="pkg_${pkg.id_paquete || pkg.IDPaquete}" 
                 class="package-label ${isSelected ? 'selected' : ''}"
                 style="display: flex; flex-direction: column; cursor: pointer; border-radius: 16px; overflow: hidden; background: ${isSelected ? 'rgba(31, 106, 77, 0.05)' : 'white'}; border: 1px solid ${isSelected ? 'var(--brand)' : 'rgba(0,0,0,0.08)'}; box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: all 0.3s ease; height: 100%;">
            
            <div class="package-image" style="height: 120px; position: relative; background: #f9fafb;">
              ${imgSrc ? `<img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.style.display='none';">` : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 3rem; opacity: 0.4;">🎁</div>`}
              ${isSelected ? '<div class="checkmark" style="position: absolute; top: 10px; right: 10px; background: var(--brand); color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">✓</div>' : ''}
            </div>

            <div class="package-info" style="padding: 15px; display: flex; flex-direction: column; flex-grow: 1;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <h4 style="margin: 0; font-size: 1.1rem; color: var(--brand-deep); line-height: 1.2;">${displayTitle}</h4>
              </div>
              <p style="margin: 0 0 15px 0; font-size: 0.85rem; color: var(--muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4;">
                ${pkg.descripcion || pkg.Descripcion || 'Incluye servicios especiales para tu estadía.'}
              </p>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                <span class="package-price" style="font-weight: 700; color: var(--brand); font-size: 1.1rem;">$${this.formatCurrency(pkg.precio || pkg.Precio || 0)}</span>
                <span style="font-size: 0.8rem; background: var(--paper); padding: 4px 10px; border-radius: 20px; color: var(--muted);">Paquete</span>
              </div>
            </div>
          </label>
        </div>
      `;
    }).join('');

    // Add change handlers
    this.container.querySelectorAll('.package-check-input').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const pkgId = checkbox.dataset.packageId;
        const pkg = activePackages.find(p => (p.id_paquete || p.IDPaquete) == pkgId);
        
        if (checkbox.checked && pkg) {
          this.currentData.selectedPackages.push(pkg);
        } else {
          this.currentData.selectedPackages = this.currentData.selectedPackages.filter(p => (p.id_paquete || p.IDPaquete) != pkgId);
        }
        
        // Re-render to update visuals
        this.renderPackages(this.currentData.paquetes);
        this.calculateTotal();
      });
    });
  }

  // ─── helpers de imagen de servicio ──────────────────────────
  _resolveServiceImg(service) {
    const name = String(service.nombre || service.Nombre || service.NombreServicio || '').toLowerCase();
    const desc = String(service.descripcion || service.Descripcion || '').toLowerCase();
    const fullText = `${name} ${desc}`;
    let img = service.ImagenUrl || service.imagenUrl || service.Imagen || service.imagen || service.ImagenServicio || null;
    if (img && typeof img === 'object' && img.type === 'Buffer') img = String.fromCharCode.apply(null, img.data);
    if (!img || img === 'null') {
      if (fullText.includes('spa') || fullText.includes('masaje') || fullText.includes('relax')) img = getAppUrl('assets/images/service/SPA.png');
      else if (fullText.includes('caballo') || fullText.includes('cabalgata')) img = getAppUrl('assets/images/service/cabalgata.png');
      else if (fullText.includes('caminata') || fullText.includes('guiado') || fullText.includes('senderismo')) img = getAppUrl('assets/images/service/caminata.png');
      else img = getAppUrl('assets/images/service/SPA.png');
    }
    if (typeof img === 'string' && img.trim()) {
      img = img.trim();
      if (img.startsWith('/http')) img = img.substring(1);
      if (!img.startsWith('http') && /^[\w\- .]+\.(png|jpg|jpeg|webp|gif)$/i.test(img)) img = `/uploads/${img}`;
      else if (!img.startsWith('http') && img.toLowerCase().includes('uploads') && !img.startsWith('/')) img = `/${img}`;
    }
    return img;
  }

  _resolveServiceTitle(service) {
    let title = service.nombre || service.Nombre || service.NombreServicio || 'Servicio';
    if (title.toLowerCase() === 'servicio') {
      const full = `${title} ${service.descripcion || service.Descripcion || ''}`.toLowerCase();
      if (full.includes('spa') || full.includes('masaje')) title = 'Spa & Relajación';
      else if (full.includes('caballo') || full.includes('cabalgata')) title = 'Cabalgata Guiada';
      else if (full.includes('caminata') || full.includes('guiado')) title = 'Caminata Ecológica';
    }
    return title;
  }

  // Render services — con contador de personas por servicio
  renderServices(servicios) {
    const activeServices = servicios.filter(s => {
      const estado = s.estado !== undefined ? s.estado : (s.Estado !== undefined ? s.Estado : 1);
      return Number(estado) === 1;
    });

    if (!this.refs.servicesGrid) return;
    if (activeServices.length === 0) {
      this.refs.servicesGrid.innerHTML = '<div class="text-center py-6 text-muted font-semibold col-span-2">No hay servicios disponibles.</div>';
      return;
    }

    this.refs.servicesGrid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-4 w-full box-border';

    this.refs.servicesGrid.innerHTML = activeServices.map(service => {
      const svcId = service.id_servicio || service.IDServicio;
      const selected = this.currentData.selectedServices.find(s => (s.id_servicio || s.IDServicio) == svcId);
      const personas = selected ? (selected._personas || 1) : 1;
      const unitPrice = Number(service.precio || service.Precio || service.Costo || 0);
      const subtotalSvc = unitPrice * (selected ? personas : 0);
      const serviceImg = this._resolveServiceImg(service);
      const displayTitle = this._resolveServiceTitle(service);
      const isSelected = !!selected;

      return `
        <div class="service-checkbox modern-service" data-svc-id="${svcId}">
          <div style="display:flex; flex-direction:column; border-radius:16px; overflow:hidden;
                      background:${isSelected ? 'rgba(31,106,77,0.05)' : 'white'};
                      border:1px solid ${isSelected ? 'var(--brand)' : 'rgba(0,0,0,0.08)'};
                      box-shadow:0 2px 8px rgba(0,0,0,0.04); transition:all 0.3s ease; height:100%;">

            <!-- Imagen -->
            <div class="service-image" style="height:120px; position:relative;">
              <img src="${serviceImg}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'">
              ${isSelected ? '<div class="checkmark" style="position:absolute; top:10px; right:10px; background:var(--brand); color:white; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; box-shadow:0 2px 6px rgba(0,0,0,.2);">✓</div>' : ''}
            </div>

            <!-- Contenido -->
            <div style="padding:14px; display:flex; flex-direction:column; flex-grow:1; gap:8px;">
              <h4 style="margin:0; font-size:1rem; color:var(--brand-deep); line-height:1.2;">${displayTitle}</h4>
              <p style="margin:0; font-size:0.8rem; color:var(--muted); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.4;">
                ${service.descripcion || service.Descripcion || 'Servicio adicional para complementar tu estadía.'}
              </p>

              <!-- Precio por persona -->
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.82rem; color:var(--muted); margin-top:auto; padding-top:8px; border-top:1px solid rgba(0,0,0,.06);">
                <span>Precio/persona</span>
                <span style="font-weight:700; color:var(--brand);">$${this.formatCurrency(unitPrice)}</span>
              </div>

              <!-- Selección y contador de personas -->
              <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
                <!-- Toggle selección -->
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; flex:1;">
                  <input type="checkbox"
                    class="service-check-input"
                    data-service-id="${svcId}"
                    ${isSelected ? 'checked' : ''}
                    style="width:16px; height:16px; accent-color:var(--brand); cursor:pointer; flex-shrink:0;">
                  <span style="font-size:0.82rem; font-weight:600; color:var(--brand-deep);">Agregar</span>
                </label>

                <!-- Contador personas (solo activo si está seleccionado) -->
                <div class="svc-counter" data-svc-id="${svcId}"
                     style="display:${isSelected ? 'flex' : 'none'}; align-items:center; gap:4px;">
                  <button type="button" class="svc-dec"
                    data-svc-id="${svcId}"
                    style="width:28px; height:28px; border-radius:8px; border:1px solid rgba(0,0,0,.12); background:#f8fafc; font-size:1rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--brand-deep);">−</button>
                  <span class="svc-count-display" data-svc-id="${svcId}"
                    style="min-width:28px; text-align:center; font-weight:700; font-size:0.95rem; color:var(--brand-deep);">${personas}</span>
                  <button type="button" class="svc-inc"
                    data-svc-id="${svcId}"
                    style="width:28px; height:28px; border-radius:8px; border:1px solid rgba(0,0,0,.12); background:#f8fafc; font-size:1rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--brand-deep);">+</button>
                </div>
              </div>

              <!-- Subtotal del servicio -->
              <div class="svc-subtotal-row" data-svc-id="${svcId}"
                   style="display:${isSelected ? 'flex' : 'none'}; justify-content:space-between; align-items:center;
                          background:rgba(31,106,77,.06); border-radius:10px; padding:6px 10px; margin-top:2px;">
                <span style="font-size:0.78rem; color:var(--muted);">${personas} persona${personas !== 1 ? 's' : ''}</span>
                <strong style="font-size:0.9rem; color:var(--brand);">$${this.formatCurrency(subtotalSvc)}</strong>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // ─── Eventos checkbox de servicio ──────────────────────────
    this.container.querySelectorAll('.service-check-input').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const svcId = checkbox.dataset.serviceId;
        const service = activeServices.find(s => (s.id_servicio || s.IDServicio) == svcId);
        if (checkbox.checked && service) {
          if (!this.currentData.selectedServices.find(s => (s.id_servicio || s.IDServicio) == svcId)) {
            this.currentData.selectedServices.push({ ...service, _personas: 1 });
          }
          // Mostrar contador y subtotal
          const counter = this.refs.servicesGrid.querySelector(`.svc-counter[data-svc-id="${svcId}"]`);
          const subtotalRow = this.refs.servicesGrid.querySelector(`.svc-subtotal-row[data-svc-id="${svcId}"]`);
          if (counter) counter.style.display = 'flex';
          if (subtotalRow) subtotalRow.style.display = 'flex';
          // Actualizar visual del card
          const card = checkbox.closest('[data-svc-id] > div');
          if (card) { card.style.background = 'rgba(31,106,77,0.05)'; card.style.borderColor = 'var(--brand)'; }
          const imgDiv = checkbox.closest('[data-svc-id]')?.querySelector('.service-image');
          if (imgDiv && !imgDiv.querySelector('.checkmark')) {
            imgDiv.insertAdjacentHTML('beforeend', '<div class="checkmark" style="position:absolute;top:10px;right:10px;background:var(--brand);color:white;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;">✓</div>');
          }
        } else {
          this.currentData.selectedServices = this.currentData.selectedServices.filter(s => (s.id_servicio || s.IDServicio) != svcId);
          // Ocultar contador y subtotal
          const counter = this.refs.servicesGrid.querySelector(`.svc-counter[data-svc-id="${svcId}"]`);
          const subtotalRow = this.refs.servicesGrid.querySelector(`.svc-subtotal-row[data-svc-id="${svcId}"]`);
          if (counter) counter.style.display = 'none';
          if (subtotalRow) subtotalRow.style.display = 'none';
          const countEl = this.refs.servicesGrid.querySelector(`.svc-count-display[data-svc-id="${svcId}"]`);
          if (countEl) countEl.textContent = '1';
          const card = checkbox.closest('[data-svc-id] > div');
          if (card) { card.style.background = 'white'; card.style.borderColor = 'rgba(0,0,0,0.08)'; }
          const checkmark = checkbox.closest('[data-svc-id]')?.querySelector('.checkmark');
          if (checkmark) checkmark.remove();
        }
        this.calculateTotal();
      });
    });

    // ─── Botones +/- de personas ────────────────────────────────
    this.refs.servicesGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.svc-inc, .svc-dec');
      if (!btn) return;
      const svcId = btn.dataset.svcId;
      const selected = this.currentData.selectedServices.find(s => (s.id_servicio || s.IDServicio) == svcId);
      if (!selected) return;

      const isInc = btn.classList.contains('svc-inc');
      const maxPersonas = Number(selected.CapacidadMaxima || selected.CantidadMaximaPersonas || selected.capacidadMaxima || 20);
      if (isInc) {
        selected._personas = Math.min((selected._personas || 1) + 1, maxPersonas);
      } else {
        selected._personas = Math.max((selected._personas || 1) - 1, 1);
      }

      // Actualizar display sin re-renderizar todo
      const countEl = this.refs.servicesGrid.querySelector(`.svc-count-display[data-svc-id="${svcId}"]`);
      if (countEl) countEl.textContent = selected._personas;

      const unitPrice = Number(selected.precio || selected.Precio || selected.Costo || 0);
      const subtotalRow = this.refs.servicesGrid.querySelector(`.svc-subtotal-row[data-svc-id="${svcId}"]`);
      if (subtotalRow) {
        subtotalRow.querySelector('span').textContent = `${selected._personas} persona${selected._personas !== 1 ? 's' : ''}`;
        subtotalRow.querySelector('strong').textContent = `$${this.formatCurrency(unitPrice * selected._personas)}`;
      }
      this.calculateTotal();
    });
  }

  // Extract numeric status ID safely
  _extractStatusId(reserva) {
    if (!reserva) return '1';
    const rawEstado = reserva.Estado !== undefined ? reserva.Estado : (reserva.estado !== undefined ? reserva.estado : null);
    if (!rawEstado) return '1';
    if (typeof rawEstado === 'object') {
      return String(rawEstado.id || rawEstado.id_estado_reserva || rawEstado.IDEstado || rawEstado.Estado || '1');
    }
    return String(rawEstado);
  }

  // Render reservations table
  renderReservationsTable(reservas) {
    this.currentFilteredData = reservas;
    if (!this.refs.reservationsTableBody) return;
    
    // Validate current page bounds
    const totalPages = Math.ceil(reservas.length / this.itemsPerPage) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    const paginatedData = reservas.slice(start, end);
    
    if (!paginatedData.length) {
      this.refs.reservationsTableBody.innerHTML = '<tr><td colspan="7" class="px-6 py-8 text-center text-muted font-semibold">No hay reservas registradas.</td></tr>';
      this._renderPaginationControls(0);
      return;
    }

    this.refs.reservationsTableBody.innerHTML = paginatedData.map(reserva => {
      const clienteId = reserva.id_cliente || reserva.IDCliente || (reserva.cliente ? reserva.cliente.id : null);
      const cliente = clienteId ? this.currentData.clientes.find(c => (c.id_cliente || c.IDCliente || c.NroDocumento || c.nro_documento) == clienteId) : (reserva.cliente || null);
      
      const habitacionId = reserva.id_habitacion || reserva.IDHabitacion || (reserva.habitacion ? reserva.habitacion.id : null);
      const habitacion = habitacionId ? this.currentData.habitaciones.find(h => (h.id_habitacion || h.IDHabitacion) == habitacionId) : (reserva.habitacion || null);
      const status = this._extractStatusId(reserva);
      const resId = reserva.id_reserva || reserva.IDReserva || reserva.IdReserva || reserva.id || 'null';
      
      return `
      <tr class="hover:bg-gray-50/50 transition-all duration-200">
        <td class="px-6 py-4 font-bold text-gray-400">#${resId}</td>
        <td class="px-6 py-4">
            <div class="text-sm font-semibold text-brand-deep">${cliente ? (cliente.NombreCompleto || `${cliente.Nombre || ''} ${cliente.Apellido || ''}`.trim() || 'Cliente sin nombre') : reserva.nr_documento || "Sin cliente"}</div>
            <div class="text-xs text-muted mt-0.5">${cliente ? (cliente.Email || '') : ''}</div>
        </td>
        <td class="px-6 py-4">
            <span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">${habitacion ? (habitacion.NombreHabitacion || habitacion.nombre || habitacion.numero || habitacion.Numero || 'N/A') : "---"}</span>
        </td>
        <td class="px-6 py-4">
            <div class="text-xs font-semibold text-brand-deep">${reserva.fecha_inicio || "--"}</div>
        </td>
        <td class="px-6 py-4">
            <div class="text-xs font-semibold text-brand-deep">${reserva.fecha_fin || "--"}</div>
        </td>
        <td class="px-6 py-4">
            <div class="flex items-center gap-4">
              <!-- Switch de Estado (ON = Activa, OFF = Cancelada/Pendiente) -->
              <label class="relative inline-block w-11 h-6 m-0 cursor-pointer shrink-0" data-tooltip="Alternar entre Activa y Cancelada">
                <input type="checkbox" class="sr-only peer" ${String(status) === '1' ? 'checked' : ''} 
                       ${(String(status) === '4' || String(status) === '5' || String(status) === '3') ? 'disabled' : ''}
                       onchange="window.reservasModule.changeStatusFromTable(${resId}, this.checked ? '1' : '2')">
                <span class="absolute inset-0 rounded-full ${(String(status) === '4' || String(status) === '5' || String(status) === '3') ? 'bg-slate-300' : 'bg-slate-200'} peer-checked:bg-emerald-500 transition-colors duration-300 before:content-[''] before:absolute before:h-[18px] before:w-[18px] before:left-[3px] before:bottom-[3px] before:bg-white before:rounded-full before:transition-transform before:duration-300 peer-checked:before:translate-x-5"></span>
              </label>
              <!-- Badge Semántico Visual -->
              <span class="${getStatusClass(status)}">
                ${getStatusText(status)}
              </span>
            </div>
        </td>
        <td class="px-6 py-4 font-bold text-brand">$${this.formatCurrency(reserva.total || 0)}</td>
        <td class="px-6 py-4">
          <div class="action-group-modern justify-center">
            <button class="btn-action-modern view" 
                    onclick="window.reservasModule.verDetalleReserva(${resId})" 
                    title="Ver detalle"><i class="fa-solid fa-eye"></i></button>
            <button class="btn-action-modern edit" 
                    onclick="window.reservasModule.editReserva(${resId})" 
                    title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-action-modern delete" 
                  onclick="window.reservasModule.deleteReserva(${resId})" 
                  title="Anular"><i class="fa-solid fa-ban"></i></button>
          </div>
        </td>
      </tr>
    `;
    }).join('');
    
    this._renderPaginationControls(totalPages);
  }

  _renderPaginationControls(totalPages) {
    const table = this.container.querySelector("table");
    const tableWrapper = table ? table.closest('.table-container') || table.parentElement : null;
    if (!tableWrapper) return;
    
    let paginationDiv = this.container.querySelector('#paginationContainer');
    if (!paginationDiv) {
      paginationDiv = document.createElement('div');
      paginationDiv.id = 'paginationContainer';
      paginationDiv.className = 'flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-white';
      tableWrapper.parentElement.insertBefore(paginationDiv, tableWrapper.nextSibling);
    }
    
    if (totalPages <= 1) {
      paginationDiv.innerHTML = '';
      return;
    }
    
    let buttonsHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const activeClass = i === this.currentPage ? 'bg-brand text-white border-brand' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50';
        buttonsHTML += `<button onclick="window.reservasModule.goToPage(${i})" class="w-8 h-8 flex items-center justify-center rounded-lg border font-semibold text-xs cursor-pointer transition-colors ${activeClass}">${i}</button>`;
    }
    
    paginationDiv.innerHTML = `
      <span class="text-xs text-muted font-semibold">Página ${this.currentPage} de ${totalPages}</span>
      <div class="flex gap-1">${buttonsHTML}</div>
    `;
  }
  
  goToPage(page) {
    this.currentPage = page;
    this.renderReservationsTable(this.currentFilteredData);
  }

  // Update metrics
  updateMetrics() {
    const today = this._todayLocal();
    const todayReservations = this.currentData.reservas.filter(r => {
      const d = this._normDate(r.fecha_inicio || r.FechaInicio || '');
      return d === today;
    });
    const activeReservations = this.currentData.reservas.filter(r => this._extractStatusId(r) === '1');
    const monthlyIncome = this.currentData.reservas.reduce((sum, r) => sum + Number(r.total || 0), 0);

    if (this.refs.totalReservations) this.refs.totalReservations.textContent = this.currentData.reservas.length;
    if (this.refs.activeReservations) this.refs.activeReservations.textContent = activeReservations.length;
    if (this.refs.todayReservations) this.refs.todayReservations.textContent = todayReservations.length;
    if (this.refs.monthlyRevenue) this.refs.monthlyRevenue.textContent = `$${this.formatCurrency(monthlyIncome)}`;
  }

  // Calculate total and update summary sidebar
  calculateTotal() {
    let subtotal = 0;
    
    // UI Refs for summary
    const summaryRoom = this.container.querySelector('#summaryRoom');
    const summaryPackages = this.container.querySelector('#summaryPackages');
    const summaryServices = this.container.querySelector('#summaryServices');
    
    // Noches calculation & validations
    let noches = 0;
    let fechasStr = '';
    const startDateVal = this.refs.fechaInicio?.value;
    const endDateVal = this.refs.fechaFin?.value;
    let isValidDate = true;
    
    if (startDateVal && endDateVal) {
      const today = this._todayLocal();
      if (startDateVal < today) {
        isValidDate = false;
        fechasStr = `<p style="font-size: 0.85rem; color: #dc2626; font-weight: bold; margin: 4px 0;">⚠️ La fecha de entrada no puede ser pasada.</p>`;
      } else if (startDateVal >= endDateVal) {
        isValidDate = false;
        fechasStr = `<p style="font-size: 0.85rem; color: #dc2626; font-weight: bold; margin: 4px 0;">⚠️ La salida debe ser posterior a la entrada.</p>`;
      } else {
        // Calcular noches usando split en partes para evitar UTC shift
        const [y1, m1, d1] = startDateVal.split('-').map(Number);
        const [y2, m2, d2] = endDateVal.split('-').map(Number);
        const dateA = new Date(y1, m1 - 1, d1);
        const dateB = new Date(y2, m2 - 1, d2);
        noches = Math.round((dateB - dateA) / (1000 * 60 * 60 * 24));
        fechasStr = `<p style="font-size: 0.8rem; color: var(--brand); margin: 4px 0;">Entrada: <strong>${startDateVal}</strong> | Salida: <strong>${endDateVal}</strong><br>Total noches: <strong>${noches}</strong></p>`;
      }
    }
    
    // Room price and overlapping validation
    if (this.currentData.selectedRoom) {
      // check overlapping
      if (isValidDate && startDateVal && endDateVal) {
        const isOverlapping = (start1, end1, start2, end2) => start1 < end2 && start2 < end1;
        const currentRoomId = String(this.currentData.selectedRoom.id_habitacion || this.currentData.selectedRoom.IDHabitacion);
        const conflictingRoom = this.currentData.reservas.find(r => {
            if (this._extractStatusId(r) === '2') return false;
            const rRoomId = String(r.id_habitacion || r.IDHabitacion || (r.habitacion ? r.habitacion.id : null));
            const fIn = r.fecha_inicio || r.FechaInicio || r.fecha_reserva;
            const fOut = r.fecha_fin || r.FechaFin || r.fecha_salida;
            if (rRoomId === currentRoomId && fIn && fOut) {
               return isOverlapping(startDateVal, endDateVal, fIn, fOut);
            }
            return false;
        });
        if (conflictingRoom) {
           fechasStr += `<p style="font-size: 0.85rem; color: #dc2626; font-weight: bold; margin: 4px 0;">⚠️ Esta habitación ya está reservada en estas fechas.</p>`;
        }
        
        // check client overlap
        const currentClientId = String(this.refs.clienteSelect?.value || '');
        if (currentClientId) {
          const conflictingClient = this.currentData.reservas.find(r => {
              if (this._extractStatusId(r) === '2') return false;
              const rClientId = String(r.id_cliente || r.IDCliente || (r.cliente ? r.cliente.id : null));
              const fIn = r.fecha_inicio || r.FechaInicio || r.fecha_reserva;
              const fOut = r.fecha_fin || r.FechaFin || r.fecha_salida;
              if (rClientId === currentClientId && fIn && fOut) {
                 return isOverlapping(startDateVal, endDateVal, fIn, fOut);
              }
              return false;
          });
          if (conflictingClient) {
             fechasStr += `<p style="font-size: 0.85rem; color: #dc2626; font-weight: bold; margin: 4px 0;">⚠️ El huésped seleccionado ya tiene una reserva en estas fechas.</p>`;
          }
        }
      }

      // Update flatpickr disabled dates for the selected room
      if (this.fpInicio && this.fpFin) {
        const currentRoomId = String(this.currentData.selectedRoom.id_habitacion || this.currentData.selectedRoom.IDHabitacion);
        const disabledRanges = this.currentData.reservas
            .filter(r => {
                const isCancelled = this._extractStatusId(r) === '2';
                const rRoomId = String(r.id_habitacion || r.IDHabitacion || (r.habitacion ? r.habitacion.id : null));
                return !isCancelled && rRoomId === currentRoomId;
            })
            .map(r => ({
                from: r.fecha_inicio || r.FechaInicio || r.fecha_reserva,
                to: r.fecha_fin || r.FechaFin || r.fecha_salida
            }))
            .filter(range => range.from && range.to);
            
        this.fpInicio.set('disable', disabledRanges);
        this.fpFin.set('disable', disabledRanges);
      }

      const room = this.currentData.selectedRoom;
      const roomPrice = Number(room.precio || room.Precio || room.Costo || room.costo || 0);
      const totalRoom = noches > 0 ? roomPrice * noches : 0;
      subtotal += totalRoom;
      
      if (summaryRoom) {
        summaryRoom.innerHTML = `
          <div class="summary-item-details">
            <h5 style="color: var(--brand-deep); font-size: 1.1rem; margin-bottom: 4px;">${room.numero || room.Numero || 'Habitación'} - ${room.tipo || room.Tipo || room.NombreHabitacion || 'Estándar'}</h5>
            ${fechasStr}
            <p style="font-size: 0.85rem; color: var(--muted); margin-bottom: 8px; line-height: 1.4;">
              Precio por noche: $${this.formatCurrency(roomPrice)}
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.85rem; background: var(--paper); padding: 2px 8px; border-radius: 12px; color: var(--brand);">👤 ${ (String(room.tipo || room.Tipo || room.NombreHabitacion || '').toLowerCase().includes('familiar')) ? 5 : (room.capacidad || room.Capacidad || 2) } Pers.</span>
              <strong style="color: var(--brand); font-size: 1rem;">$${this.formatCurrency(totalRoom)}</strong>
            </div>
          </div>
        `;
      }
    } else {
      if (summaryRoom) {
        summaryRoom.innerHTML = '<p class="empty-state-small">No has seleccionado habitación</p>';
      }
    }
    
    // Package prices
    if (this.currentData.selectedPackages.length > 0) {
      let pkgHtml = '';
      this.currentData.selectedPackages.forEach(pkg => {
        if (pkg) {
          const pkgPrice = Number(pkg.precio || pkg.Precio || pkg.Costo || pkg.costo || pkg.precio_unitario || pkg.PrecioUnitario || 0);
          subtotal += pkgPrice;
          pkgHtml += `
            <div class="summary-item" style="padding: 12px; margin-bottom: 10px;">
              <div class="summary-item-details" style="width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
                  <h5 style="font-size: 0.95rem; color: var(--brand-deep); margin: 0;">${pkg.nombre || pkg.Nombre || 'Paquete'}</h5>
                  <strong style="color: var(--brand);">$${this.formatCurrency(pkgPrice)}</strong>
                </div>
                <p style="font-size: 0.8rem; color: var(--muted); margin: 0; line-height: 1.3;">
                  ${pkg.descripcion || pkg.Descripcion || 'Incluye servicios exclusivos diseñados para mejorar tu experiencia.'}
                </p>
              </div>
            </div>
          `;
        }
      });
      if (summaryPackages) summaryPackages.innerHTML = pkgHtml;
    } else {
      if (summaryPackages) {
        summaryPackages.innerHTML = '<p class="empty-state-small">Ningún paquete seleccionado</p>';
      }
    }
    
    // Service prices — precio × personas
    if (this.currentData.selectedServices.length > 0) {
      let svcHtml = '';
      this.currentData.selectedServices.forEach(service => {
        if (!service) return;
        const unitPrice = Number(service.precio || service.Precio || service.Costo || service.costo || 0);
        const personas = Number(service._personas || 1);
        const svcTotal = unitPrice * personas;
        subtotal += svcTotal;
        const svcTitle = this._resolveServiceTitle(service);
        svcHtml += `
          <div class="summary-item" style="padding:8px 12px; margin-bottom:6px; background:rgba(0,0,0,0.02); border-radius:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.9rem; font-weight:600; color:var(--brand-deep);">${svcTitle}</span>
              <span style="font-weight:700; font-size:0.9rem; color:var(--brand);">$${this.formatCurrency(svcTotal)}</span>
            </div>
            <p style="font-size:0.75rem; color:var(--muted); margin:3px 0 0 0;">
              $${this.formatCurrency(unitPrice)} × ${personas} persona${personas !== 1 ? 's' : ''}
            </p>
          </div>
        `;
      });
      if (summaryServices) summaryServices.innerHTML = svcHtml;
    } else {
      if (summaryServices) summaryServices.innerHTML = '<p class="empty-state-small">Ningún servicio seleccionado</p>';
    }
    
    if (this.refs.subtotal) this.refs.subtotal.textContent = `$${this.formatCurrency(subtotal)}`;
    if (this.refs.totalAmount) this.refs.totalAmount.textContent = `$${this.formatCurrency(subtotal)}`;
  }

  // Clear form
  clearForm() {
    if (this.refs.documentoInput) this.refs.documentoInput.value = '';
    if (this.refs.nombreClienteReadOnly) this.refs.nombreClienteReadOnly.value = '';
    if (this.refs.clienteSelect) this.refs.clienteSelect.value = '';

    if (this.refs.reservationForm) this.refs.reservationForm.reset();
    this.currentData.selectedRoom = null;
    this.currentData.selectedPackages = [];
    this.currentData.selectedServices = [];
    this.container.querySelectorAll('.room-card').forEach(card => card.classList.remove('selected'));
    this.container.querySelectorAll('.package-checkbox input').forEach(cb => cb.checked = false);
    this.container.querySelectorAll('.service-checkbox input').forEach(cb => cb.checked = false);
    
    // reset flatpickr disabled ranges
    if (this.fpInicio && this.fpFin) {
       this.fpInicio.set('disable', []);
       this.fpFin.set('disable', []);
    }
    
    this.calculateTotal();
  }

  // ─── Init Flatpickr ────────────────────────────────────────────
  // Configuración robusta con locale español (el script l10n/es.js
  // ya está cargado en el HTML → flatpickr.l10ns.es disponible).
  initFlatpickr() {
    if (!window.flatpickr) return;

    const todayLocal = this._todayLocal();
    // Usar locale español si está disponible (cargado vía l10n/es.js)
    const esLocale = (window.flatpickr.l10ns && window.flatpickr.l10ns.es) || undefined;

    const commonOpts = {
      dateFormat: 'Y-m-d',
      minDate: todayLocal,
      disableMobile: false,
      ...(esLocale ? { locale: esLocale } : {})
    };

    if (this.refs.fechaInicio && this.refs.fechaFin) {
      this.fpInicio = flatpickr(this.refs.fechaInicio, {
        ...commonOpts,
        onChange: (selectedDates, dateStr) => {
          if (dateStr) {
            const minEnd = this._addDays(dateStr, 1);
            if (this.fpFin) {
              this.fpFin.set('minDate', minEnd);
              const curEnd = this.fpFin.selectedDates[0];
              if (curEnd) {
                // Comparamos en zona local
                const curEndStr = [
                  curEnd.getFullYear(),
                  String(curEnd.getMonth() + 1).padStart(2, '0'),
                  String(curEnd.getDate()).padStart(2, '0')
                ].join('-');
                if (curEndStr <= dateStr) this.fpFin.clear();
              }
              setTimeout(() => this.fpFin.open(), 80);
            }
          }
          this.calculateTotal();
        }
      });

      this.fpFin = flatpickr(this.refs.fechaFin, {
        ...commonOpts,
        minDate: this._addDays(todayLocal, 1),
        onChange: () => this.calculateTotal()
      });
    }
  }


  // Bloquear fechas ocupadas para la habitación seleccionada.
  // Excluye reservas canceladas (estado 2) y anuladas (estado 3).
  bloquearFechasOcupadas(idHabitacion) {
    if (!this.fpInicio || !this.fpFin || !this.currentData.reservas) return;

    const CANCELLED = new Set(['2', '3', 'cancelada', 'cancelado', 'anulada', 'anulado']);

    const fechasOcupadas = this.currentData.reservas
      .filter(r => {
        const estado = String(
          r.id_estado_reserva || r.Estado || r.estado || '1'
        ).toLowerCase();
        if (CANCELLED.has(estado)) return false;
        const idHab = r.id_habitacion || r.IDHabitacion || (r.habitacion ? r.habitacion.id : null);
        return String(idHab) === String(idHabitacion);
      })
      .map(r => ({
        from: this._normDate(r.fecha_inicio || r.FechaInicio || r.fecha_reserva),
        to:   this._normDate(r.fecha_fin   || r.FechaFin   || r.fecha_salida)
      }))
      .filter(range => range.from && range.to);

    this.fpInicio.set('disable', fechasOcupadas);
    this.fpFin.set('disable', fechasOcupadas);
  }

  // Show reservation form
  showReservationForm() {
    if (this.refs.reservationsListSection) this.refs.reservationsListSection.style.display = 'none';
    if (this.refs.editReservationSection) this.refs.editReservationSection.style.display = 'none';
    if (this.refs.reservationFormSection) this.refs.reservationFormSection.style.display = 'block';
    this.clearForm();
    // Ensure module is globally available for onclick handlers
    window.reservasModule = this;
  }

  // Show reservations list
  showReservationsList() {
    if (this.refs.reservationFormSection) this.refs.reservationFormSection.style.display = 'none';
    if (this.refs.editReservationSection) this.refs.editReservationSection.style.display = 'none';
    if (this.refs.reservationsListSection) this.refs.reservationsListSection.style.display = 'block';
    // Ensure module is globally available for onclick handlers
    window.reservasModule = this;
  }


    // Render charts using Chart.js
  renderCharts() {
  // Ensure container has canvases
  const chartDayCanvas = this.container.querySelector('#chartReservationsByDay');
  const chartStatusCanvas = this.container.querySelector('#chartStatusDistribution');
  const chartRevenueCanvas = this.container.querySelector('#chartRevenueTrend');
  if (!chartDayCanvas || !chartStatusCanvas || !chartRevenueCanvas) return;

  // Destroy previous charts if exist
  if (this.charts) {
    Object.values(this.charts).forEach(c => { if (c && typeof c.destroy === 'function') c.destroy(); });
  }
  this.charts = {};

  // Helper to format dates
  const formatDate = d => new Date(d).toISOString().split('T')[0];

  // 1. Reservations by Day (Bar Chart)
  const reservationsByDayMap = {};
  this.currentData.reservas.forEach(r => {
    const date = formatDate(r.fecha_inicio || r.FechaInicio || r.fecha || r.fecha_reserva);
    if (date) {
      reservationsByDayMap[date] = (reservationsByDayMap[date] || 0) + 1;
    }
  });
  const sortedDays = Object.keys(reservationsByDayMap).sort();
  const dayLabels = sortedDays;
  const dayCounts = sortedDays.map(d => reservationsByDayMap[d]);
  this.charts.dayChart = new Chart(chartDayCanvas, {
    type: 'bar',
    data: {
      labels: dayLabels,
      datasets: [{
        label: 'Reservas por día',
        data: dayCounts,
        backgroundColor: 'rgba(31,106,77,0.6)',
        borderColor: 'rgba(31,106,77,1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { title: { display: true, text: 'Fecha' } },
        y: { beginAtZero: true, title: { display: true, text: 'Cantidad' } }
      }
    }
  });

  // 2. Status Distribution (Pie Chart)
  const statusCounts = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  this.currentData.reservas.forEach(r => {
    const status = this._extractStatusId(r);
    if (statusCounts[status] !== undefined) statusCounts[status]++;
    else statusCounts['1']++;
  });
  const statusLabels = ['Activa', 'Cancelada', 'Finalizada', 'Rechazada', 'Pendiente'];
  const statusData = [statusCounts['1'], statusCounts['2'], statusCounts['3'], statusCounts['4'], statusCounts['5']];
  const statusColors = ['rgba(16,185,129,0.6)', 'rgba(239,68,68,0.6)', 'rgba(59,130,246,0.6)', 'rgba(99,102,241,0.6)', 'rgba(245,158,11,0.6)'];
  this.charts.statusChart = new Chart(chartStatusCanvas, {
    type: 'pie',
    data: {
      labels: statusLabels,
      datasets: [{ data: statusData, backgroundColor: statusColors }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  // 3. Revenue Trend (Line Chart)
  const revenueByDay = {};
  this.currentData.reservas.forEach(r => {
    const date = formatDate(r.fecha_inicio || r.FechaInicio || r.fecha || r.fecha_reserva);
    const amount = Number(r.total || r.Total || r.monto || 0);
    if (date) {
      revenueByDay[date] = (revenueByDay[date] || 0) + amount;
    }
  });
  const revSortedDays = Object.keys(revenueByDay).sort();
  const revLabels = revSortedDays;
  const revValues = revSortedDays.map(d => revenueByDay[d]);
  this.charts.revenueChart = new Chart(chartRevenueCanvas, {
    type: 'line',
    data: {
      labels: revLabels,
      datasets: [{
        label: 'Ingresos diarios',
        data: revValues,
        borderColor: 'var(--brand)',
        backgroundColor: 'rgba(0,0,0,0)',
        tension: 0.3,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } }
    }
  });
}
    
  // Setup event listeners
  setupEventListeners() {
    // Show form button
    if (this.refs.showReservationFormBtn) {
      this.refs.showReservationFormBtn.addEventListener('click', () => this.showReservationForm());
    }
    
    // Cancel form button
    if (this.refs.cancelNewReservationBtn) {
      this.refs.cancelNewReservationBtn.addEventListener('click', () => this.showReservationsList());
    }
    
    // Clear form button
    if (this.refs.clearFormBtn) {
      this.refs.clearFormBtn.addEventListener('click', () => this.clearForm());
    }

    // Real-time calculation triggers
    if (this.refs.fechaInicio) {
      this.refs.fechaInicio.addEventListener('change', () => this.calculateTotal());
    }
    if (this.refs.fechaFin) {
      this.refs.fechaFin.addEventListener('change', () => this.calculateTotal());
    }
    if (this.refs.clienteSelect) {
      this.refs.clienteSelect.addEventListener('change', () => this.calculateTotal());
    }
    
   // Form submission
if (this.refs.reservationForm) {
  this.refs.reservationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      // <i class="fa-solid fa-circle text-red-500 mr-1"></i> VALIDACIONES
      if (!this.currentData.selectedRoom) {
        throw new Error('Selecciona una habitación');
      }

      if (!this.options.isClientMode && !this.refs.clienteSelect.value) {
        throw new Error('Selecciona un cliente');
      }

      const metodoPagoValue = this.refs.metodoPago.value;

      if (!metodoPagoValue) {
        throw new Error('Selecciona un método de pago válido');
      }

      const estadoValue = this.refs.estadoReserva.value;

      if (!estadoValue) {
        throw new Error('Selecciona un estado de reserva');
      }

      const startDate = this.refs.fechaInicio.value;
      const endDate = this.refs.fechaFin.value;
      const today = new Date().toISOString().split('T')[0];
      if (!startDate || !endDate) {
          throw new Error('Selecciona fechas de entrada y salida válidas');
      }
      if (startDate < today) {
          throw new Error('No se permiten fechas pasadas');
      }
      if (startDate >= endDate) {
          throw new Error('La fecha de salida debe ser mayor a la fecha de entrada');
      }

      const isOverlapping = (start1, end1, start2, end2) => start1 < end2 && start2 < end1;

      const conflictingRoom = this.currentData.reservas.find(r => {
          if (this._extractStatusId(r) === '2') return false;
          const rRoomId = String(r.id_habitacion || r.IDHabitacion || (r.habitacion ? r.habitacion.id : null));
          const currentRoomId = String(this.currentData.selectedRoom.id_habitacion || this.currentData.selectedRoom.IDHabitacion);
          const fIn = r.fecha_inicio || r.FechaInicio || r.fecha_reserva;
          const fOut = r.fecha_fin || r.FechaFin || r.fecha_salida;
          if (rRoomId === currentRoomId && fIn && fOut) {
             return isOverlapping(startDate, endDate, fIn, fOut);
          }
          return false;
      });

      if (conflictingRoom) {
          throw new Error('La habitación seleccionada ya tiene una reserva en esas fechas');
      }

      if (!this.options.isClientMode) {
          const conflictingClient = this.currentData.reservas.find(r => {
              if (this._extractStatusId(r) === '2') return false;
              const rClientId = String(r.id_cliente || r.IDCliente || (r.cliente ? r.cliente.id : null));
              const currentClientId = String(this.refs.clienteSelect.value);
              const fIn = r.fecha_inicio || r.FechaInicio || r.fecha_reserva;
              const fOut = r.fecha_fin || r.FechaFin || r.fecha_salida;
              if (rClientId === currentClientId && fIn && fOut) {
                 return isOverlapping(startDate, endDate, fIn, fOut);
              }
              return false;
          });

          if (conflictingClient) {
              throw new Error('Este cliente ya tiene una reserva solapada en esas fechas');
          }
      }

      const totalAmount = Number(this.refs.totalAmount.textContent.replace(/\D/g, ''));
      const conf = await Swal.fire({
         title: 'Resumen de la Reserva',
         html: `
            <div style="text-align: left; font-size: 0.9rem;">
                <p><strong>Habitación:</strong> ${this.currentData.selectedRoom.tipo || this.currentData.selectedRoom.NombreHabitacion}</p>
                <p><strong>Fechas:</strong> ${startDate} a ${endDate}</p>
                <p><strong>Paquetes:</strong> ${this.currentData.selectedPackages.length}</p>
                <p><strong>Servicios:</strong> ${this.currentData.selectedServices.length}</p>
                <hr>
                <p style="font-size: 1.2rem; text-align: right; margin-top: 10px;"><strong>Total Estimado: $${this.formatCurrency(totalAmount)}</strong></p>
            </div>
         `,
         icon: 'info',
         showCancelButton: true,
         confirmButtonText: 'Guardar Reserva',
         cancelButtonText: 'Revisar'
      });
      
      if (!conf.isConfirmed) return;

      const formData = {
        id_cliente: this.options.isClientMode ? null : parseInt(this.refs.clienteSelect.value),
        id_habitacion: this.currentData.selectedRoom.id_habitacion || this.currentData.selectedRoom.IDHabitacion,
        fecha_inicio: this.refs.fechaInicio.value,
        fecha_fin: this.refs.fechaFin.value,
        hora_entrada: this.refs.horaEntrada.value || '14:00',
        hora_salida: this.refs.horaSalida.value || '12:00',

        // <i class="fa-solid fa-check"></i> AQUÍ ESTÁ EL FIX REAL - CAMPO CORRECTO PARA BACKEND
        id_metodo_pago: parseInt(this.refs.metodoPago.value),

        estado: parseInt(this.refs.estadoReserva.value),

        total: totalAmount,

        paquetes: this.currentData.selectedPackages
          .map(p => p.id_paquete || p.IDPaquete)
          .filter(Boolean),

        servicios: this.currentData.selectedServices
          .map(s => s.id_servicio || s.IDServicio)
          .filter(Boolean)
      };

      console.log(' DATA FINAL:', formData);
      console.log(' FECHAS ENVIADAS:', {
        fecha_inicio: this.refs.fechaInicio.value,
        fecha_fin: this.refs.fechaFin.value,
        fecha_hoy: new Date().toISOString().slice(0, 10)
      });

      // PETICIÓN
      const result = await crearReserva(formData);

      showAlert('Información', 'Reserva creada correctamente', 'info');

      if (this.options.onSaveSuccess) {
          this.options.onSaveSuccess(result);
      } else {
          // <i class="fa-solid fa-rotate-right"></i> RECARGAR
          await this.reloadData();
          this.renderReservationsTable(this.currentData.reservas);
          this.updateMetrics();
          this.showReservationsList();
      }

    } catch (error) {
      console.error('<i class="fa-solid fa-xmark"></i> Error:', error);
      showAlert('Error', error.message || 'Error al crear reserva', 'error');
    }
  });
}

    // Search and filter
    if (this.refs.searchReservations) {
      this.refs.searchReservations.addEventListener('input', () => this.filterReservations());
    }
    
    if (this.refs.filterStatus) {
      this.refs.filterStatus.addEventListener('change', () => this.filterReservations());
    }
    
    // Edit and delete buttons
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('edit-btn')) {
        const id = e.target.dataset.id;
        this.editReserva(id);
      } else if (e.target.classList.contains('delete-btn')) {
        const id = e.target.dataset.id;
        this.deleteReserva(id);
      }
    });
  }

  // Filter reservations
  filterReservations() {
    if (!this.refs.searchReservations || !this.refs.filterStatus) return;
    
    const searchTerm = this.refs.searchReservations.value.toLowerCase();
    const statusFilter = this.refs.filterStatus.value;

    const filtered = this.currentData.reservas.filter(reserva => {
      const clienteId = reserva.id_cliente || reserva.IDCliente || (reserva.cliente ? reserva.cliente.id : null);
      const cliente = clienteId ? this.currentData.clientes.find(c => (c.id_cliente || c.IDCliente || c.NroDocumento || c.nro_documento) == clienteId) : (reserva.cliente || null);
      
      const habitacionId = reserva.id_habitacion || reserva.IDHabitacion || (reserva.habitacion ? reserva.habitacion.id : null);
      const habitacion = habitacionId ? this.currentData.habitaciones.find(h => (h.id_habitacion || h.IDHabitacion) == habitacionId) : (reserva.habitacion || null);
      
      const clienteName = cliente ? (cliente.NombreCompleto || `${cliente.Nombre || cliente.Nombres || ''} ${cliente.Apellido || cliente.Apellidos || ''}`.trim() || '').toLowerCase() : '';
      const clienteDoc = cliente ? (cliente.NroDocumento || cliente.nro_documento || '').toLowerCase() : '';
      const habitacionNumber = habitacion ? (habitacion.NombreHabitacion || habitacion.nombre || habitacion.numero || habitacion.Numero || '').toLowerCase() : '';
      
      const matchesSearch = !searchTerm || 
        clienteName.includes(searchTerm) ||
        clienteDoc.includes(searchTerm) ||
        habitacionNumber.includes(searchTerm) ||
        (reserva.id_reserva && reserva.id_reserva.toString().includes(searchTerm));
      
      const matchesStatus = !statusFilter || this._extractStatusId(reserva) == statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    this.currentPage = 1;
    this.renderReservationsTable(filtered);
  }

  // Helper functions
  formatCurrency(value) {
    return formatCurrency(value);
  }

  // Change status directly from table
  async changeStatusFromTable(id, newStatus) {
    try {
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('ID de reserva no válido');
      }
      const reserva = this.currentData.reservas.find(r => (r.id_reserva || r.IDReserva || r.IdReserva || r.id) == id);
      if (!reserva) throw new Error('Reserva no encontrada');

      console.log(`Cambiando estado de reserva ${id} a ${newStatus}`);
      
      // Safe gathering of packages and services IDs to avoid resetting them on backend side
      const packagesIds = Array.isArray(reserva.paquetes) ? reserva.paquetes.map(p => p.id_paquete || p.IDPaquete || p.id || p) : [];
      const servicesIds = Array.isArray(reserva.servicios) ? reserva.servicios.map(s => s.id_servicio || s.IDServicio || s.id || s) : [];

      const formData = {
        id_cliente: parseInt(reserva.id_cliente || (reserva.cliente ? reserva.cliente.id : null)),
        id_habitacion: parseInt(reserva.id_habitacion || (reserva.habitacion ? reserva.habitacion.id : null)),
        fecha_inicio: reserva.fecha_inicio || reserva.FechaInicio,
        fecha_fin: reserva.fecha_fin || reserva.FechaFin,
        hora_entrada: reserva.hora_entrada || reserva.HoraEntrada || '14:00',
        hora_salida: reserva.hora_salida || reserva.HoraSalida || '12:00',
        id_metodo_pago: parseInt(reserva.id_metodo_pago || (reserva.metodoPago ? reserva.metodoPago.id : 1)),
        id_estado_reserva: parseInt(newStatus),
        total: parseFloat(reserva.total || 0),
        paquetes: packagesIds.filter(Boolean),
        servicios: servicesIds.filter(Boolean)
      };

      await actualizarReserva(id, formData);
      showAlert('Información', 'Estado de reserva actualizado con éxito', 'info');
      
      // Actualizar datos locales y re-renderizar
      await this.reloadData();
      this.renderReservationsTable(this.currentData.reservas);
      this.updateMetrics();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      Swal.fire('Error', 'No se pudo actualizar el estado de la reserva: ' + (error.message || 'Error desconocido'), 'error');
      // Re-renderizar para revertir el cambio visual en el select si falló
      this.renderReservationsTable(this.currentData.reservas);
    }
  }

  // View details of reservation in premium modal
  verDetalleReserva(id) {
    if (!id || id === 'undefined' || id === 'null') {
      Swal.fire('Error', 'ID de reserva no válido', 'error');
      return;
    }
    const reserva = this.currentData.reservas.find(r => (r.id_reserva || r.IDReserva || r.IdReserva || r.id) == id);
    if (!reserva) {
      Swal.fire('', 'Reserva no encontrada', 'info');
      return;
    }

    const cliente = this.currentData.clientes.find(c => (c.id_cliente || c.IDCliente) == reserva.id_cliente);
    const habitacionId = reserva.id_habitacion || (reserva.habitacion ? reserva.habitacion.id : null);
    let habitacion = this.currentData.habitaciones.find(h => (h.id_habitacion || h.IDHabitacion) == habitacionId);
    if (!habitacion && reserva.habitacion) habitacion = reserva.habitacion;
    const status = this._extractStatusId(reserva);

    // Populate modal elements
    document.getElementById('detalleReservaID').textContent = `ID: #${reserva.id_reserva || reserva.IDReserva || id}`;
    
    // Guest info
    document.getElementById('detResClienteNombre').textContent = cliente ? (cliente.NombreCompleto || `${cliente.Nombres || ''} ${cliente.Apellidos || ''}`.trim() || 'Cliente sin nombre') : reserva.nr_documento || 'Huésped Principal';
    document.getElementById('detResClienteDoc').textContent = `Doc: ${cliente ? (cliente.NroDocumento || cliente.nro_documento || '--') : reserva.nr_documento || '--'}`;
    document.getElementById('detResClienteEmail').textContent = `Email: ${cliente ? (cliente.Email || '--') : '--'}`;
    document.getElementById('detResClienteTel').textContent = `Tel: ${cliente ? (cliente.Telefono || '--') : '--'}`;

    // Room info
    const nombreHabitacion = habitacion ? (habitacion.nombre || habitacion.NombreHabitacion || habitacion.tipo || habitacion.Tipo || `Habitación ${habitacion.numero || habitacion.Numero}`) : 'Sin Habitación';
    const costoHabitacion = habitacion ? (habitacion.precio || habitacion.Precio || habitacion.costo || habitacion.Costo || 0) : 0;
    document.getElementById('detResHabNombre').textContent = nombreHabitacion;
    document.getElementById('detResHabPrecio').textContent = habitacion ? `$${this.formatCurrency(costoHabitacion)} / noche` : '--';

    // Dates info
    document.getElementById('detResFechaInicio').textContent = reserva.fecha_inicio || reserva.FechaInicio || '--';
    document.getElementById('detResFechaFin').textContent = reserva.fecha_fin || reserva.FechaFin || '--';

    // Services & packages info
    const servicesGrid = document.getElementById('detResServiciosGrid');
    if (servicesGrid) {
      let badgeHtml = '';
      
      // Render Packages
      if (Array.isArray(reserva.paquetes) && reserva.paquetes.length > 0) {
        reserva.paquetes.forEach(pkg => {
          if (pkg) {
            badgeHtml += `
              <div class="flex items-center gap-2 p-2.5 bg-amber-50 text-amber-800 border border-amber-100 rounded-xl">
                <span>🎁</span>
                <div>
                  <span class="block font-bold">${pkg.nombre || pkg.Nombre || 'Paquete'}</span>
                  <span class="block text-[10px] text-amber-600 mt-0.5">$${this.formatCurrency(pkg.precio || pkg.Precio || 0)}</span>
                </div>
              </div>
            `;
          }
        });
      }

      // Render Services
      if (Array.isArray(reserva.servicios) && reserva.servicios.length > 0) {
        reserva.servicios.forEach(svc => {
          if (svc) {
            badgeHtml += `
              <div class="flex items-center gap-2 p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl">
                <span>🔧</span>
                <div>
                  <span class="block font-bold">${svc.nombre || svc.Nombre || 'Servicio'}</span>
                  <span class="block text-[10px] text-emerald-600 mt-0.5">$${this.formatCurrency(svc.costo || svc.precioGuardado || svc.precio || svc.Precio || 0)}</span>
                </div>
              </div>
            `;
          }
        });
      }

      if (badgeHtml === '') {
        badgeHtml = '<p class="text-xs text-muted italic col-span-2 m-0 p-2 text-center bg-gray-50 rounded-xl border border-gray-100">Sin servicios ni paquetes adicionales</p>';
      }

      servicesGrid.innerHTML = badgeHtml;
    }

    // Payment & totals
    const metodos = { '1': 'Efectivo', '2': 'Tarjeta Débito/Crédito', '3': 'Transferencia Bancaria' };
    document.getElementById('detResMetodoPago').textContent = metodos[String(reserva.id_metodo_pago)] || 'Efectivo';
    
    const totalElem = document.getElementById('detResTotal');
    if (totalElem) totalElem.textContent = `$${this.formatCurrency(reserva.total || 0)}`;

    // Status badge
    const badge = document.getElementById('detResEstadoBadge');
    if (badge) {
      const badgeColors = {
        '1': ['bg-emerald-100', 'text-emerald-800'],
        '2': ['bg-red-100', 'text-red-800'],
        '3': ['bg-blue-100', 'text-blue-800'],
        '4': ['bg-indigo-100', 'text-indigo-800'],
        '5': ['bg-amber-100', 'text-amber-800']
      };
      const colors = badgeColors[status] || ['bg-gray-100', 'text-gray-800'];
      badge.classList.add(...colors);
    }

    // Motivo de cancelación (si aplica)
    const motivoElem = document.getElementById('detResMotivoCancelacion');
    const motivoContainer = document.getElementById('detResMotivoCancelacionContainer');
    if (motivoContainer) {
      const motivo = reserva.motivo_cancelacion;
      if (motivo && status === '2') {
        motivoContainer.style.display = 'block';
        if (motivoElem) motivoElem.textContent = motivo;
      } else {
        motivoContainer.style.display = 'none';
      }
    }

    // Unhide modal
    document.getElementById('reservaDetalleModal').classList.remove('hidden');
  }

  // Edit reservation
  async editReserva(id) {
    if (!id || id === 'undefined' || id === 'null') {
      Swal.fire('Error', 'ID de reserva no válido', 'error');
      return;
    }
    const reserva = this.currentData.reservas.find(r => (r.id_reserva || r.IDReserva || r.IdReserva || r.id) == id);
    if (!reserva) {
      Swal.fire('', 'Reserva no encontrada', 'info');
      return;
    }
    this.showEditReservationForm(reserva);
  }

  // Show edit reservation form (REDISEÑADO — 4 secciones)
  showEditReservationForm(reserva) {
    const idCliente = reserva.id_cliente || reserva.IDCliente || (reserva.cliente ? reserva.cliente.id : null);
    const idHabitacion = reserva.id_habitacion || reserva.IDHabitacion || (reserva.habitacion ? reserva.habitacion.id : null);
    const idMetodoPago = reserva.id_metodo_pago || reserva.IDMetodoPago || (reserva.metodoPago ? reserva.metodoPago.id : 1);
    const idEstado = String(reserva.id_estado_reserva || (reserva.estado ? (reserva.estado.id || reserva.estado) : (reserva.Estado || 1)));

    // Resolver datos relacionados
    const cliente = this.currentData.clientes.find(c => (c.id_cliente || c.IDCliente) == idCliente);
    let habitacionActual = this.currentData.habitaciones.find(h => (h.id_habitacion || h.IDHabitacion) == idHabitacion);
    if (!habitacionActual && reserva.habitacion) habitacionActual = reserva.habitacion;

    const nombreCliente = cliente
      ? (cliente.NombreCompleto || `${cliente.Nombres || cliente.Nombre || ''} ${cliente.Apellidos || cliente.Apellido || ''}`.trim())
      : (reserva.cliente ? reserva.cliente.nombreCompleto : 'Sin cliente');
    const nombreHab = habitacionActual
      ? (habitacionActual.tipo || habitacionActual.Tipo || habitacionActual.NombreHabitacion || habitacionActual.nombre || 'Sin nombre')
      : (reserva.habitacion ? reserva.habitacion.nombre : 'Sin habitación');

    // Estado como texto
    const estadoTextoMap = { '1': 'Activa', '2': 'Cancelada', '3': 'Finalizada', '4': 'Rechazada', '5': 'Pendiente' };
    const estadoColorMap = {
      '1': 'background:#d1fae5;color:#065f46;border:1px solid #a7f3d0',
      '2': 'background:#fee2e2;color:#991b1b;border:1px solid #fca5a5',
      '3': 'background:#dbeafe;color:#1e40af;border:1px solid #bfdbfe',
      '4': 'background:#fef2f2;color:#b91c1c;border:1px solid #fecaca',
      '5': 'background:#fef3c7;color:#92400e;border:1px solid #fde68a'
    };
    const estadoTexto = estadoTextoMap[idEstado] || 'Desconocido';
    const estadoColor = estadoColorMap[idEstado] || 'background:#f3f4f6;color:#374151';

    // Solo bloquear edición de paquetes si está CANCELADA o RECHAZADA
    const isCancelada = idEstado === '2' || idEstado === '4' || idEstado === '3';
    const isActiva = idEstado === '1';
    const isPendiente = idEstado === '5';

    // Paquetes y servicios actuales
    const paquetesActuales = Array.isArray(reserva.paquetes) ? reserva.paquetes : [];
    const serviciosActuales = Array.isArray(reserva.servicios) ? reserva.servicios : [];

    const paquetesTexto = paquetesActuales.length
      ? paquetesActuales.map(p => p.nombre || p.Nombre || 'Paquete').join(', ')
      : 'Ninguno';
    const serviciosTexto = serviciosActuales.length
      ? serviciosActuales.map(s => s.nombre || s.Nombre || 'Servicio').join(', ')
      : 'Ninguno';

    // IDs preseleccionados
    const paqIds = paquetesActuales.map(p => String(p.id_paquete || p.IDPaquete || p.id || ''));
    const svcIds = serviciosActuales.map(s => String(s.id_servicio || s.IDServicio || s.id || ''));

    // Precios actuales
    const precioHabActual = habitacionActual ? Number(habitacionActual.precio || habitacionActual.Precio || habitacionActual.Costo || 0) : 0;
    const totalAnterior = Number(reserva.total || reserva.Total || 0);

    this.refs.reservationsListSection.style.display = 'none';
    this.refs.reservationFormSection.style.display = 'none';
    this.refs.editReservationSection.style.display = 'block';

    const bannerCancelada = isCancelada
      ? `<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:10px;">
           <span style="font-size:1.4rem;">🔒</span>
           <div>
             <strong style="color:#991b1b;font-size:0.95rem;">Reserva Cancelada — Edición Bloqueada</strong>
             <p style="color:#b91c1c;font-size:0.85rem;margin:2px 0 0;">Las reservas canceladas no pueden modificarse. Solo puedes consultar la información.</p>
           </div>
         </div>`
      : '';

    const bannerActiva = isActiva && !isCancelada
      ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:10px;">
           <span style="font-size:1.4rem;">⚡</span>
           <div>
             <strong style="color:#92400e;font-size:0.95rem;">Reserva Pendiente — Edición Limitada</strong>
             <p style="color:#b45309;font-size:0.85rem;margin:2px 0 0;">Solo puedes agregar servicios extra o extender las fechas de salida.</p>
           </div>
         </div>`
      : '';

    // Generar opciones de paquetes y servicios (checkboxes)
    const paquetesActiveOptions = this.currentData.paquetes.filter(p => Number(p.estado ?? p.Estado ?? 1) === 1);
    const serviciosActiveOptions = this.currentData.servicios.filter(s => Number(s.estado ?? s.Estado ?? 1) === 1);

    const paquetesCheckboxes = paquetesActiveOptions.map(p => {
      const pid = String(p.id_paquete || p.IDPaquete || '');
      // Precio del detalle guardado o del catálogo
      const paqEnReserva = paquetesActuales.find(pr => String(pr.id_paquete || pr.IDPaquete || pr.id || '') === pid);
      const precio = Number(
        (paqEnReserva && (paqEnReserva.precio || paqEnReserva.total)) ||
        p.precio || p.Precio || 0
      );
      const checked = paqIds.includes(pid);
      const disabled = isCancelada || paqEnReserva ? 'disabled' : '';
      return `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;cursor:${disabled?'default':'pointer'};background:${checked?'rgba(37,138,96,0.06)':'#f9fafb'};border:1px solid ${checked?'#258a60':'#e5e7eb'};transition:all .2s;">
        <input type="checkbox" name="editPaquetes" value="${pid}" data-price="${precio}" data-name="${p.nombre || p.Nombre || p.NombrePaquete || 'Paquete'}" ${checked?'checked':''} ${disabled} style="width:16px;height:16px;accent-color:#258a60;">
        <span style="flex:1;font-size:0.9rem;font-weight:600;color:#173029;">${p.nombre || p.Nombre || p.NombrePaquete || 'Paquete'}</span>
        <span style="font-size:0.85rem;color:#258a60;font-weight:700;">$${this.formatCurrency(precio)}</span>
      </label>`;
    }).join('');

    const serviciosCheckboxes = serviciosActiveOptions.map(s => {
      const sid = String(s.id_servicio || s.IDServicio || '');
      // Usar precio correcto: primero el guardado en detalle de reserva, luego el costo del catálogo
      const svcEnReserva = serviciosActuales.find(sr => String(sr.id_servicio || sr.IDServicio || sr.id || '') === sid);
      const precio = Number(
        (svcEnReserva && (svcEnReserva.precioGuardado || svcEnReserva.costo || svcEnReserva.Precio)) ||
        s.precio || s.Precio || s.Costo || 0
      );
      const checked = svcIds.includes(sid);
      const disabled = isCancelada || svcEnReserva ? 'disabled' : '';
      return `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;cursor:${disabled?'default':'pointer'};background:${checked?'rgba(37,138,96,0.06)':'#f9fafb'};border:1px solid ${checked?'#258a60':'#e5e7eb'};transition:all .2s;">
        <input type="checkbox" name="editServicios" value="${sid}" data-price="${precio}" data-name="${s.nombre || s.Nombre || s.NombreServicio || 'Servicio'}" ${checked?'checked':''} ${disabled} style="width:16px;height:16px;accent-color:#258a60;">
        <span style="flex:1;font-size:0.9rem;font-weight:600;color:#173029;">${s.nombre || s.Nombre || s.NombreServicio || 'Servicio'}</span>
        <span style="font-size:0.85rem;color:#258a60;font-weight:700;">$${this.formatCurrency(precio)}/pers.</span>
      </label>`;
    }).join('');

    // HTML del formulario
    this.refs.editReservationContainer.innerHTML = `
      <div style="max-width:900px;margin:0 auto;padding-bottom:40px;">

        <!-- Encabezado -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:24px;">
          <div>
            <p style="font-size:0.75rem;font-weight:800;color:#258a60;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px;">Gestión de Reservas</p>
            <h2 style="margin:0;color:#173029;font-size:1.5rem;font-weight:800;">✏️ Editar Reserva <span style="color:#258a60;">#${reserva.id_reserva || reserva.IDReserva}</span></h2>
          </div>
          <button onclick="window.reservasModule.showReservationsList()"
            style="padding:10px 20px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;color:#173029;font-weight:700;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;gap:6px;">
            ← Volver a la lista
          </button>
        </div>

        ${bannerCancelada}
        ${bannerActiva}

        <!-- SECCIÓN 1: Información actual (solo lectura) -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:20px 24px;margin-bottom:20px;">
          <h3 style="margin:0 0 16px;color:#173029;font-size:1rem;font-weight:800;display:flex;align-items:center;gap:8px;">
            📋 Sección 1: Información Actual
          </h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
            <div style="background:#fff;border-radius:10px;padding:12px 14px;border:1px solid #e5e7eb;">
              <p style="font-size:0.7rem;font-weight:800;color:#6b7280;text-transform:uppercase;margin:0 0 4px;">Código</p>
              <p style="margin:0;font-weight:700;color:#173029;">#${reserva.id_reserva || reserva.IDReserva}</p>
            </div>
            <div style="background:#fff;border-radius:10px;padding:12px 14px;border:1px solid #e5e7eb;">
              <p style="font-size:0.7rem;font-weight:800;color:#6b7280;text-transform:uppercase;margin:0 0 4px;">Estado actual</p>
              <span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:0.8rem;font-weight:800;${estadoColor}">${estadoTexto}</span>
            </div>
            <div style="background:#fff;border-radius:10px;padding:12px 14px;border:1px solid #e5e7eb;">
              <p style="font-size:0.7rem;font-weight:800;color:#6b7280;text-transform:uppercase;margin:0 0 4px;">Habitación</p>
              <p style="margin:0;font-weight:700;color:#173029;">${nombreHab}</p>
            </div>
            <div style="background:#fff;border-radius:10px;padding:12px 14px;border:1px solid #e5e7eb;">
              <p style="font-size:0.7rem;font-weight:800;color:#6b7280;text-transform:uppercase;margin:0 0 4px;">Check-in</p>
              <p style="margin:0;font-weight:700;color:#173029;">${reserva.fecha_inicio || reserva.FechaInicio || '—'}</p>
            </div>
            <div style="background:#fff;border-radius:10px;padding:12px 14px;border:1px solid #e5e7eb;">
              <p style="font-size:0.7rem;font-weight:800;color:#6b7280;text-transform:uppercase;margin:0 0 4px;">Check-out</p>
              <p style="margin:0;font-weight:700;color:#173029;">${reserva.fecha_fin || reserva.FechaFin || '—'}</p>
            </div>
            <div style="background:#fff;border-radius:10px;padding:12px 14px;border:1px solid #e5e7eb;">
              <p style="font-size:0.7rem;font-weight:800;color:#6b7280;text-transform:uppercase;margin:0 0 4px;">Paquetes</p>
              <p style="margin:0;font-weight:600;color:#173029;font-size:0.88rem;">${paquetesTexto}</p>
            </div>
            <div style="background:#fff;border-radius:10px;padding:12px 14px;border:1px solid #e5e7eb;">
              <p style="font-size:0.7rem;font-weight:800;color:#6b7280;text-transform:uppercase;margin:0 0 4px;">Servicios extra</p>
              <p style="margin:0;font-weight:600;color:#173029;font-size:0.88rem;">${serviciosTexto}</p>
            </div>
            <div style="background:#fff;border-radius:10px;padding:12px 14px;border:1px solid #e5e7eb;">
              <p style="font-size:0.7rem;font-weight:800;color:#6b7280;text-transform:uppercase;margin:0 0 4px;">Total registrado</p>
              <p style="margin:0;font-weight:800;color:#258a60;font-size:1.1rem;">$${this.formatCurrency(totalAnterior)}</p>
            </div>
          </div>
        </div>

        <form id="editReservationForm">

          <!-- SECCIÓN 2: Campos editables -->
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px 24px;margin-bottom:20px;">
            <h3 style="margin:0 0 18px;color:#173029;font-size:1rem;font-weight:800;display:flex;align-items:center;gap:8px;">
              ✏️ Sección 2: Modificar Reserva
            </h3>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
              ${!isActiva ? `
              <div>
                <label style="font-size:0.8rem;font-weight:700;color:#373737;display:block;margin-bottom:6px;">Habitación</label>
                <select id="editHabitacionSelect" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid #d1d5db;background:#f9fafb;font-size:0.9rem;font-weight:600;color:#173029;" onchange="window.reservasModule._recalcularEdicion()">
                  <option value="">Seleccionar habitación</option>
                  ${this.currentData.habitaciones.map(hab => {
                    const hid = hab.id_habitacion || hab.IDHabitacion;
                    const precio = Number(hab.precio || hab.Precio || hab.Costo || 0);
                    return `<option value="${hid}" data-price="${precio}" ${hid == idHabitacion ? 'selected' : ''}>
                      ${hab.tipo || hab.Tipo || hab.NombreHabitacion || 'Habitación'} — $${this.formatCurrency(precio)}/noche
                    </option>`;
                  }).join('')}
                </select>
              </div>
              ` : `<div style="background:#f3f4f6;border-radius:10px;padding:12px;display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:0.85rem;">
                🔒 Habitación no modificable en estado Pendiente
              </div>`}

              <div>
                <label style="font-size:0.8rem;font-weight:700;color:#373737;display:block;margin-bottom:6px;">Estado</label>
                <select id="editEstadoReserva" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid #d1d5db;background:#f9fafb;font-size:0.9rem;font-weight:600;color:#173029;">
                  <option value="1" ${idEstado=='1'?'selected':''}>Activa</option>
                  <option value="4" ${idEstado=='4'?'selected':''}>Rechazada</option>
                  <option value="3" ${idEstado=='3'?'selected':''}>Finalizada</option>
                  <option value="5" ${idEstado=='5'?'selected':''}>Pendiente</option>
                  <option value="2" ${idEstado=='2'?'selected':''}>Cancelada</option>
                </select>
              </div>

              <div>
                <label style="font-size:0.8rem;font-weight:700;color:#373737;display:block;margin-bottom:6px;">Fecha Check-in</label>
                <input type="date" id="editFechaInicio" value="${reserva.fecha_inicio || reserva.FechaInicio || ''}"
                  ${isActiva ? 'disabled' : ''}
                  style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid #d1d5db;background:${isActiva?'#f3f4f6':'#f9fafb'};font-size:0.9rem;box-sizing:border-box;"
                  onchange="window.reservasModule._recalcularEdicion()">
              </div>

              <div>
                <label style="font-size:0.8rem;font-weight:700;color:#373737;display:block;margin-bottom:6px;">Fecha Check-out ${isActiva?'<span style="color:#258a60;">(solo extender)</span>':''}</label>
                <input type="date" id="editFechaFin" value="${reserva.fecha_fin || reserva.FechaFin || ''}"
                  style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid #d1d5db;background:#f9fafb;font-size:0.9rem;box-sizing:border-box;"
                  onchange="window.reservasModule._recalcularEdicion()">
              </div>

              <div>
                <label style="font-size:0.8rem;font-weight:700;color:#373737;display:block;margin-bottom:6px;">Método de Pago</label>
                <select id="editMetodoPago" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid #d1d5db;background:#f9fafb;font-size:0.9rem;font-weight:600;color:#173029;">
                  <option value="1" ${idMetodoPago==1?'selected':''}>Efectivo</option>
                  <option value="2" ${idMetodoPago==2?'selected':''}>Tarjeta Débito/Crédito</option>
                  <option value="3" ${idMetodoPago==3?'selected':''}>Transferencia Bancaria</option>
                </select>
              </div>

              <div style="grid-column:span 2;">
                <label style="font-size:0.8rem;font-weight:700;color:#373737;display:block;margin-bottom:6px;">Observaciones</label>
                <textarea id="editObservaciones" rows="2"
                  style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid #d1d5db;background:#f9fafb;font-size:0.9rem;resize:vertical;box-sizing:border-box;"
                  placeholder="Notas o solicitudes especiales...">${reserva.observaciones || ''}</textarea>
              </div>
            </div>

            <!-- Paquetes -->
            <div style="margin-bottom:18px;">
              <h4 style="margin:0 0 10px;color:#173029;font-size:0.85rem;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;">🎁 Paquetes Especiales</h4>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px;" id="editPaquetesGrid">
                ${paquetesCheckboxes || '<p style="color:#6b7280;font-size:0.85rem;">No hay paquetes disponibles.</p>'}
              </div>
            </div>

            <!-- Servicios -->
            <div>
              <h4 style="margin:0 0 10px;color:#173029;font-size:0.85rem;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;">🔧 Servicios Extra</h4>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px;" id="editServiciosGrid">
                ${serviciosCheckboxes || '<p style="color:#6b7280;font-size:0.85rem;">No hay servicios disponibles.</p>'}
              </div>
            </div>
            </div>
          </div>

          <!-- SECCIÓN 3: Resumen dinámico de precios -->
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px 24px;margin-bottom:20px;" id="editPriceSummary">
            <h3 style="margin:0 0 16px;color:#173029;font-size:1rem;font-weight:800;display:flex;align-items:center;gap:8px;">
              💰 Sección 3: Resumen de Precios
            </h3>
            <div id="editPriceBreakdown">
              <p style="color:#6b7280;font-style:italic;font-size:0.9rem;">Selecciona fechas y habitación para ver el cálculo...</p>
            </div>
          </div>

          <!-- SECCIÓN 4: Acciones -->
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px 24px;display:flex;flex-wrap:wrap;gap:12px;justify-content:flex-end;">
            <h3 style="width:100%;margin:0 0 14px;color:#173029;font-size:1rem;font-weight:800;">⚡ Sección 4: Acciones</h3>
            <button type="button" onclick="window.reservasModule.showReservationsList()"
              style="padding:12px 24px;border-radius:10px;border:1px solid #d1d5db;background:#fff;color:#373737;font-weight:700;cursor:pointer;font-size:0.9rem;">
              Cancelar edición
            </button>
            <div id="editPagarDiferencia" style="display:none;">
              <button type="button" id="btnPagarDif"
                style="padding:12px 24px;border-radius:10px;border:none;background:#f59e0b;color:#fff;font-weight:800;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;gap:6px;">
                💳 Guardar y registrar pago pendiente
              </button>
            </div>
            <button type="submit"
              style="padding:12px 28px;border-radius:10px;border:none;background:linear-gradient(135deg,#014034,#258a60);color:#fff;font-weight:800;cursor:pointer;font-size:0.9rem;box-shadow:0 4px 14px rgba(1,64,52,.3);">
              💾 Guardar cambios
            </button>
          </div>

        </form>
      </div>
    `;

    // Guardar estado original de la reserva para comparación
    this._editReservaOriginal = reserva;
    this._editTotalAnterior = totalAnterior;

    // Adjuntar event listeners a los checkboxes para recalcular
    this.refs.editReservationContainer.querySelectorAll('input[name="editPaquetes"], input[name="editServicios"]').forEach(cb => {
      cb.addEventListener('change', () => this._recalcularEdicion());
    });

    // Calcular inmediatamente con los valores actuales
    this._recalcularEdicion();

    // Submit del formulario
    const editForm = this.refs.editReservationContainer.querySelector('#editReservationForm');
    if (editForm) {
      editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.saveReserva(reserva.id_reserva || reserva.IDReserva);
      });
    }

    // Botón "Guardar y pagar diferencia"
    const btnPagarDif = this.refs.editReservationContainer.querySelector('#btnPagarDif');
    if (btnPagarDif) {
      btnPagarDif.addEventListener('click', async () => {
        const totalNuevo = this._lastEditTotal || 0;
        const diferencia = totalNuevo - this._editTotalAnterior;
        if (diferencia > 0) {
          await Swal.fire({
            icon: 'info',
            title: 'Pago pendiente registrado',
            html: `Diferencia a cobrar: <strong>$${this.formatCurrency(diferencia)}</strong><br>Se guardará la reserva con el nuevo total.`,
            confirmButtonText: 'Continuar'
          });
        }
        await this.saveReserva(reserva.id_reserva || reserva.IDReserva);
      });
    }

    window.reservasModule = this;
  }

  // Recalcular precios en edición en tiempo real
  _recalcularEdicion() {
    const container = this.refs.editReservationContainer;
    if (!container) return;

    const habitacionSel = container.querySelector('#editHabitacionSelect');
    const fechaInicio = container.querySelector('#editFechaInicio');
    const fechaFin = container.querySelector('#editFechaFin');
    const breakdownEl = container.querySelector('#editPriceBreakdown');
    const pagarDifEl = container.querySelector('#editPagarDiferencia');

    const startVal = fechaInicio?.value;
    const endVal = fechaFin?.value;

    let noches = 0;
    if (startVal && endVal && endVal > startVal) {
      // Usar constructor por partes para evitar UTC off-by-one en zona UTC-5
      const [y1, m1, d1] = startVal.split('-').map(Number);
      const [y2, m2, d2] = endVal.split('-').map(Number);
      const dateA = new Date(y1, m1 - 1, d1);
      const dateB = new Date(y2, m2 - 1, d2);
      noches = Math.round((dateB - dateA) / (1000 * 60 * 60 * 24));
    }

    // Precio habitación
    let precioHab = 0;
    if (habitacionSel) {
      const selOpt = habitacionSel.options[habitacionSel.selectedIndex];
      precioHab = selOpt ? Number(selOpt.getAttribute('data-price') || 0) : 0;
    } else {
      // En modo activa, la habitación no cambia
      const original = this._editReservaOriginal;
      const hab = this.currentData.habitaciones.find(h =>
        (h.id_habitacion || h.IDHabitacion) == (original?.id_habitacion || original?.IDHabitacion)
      );
      precioHab = hab ? Number(hab.precio || hab.Precio || hab.Costo || 0) : 0;
    }

    const totalHab = precioHab * noches;

    // Paquetes seleccionados
    let totalPaq = 0;
    let descPaq = '';
    const paqChecks = container.querySelectorAll('input[name="editPaquetes"]:checked');
    paqChecks.forEach(cb => { 
      totalPaq += Number(cb.getAttribute('data-price') || 0); 
      descPaq += `<div style="font-size:0.8rem;color:#6b7280;margin-left:12px;">• ${cb.getAttribute('data-name')} ($${this.formatCurrency(cb.getAttribute('data-price') || 0)})</div>`;
    });

    // Servicios seleccionados
    let totalSvc = 0;
    let descSvc = '';
    const svcChecks = container.querySelectorAll('input[name="editServicios"]:checked');
    svcChecks.forEach(cb => { 
      totalSvc += Number(cb.getAttribute('data-price') || 0); 
      descSvc += `<div style="font-size:0.8rem;color:#6b7280;margin-left:12px;">• ${cb.getAttribute('data-name')} ($${this.formatCurrency(cb.getAttribute('data-price') || 0)})</div>`;
    });

    const totalNuevo = totalHab + totalPaq + totalSvc;
    const totalAnterior = this._editTotalAnterior || 0;
    const diferencia = totalNuevo - totalAnterior;
    this._lastEditTotal = totalNuevo;

    let diferenciaHtml = '';
    if (totalAnterior > 0) {
      if (diferencia > 0) {
        diferenciaHtml = `
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-top:1px dashed #e5e7eb;margin-top:6px;">
            <span style="font-size:0.85rem;color:#6b7280;">Total anterior:</span>
            <span style="font-weight:700;color:#6b7280;">$${this.formatCurrency(totalAnterior)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:6px 0;">
            <span style="font-size:0.85rem;color:#b45309;font-weight:700;">⚠️ Diferencia a pagar:</span>
            <span style="font-weight:800;color:#b45309;">+$${this.formatCurrency(diferencia)}</span>
          </div>`;
        if (pagarDifEl) pagarDifEl.style.display = 'block';
        const btnDif = container.querySelector('#btnPagarDif');
        if (btnDif) btnDif.textContent = `💳 Guardar y registrar pago: +$${this.formatCurrency(diferencia)}`;
      } else if (diferencia < 0) {
        diferenciaHtml = `
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-top:1px dashed #e5e7eb;margin-top:6px;">
            <span style="font-size:0.85rem;color:#6b7280;">Total anterior:</span>
            <span style="font-weight:700;color:#6b7280;">$${this.formatCurrency(totalAnterior)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:6px 0;">
            <span style="font-size:0.85rem;color:#065f46;font-weight:700;">✅ Saldo a favor del cliente:</span>
            <span style="font-weight:800;color:#065f46;">$${this.formatCurrency(Math.abs(diferencia))}</span>
          </div>`;
        if (pagarDifEl) pagarDifEl.style.display = 'none';
      } else {
        if (pagarDifEl) pagarDifEl.style.display = 'none';
      }
    }

    if (breakdownEl) {
      breakdownEl.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:6px;">
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f3f4f6;">
            <span style="font-size:0.85rem;color:#6b7280;">🛏 Habitación (${noches} noche${noches!==1?'s':''} × $${this.formatCurrency(precioHab)}):</span>
            <span style="font-weight:700;color:#173029;">$${this.formatCurrency(totalHab)}</span>
          </div>
          <div style="display:flex;flex-direction:column;padding:8px 0;border-bottom:1px solid #f3f4f6;">
            <div style="display:flex;justify-content:space-between;">
              <span style="font-size:0.85rem;color:#6b7280;">🎁 Paquetes (${paqChecks.length}):</span>
              <span style="font-weight:700;color:#173029;">$${this.formatCurrency(totalPaq)}</span>
            </div>
            ${descPaq}
          </div>
          <div style="display:flex;flex-direction:column;padding:8px 0;border-bottom:1px solid #f3f4f6;">
            <div style="display:flex;justify-content:space-between;">
              <span style="font-size:0.85rem;color:#6b7280;">🔧 Servicios extra (${svcChecks.length}):</span>
              <span style="font-weight:700;color:#173029;">$${this.formatCurrency(totalSvc)}</span>
            </div>
            ${descSvc}
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px 0;margin-top:4px;">
            <strong style="color:#173029;font-size:1rem;">TOTAL NUEVO:</strong>
            <strong style="color:#258a60;font-size:1.25rem;">$${this.formatCurrency(totalNuevo)}</strong>
          </div>
          ${diferenciaHtml}
        </div>
      `;
    }
  }
  
  // Save edited reservation (ACTUALIZADO)
  async saveReserva(id) {
    const editContainer = this.refs.editReservationContainer;

    // Recoger habitación (puede estar deshabilitada si es Activa)
    const habSel = editContainer.querySelector('#editHabitacionSelect');
    const original = this._editReservaOriginal;
    const originalHabId = original?.id_habitacion || original?.IDHabitacion || (original?.habitacion ? original.habitacion.id : null);
    const idHabitacion = habSel
      ? parseInt(habSel.value) || parseInt(originalHabId)
      : parseInt(originalHabId);

    // Paquetes y servicios seleccionados
    const paquetesSeleccionados = [...editContainer.querySelectorAll('input[name="editPaquetes"]:checked')]
      .map(cb => parseInt(cb.value)).filter(Boolean);
    const serviciosSeleccionados = [...editContainer.querySelectorAll('input[name="editServicios"]:checked')]
      .map(cb => parseInt(cb.value)).filter(Boolean);

    const observaciones = editContainer.querySelector('#editObservaciones')?.value || '';

    const formData = {
      id_habitacion: idHabitacion,
      fecha_inicio: editContainer.querySelector('#editFechaInicio')?.value || original?.fecha_inicio,
      fecha_fin: editContainer.querySelector('#editFechaFin')?.value || original?.fecha_fin,
      hora_entrada: original?.hora_entrada || '14:00',
      hora_salida: original?.hora_salida || '12:00',
      id_metodo_pago: parseInt(editContainer.querySelector('#editMetodoPago')?.value || 1),
      id_estado_reserva: parseInt(editContainer.querySelector('#editEstadoReserva')?.value || 1),
      total: this._lastEditTotal || Number(original?.total || 0),
      paquetes: paquetesSeleccionados,
      servicios: serviciosSeleccionados,
      observaciones
    };

    // Enviar el NroDocumento porque el backend lo espera en validarReserva
    const idCliente = original?.nr_documento || original?.cliente?.nroDocumento || original?.cliente?.NroDocumento || original?.id_cliente || original?.IDCliente || (original?.cliente ? original.cliente.id : null);
    if (idCliente) formData.id_cliente = String(idCliente);
    
    try {
      console.log('Actualizando reserva:', formData);
      await actualizarReserva(id, formData);
      showAlert('Éxito', 'Reserva actualizada exitosamente', 'success');
      
      await this.reloadData();
      this.showReservationsList();
    } catch (error) {
      console.error('Error actualizando reserva:', error);
      Swal.fire('Error', 'Error al actualizar la reserva: ' + (error.message || 'Error desconocido'), 'error');
    }
  }
  


  
  // Delete reservation
  async deleteReserva(id) {
    if (!id || id === 'undefined' || id === 'null') {
      Swal.fire('Error', 'ID de reserva no válido', 'error');
      return;
    }
    const reserva = this.currentData.reservas.find(r => (r.id_reserva || r.IDReserva || r.IdReserva || r.id) == id);
    if (!reserva) {
      Swal.fire('', 'Reserva no encontrada', 'info');
      return;
    }
    
    const idCliente = reserva.id_cliente || reserva.IDCliente || (reserva.cliente ? reserva.cliente.id : null);
    const cliente = this.currentData.clientes.find(c => (c.id_cliente || c.IDCliente) == idCliente);
    const clienteName = cliente ? (cliente.NombreCompleto || `${cliente.Nombres || ''} ${cliente.Apellidos || ''}`.trim()) : 'Huésped';
    
    const confirmRes = await Swal.fire({
      title: '¿Anular Reserva?',
      html: `¿Está seguro de anular (cancelar) la reserva #${id} de ${clienteName}?<br><br>
             <label style="font-weight:600; font-size:14px; text-align:left; display:block; margin-bottom:5px;">Motivo de anulación (opcional):</label>
             <input type="text" id="cancelReason" class="swal2-input" placeholder="Ej: Solicitud del cliente">`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const reason = document.getElementById('cancelReason').value;
        return reason;
      }
    });
    if (!confirmRes.isConfirmed) {
      return;
    }
    
    const motivo = confirmRes.value;
    
    try {
      console.log(`Anulando reserva ${id}`);
      await cancelarReserva(id, { motivo_cancelacion: motivo });
      showAlert('Información', 'Reserva anulada exitosamente', 'info');
      
      await this.reloadData();
      this.filterReservations();
      this.updateMetrics();
      this.showReservationsList();
    } catch (error) {
      console.error('Error eliminando reserva:', error);
      Swal.fire('Error', 'Error al eliminar la reserva: ' + (error.message || 'Error desconocido'), 'error');
    }
  }
  
  // Reload all data
  async reloadData() {
    let clientes, habitaciones, paquetes, servicios, reservas;

    try {
      [clientes, habitaciones, paquetes, servicios, reservas] = await Promise.all([
        getClientes(),
        getHabitaciones(),
        getPaquetes(),
        getServicios(),
        getReservas()
      ]);
    } catch (apiError) {
      console.error('Error recargando datos desde API:', apiError);
      // Usar datos actuales si falla la recarga
      clientes = this.currentData.clientes;
      habitaciones = this.currentData.habitaciones;
      paquetes = this.currentData.paquetes;
      servicios = this.currentData.servicios;
      reservas = this.currentData.reservas;
    }
    
    this.currentData.clientes = clientes;
    this.currentData.habitaciones = habitaciones;
    this.currentData.paquetes = paquetes;
    this.currentData.servicios = servicios;
    this.currentData.reservas = reservas;
  }

  // Show error message
  showError(title, message) {
    if (this.container) {
      this.container.innerHTML = `
        <div style="text-align: center; padding: 50px;">
          <h2>${title}</h2>
          <p>${message}</p>
          <button onclick="location.reload()" style="padding: 10px 20px; background: #000; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Recargar página
          </button>
        </div>
      `;
    }
  }
}


// Export function for SPA integration
export async function renderReservas(container, options = {}) {
  try {
    // Create and initialize module
    const reservasModule = new ReservasAdminModule(container, options);
    await reservasModule.initialize();
    
    // Make module globally accessible for onclick handlers
    window.reservasModule = reservasModule;
    
    return reservasModule;
  } catch (error) {
    console.error('Error rendering reservas module:', error);
    container.innerHTML = `
      <div style="text-align: center; padding: 50px;">
        <h2>Error al cargar módulo de reservas</h2>
        <p>No se pudo inicializar el módulo. Por favor, intente nuevamente.</p>
        <button onclick="location.reload()" style="padding: 10px 20px; background: #000; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Recargar página
        </button>
      </div>
    `;
    throw error;
  }
}
