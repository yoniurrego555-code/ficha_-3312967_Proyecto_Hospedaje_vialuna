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
        // Usar datos de ejemplo si falla la API
        clientes = this.getClientesEjemplo();
        habitaciones = this.getHabitacionesEjemplo();
        paquetes = this.getPaquetesEjemplo();
        servicios = this.getServiciosEjemplo();
        reservas = this.getReservasEjemplo();
        console.log('Usando datos de ejemplo para reservas-admin');
      }

      console.log('Resumen de datos cargados:', {
        clientes: clientes.length,
        habitaciones: habitaciones.length,
        paquetes: paquetes.length,
        servicios: servicios.length,
        reservas: reservas.length
      });
      
      // Mostrar ejemplo de cada tipo de dato
      if (habitaciones.length > 0) {
        console.log('EJEMPLO Habitación:', habitaciones[0]);
      }
      if (paquetes.length > 0) {
        console.log('EJEMPLO Paquete:', paquetes[0]);
      }
      if (servicios.length > 0) {
        console.log('EJEMPLO Servicio:', servicios[0]);
      }

      console.log('=== ESTRUCTURA DE DATOS DE LA BASE DE DATOS ===');
      console.log('Clientes:', clientes);
      console.log('Habitaciones:', habitaciones);
      console.log('Paquetes:', paquetes);
      console.log('Servicios:', servicios);
      console.log('Reservas:', reservas);
      
      if (habitaciones.length > 0) {
        console.log('Estructura de habitación (primer registro):', Object.keys(habitaciones[0]));
      }
      if (paquetes.length > 0) {
        console.log('Estructura de paquete (primer registro):', Object.keys(paquetes[0]));
      }
      if (servicios.length > 0) {
        console.log('Estructura de servicio (primer registro):', Object.keys(servicios[0]));
      }

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

  // Setup date restrictions
  setupDateRestrictions() {
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    // Set minimum date for fechaInicio
    if (this.refs.fechaInicio) {
      this.refs.fechaInicio.setAttribute('min', today);
      
      // Add change event to sync fechaFin
      this.refs.fechaInicio.addEventListener('change', (e) => {
        const startDate = e.target.value;
        if (this.refs.fechaFin && startDate) {
          // Set minimum date for fechaFin to be the same as fechaInicio + 1 day
          const minEndDate = new Date(startDate);
          minEndDate.setDate(minEndDate.getDate() + 1);
          const minEndStr = minEndDate.toISOString().split('T')[0];
          this.refs.fechaFin.setAttribute('min', minEndStr);
          
          // If fechaFin is earlier than fechaInicio, clear it
          if (this.refs.fechaFin.value && this.refs.fechaFin.value <= startDate) {
            this.refs.fechaFin.value = '';
          }
        }
        this.calculateTotal();
      });
    }
    
    // Set minimum date for fechaFin
    if (this.refs.fechaFin) {
      this.refs.fechaFin.setAttribute('min', today);
      this.refs.fechaFin.addEventListener('change', () => {
        this.calculateTotal();
      });
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

  // Render services
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

    // Cambiamos el estilo del contenedor a grid dinámicamente si no lo tiene
    this.refs.servicesGrid.className = "grid grid-cols-1 sm:grid-cols-2 gap-4 w-full box-border";
    
    this.refs.servicesGrid.innerHTML = activeServices.map(service => {
      const isSelected = this.currentData.selectedServices.find(s => (s.id_servicio || s.IDServicio) == (service.id_servicio || service.IDServicio));
      
      // Resolve service info and image
      const name = String(service.nombre || service.Nombre || service.NombreServicio || '').toLowerCase();
      const desc = String(service.descripcion || service.Descripcion || '').toLowerCase();
      const fullText = `${name} ${desc}`;
      
      let serviceImg = service.ImagenUrl || service.imagenUrl || service.Imagen || service.imagen || service.ImagenServicio || null;
      if (serviceImg && typeof serviceImg === 'object' && serviceImg.type === 'Buffer') {
          serviceImg = String.fromCharCode.apply(null, serviceImg.data);
      }
      if (!serviceImg || serviceImg === 'null') {
        if (fullText.includes('spa') || fullText.includes('masaje') || fullText.includes('relajacion')) {
          serviceImg = getAppUrl('assets/images/service/SPA.png');
        } else if (fullText.includes('caballo') || fullText.includes('cabalgata')) {
          serviceImg = getAppUrl('assets/images/service/cabalgata.png');
        } else if (fullText.includes('caminata') || fullText.includes('guiado') || fullText.includes('recorrido') || fullText.includes('senderismo')) {
          serviceImg = getAppUrl('assets/images/service/caminata.png');
        } else {
          serviceImg = getAppUrl('assets/images/service/SPA.png');
        }
      }
      // Normalize filename-only or uploads path for services
      if (typeof serviceImg === 'string' && serviceImg.trim()) {
        serviceImg = serviceImg.trim();
        if (serviceImg.startsWith('/http')) serviceImg = serviceImg.substring(1);

        if (serviceImg.startsWith('http')) {
          // Keep absolute URL
        } else if (/^[\w\- .]+\.(png|jpg|jpeg|webp|gif)$/i.test(serviceImg)) {
          serviceImg = `/uploads/${serviceImg}`;
        } else if (serviceImg.toLowerCase().includes('uploads') && !serviceImg.startsWith('/')) {
          serviceImg = `/${serviceImg}`;
        }
      }
      // Improve title if generic
      let displayTitle = service.nombre || service.Nombre || service.NombreServicio || 'Servicio';
      if (displayTitle.toLowerCase() === 'servicio') {
        if (fullText.includes('spa') || fullText.includes('masaje') || fullText.includes('relajacion')) displayTitle = 'Spa & Relajación';
        else if (fullText.includes('caballo') || fullText.includes('cabalgata')) displayTitle = 'Cabalgata Guiada';
        else if (fullText.includes('caminata') || fullText.includes('guiado') || fullText.includes('recorrido')) displayTitle = 'Caminata Ecológica';
      }

      return `
        <div class="service-checkbox modern-service">
          <input type="checkbox" id="svc_${service.id_servicio || service.IDServicio}" 
                 class="service-check-input"
                 data-service-id="${service.id_servicio || service.IDServicio}" 
                 ${isSelected ? 'checked' : ''}
                 style="position: absolute; opacity: 0; cursor: pointer;">
          <label for="svc_${service.id_servicio || service.IDServicio}" 
                 class="service-label ${isSelected ? 'selected' : ''}"
                 style="display: flex; flex-direction: column; cursor: pointer; border-radius: 16px; overflow: hidden; background: ${isSelected ? 'rgba(31, 106, 77, 0.05)' : 'white'}; border: 1px solid ${isSelected ? 'var(--brand)' : 'rgba(0,0,0,0.08)'}; box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: all 0.3s ease; height: 100%;">
            <div class="service-image" style="height: 120px; position: relative;">
              <img src="${serviceImg}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'">
              ${isSelected ? '<div style="position: absolute; top: 10px; right: 10px; background: var(--brand); color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">✓</div>' : ''}
            </div>
            <div class="service-info" style="padding: 15px; display: flex; flex-direction: column; flex-grow: 1;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <h4 style="margin: 0; font-size: 1.1rem; color: var(--brand-deep); line-height: 1.2;">${displayTitle}</h4>
              </div>
              <p style="margin: 0 0 15px 0; font-size: 0.85rem; color: var(--muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4;">
                ${service.descripcion || service.Descripcion || 'Servicio adicional para complementar tu estadía.'}
              </p>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                <span class="service-price" style="font-weight: 700; color: var(--brand); font-size: 1.1rem;">$${this.formatCurrency(service.precio || service.Precio || service.Costo || 0)}</span>
                <span style="font-size: 0.8rem; background: var(--paper); padding: 4px 10px; border-radius: 20px; color: var(--muted);">Servicio</span>
              </div>
            </div>
          </label>
        </div>
      `;
    }).join('');

    // Remove the old manual row click handlers since we now use labels with standard checkboxes
    // Add change handlers for the inputs
    this.container.querySelectorAll('.service-check-input').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const svcId = checkbox.dataset.serviceId;
        const service = activeServices.find(s => (s.id_servicio || s.IDServicio) == svcId);
        
        if (checkbox.checked && service) {
          if (!this.currentData.selectedServices.find(s => (s.id_servicio || s.IDServicio) == svcId)) {
            this.currentData.selectedServices.push(service);
          }
        } else {
          this.currentData.selectedServices = this.currentData.selectedServices.filter(s => (s.id_servicio || s.IDServicio) != svcId);
        }
        
        // Visual feedback on the label card
        const label = checkbox.nextElementSibling;
        if (label) {
          if (checkbox.checked) {
              label.classList.add('selected');
              label.style.background = 'rgba(31, 106, 77, 0.05)';
              label.style.borderColor = 'var(--brand)';
              // Add checkmark dynamically if not present
              const imgContainer = label.querySelector('.service-image');
              if (imgContainer && !imgContainer.querySelector('.checkmark')) {
                  imgContainer.insertAdjacentHTML('beforeend', '<div class="checkmark" style="position: absolute; top: 10px; right: 10px; background: var(--brand); color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">✓</div>');
              }
          } else {
              label.classList.remove('selected');
              label.style.background = 'white';
              label.style.borderColor = 'rgba(0,0,0,0.08)';
              const checkmark = label.querySelector('.checkmark');
              if (checkmark) checkmark.remove();
          }
        }

        this.calculateTotal();
      });
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
            <div class="flex items-center gap-3">
              <label class="relative inline-block w-11 h-6 m-0 cursor-pointer shrink-0">
                <input type="checkbox" class="sr-only peer" ${status == '1' ? 'checked' : ''} 
                       onchange="window.reservasModule.changeStatusFromTable(${resId}, this.checked ? '1' : '2')">
                <span class="absolute inset-0 rounded-full bg-slate-200 peer-checked:bg-emerald-500 transition-colors duration-300 before:content-[''] before:absolute before:h-[18px] before:w-[18px] before:left-[3px] before:bottom-[3px] before:bg-white before:rounded-full before:transition-transform before:duration-300 peer-checked:before:translate-x-5"></span>
              </label>
              <span class="px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all duration-300 ${status == '1' ? 'bg-emerald-100 text-emerald-800' : (status == '3' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800')}">
                ${status == '1' ? 'Activa' : (status == '3' ? 'Finalizada' : 'Cancelada')}
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
    const today = new Date().toISOString().split('T')[0];
    const todayReservations = this.currentData.reservas.filter(r => r.fecha_inicio === today);
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
      const today = new Date().toISOString().split('T')[0];
      if (startDateVal < today) {
        isValidDate = false;
        fechasStr = `<p style="font-size: 0.85rem; color: #dc2626; font-weight: bold; margin: 4px 0;">⚠️ La fecha de entrada no puede ser pasada.</p>`;
      } else if (startDateVal >= endDateVal) {
        isValidDate = false;
        fechasStr = `<p style="font-size: 0.85rem; color: #dc2626; font-weight: bold; margin: 4px 0;">⚠️ La salida debe ser posterior a la entrada.</p>`;
      } else {
        const d1 = new Date(startDateVal);
        const d2 = new Date(endDateVal);
        const diffTime = d2 - d1;
        noches = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
    
    // Service prices
    if (this.currentData.selectedServices.length > 0) {
      let svcHtml = '';
      this.currentData.selectedServices.forEach(service => {
        if (service) {
          const svcPrice = Number(service.precio || service.Precio || service.Costo || service.costo || 0);
          subtotal += svcPrice;
          
          // Determine title for summary
          let svcTitle = service.nombre || service.Nombre || 'Servicio';
          if (svcTitle.toLowerCase() === 'servicio') {
            const fullText = `${svcTitle} ${service.descripcion || service.Descripcion || ''}`.toLowerCase();
            if (fullText.includes('spa') || fullText.includes('masaje') || fullText.includes('relajacion')) svcTitle = 'Spa & Relajación';
            else if (fullText.includes('caballo') || fullText.includes('cabalgata')) svcTitle = 'Cabalgata Guiada';
            else if (fullText.includes('caminata') || fullText.includes('guiado') || fullText.includes('recorrido')) svcTitle = 'Caminata Ecológica';
          }
          svcHtml += `
            <div class="summary-item" style="padding: 8px 12px; margin-bottom: 6px; background: rgba(0,0,0,0.02); border-radius: 10px;">
              <div class="summary-item-details" style="width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 0.9rem; font-weight: 500; color: var(--brand-deep);">${svcTitle}</span>
                  <span style="font-weight: 700; font-size: 0.9rem; color: var(--brand);">$${this.formatCurrency(svcPrice)}</span>
                </div>
                <p style="font-size: 0.75rem; color: var(--muted); margin: 2px 0 0 0;">
                  ${service.descripcion || service.Descripcion || 'Servicio adicional seleccionado.'}
                </p>
              </div>
            </div>
          `;
        }
      });
      if (summaryServices) summaryServices.innerHTML = svcHtml;
    } else {
      if (summaryServices) {
        summaryServices.innerHTML = '<p class="empty-state-small">Ningún servicio seleccionado</p>';
      }
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

  // Init Flatpickr
  initFlatpickr() {
    if (!window.flatpickr) return;
    const commonOpts = {
        locale: 'es',
        dateFormat: 'Y-m-d',
        minDate: 'today',
        onChange: () => this.calculateTotal()
    };
    if (this.refs.fechaInicio) {
        this.fpInicio = flatpickr(this.refs.fechaInicio, commonOpts);
    }
    if (this.refs.fechaFin) {
        this.fpFin = flatpickr(this.refs.fechaFin, commonOpts);
    }
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
  const statusCounts = { '1': 0, '2': 0, '3': 0 };
  this.currentData.reservas.forEach(r => {
    const status = this._extractStatusId(r);
    if (statusCounts[status] !== undefined) statusCounts[status]++;
  });
  const statusLabels = ['Activa', 'Cancelada', 'Finalizada'];
  const statusData = [statusCounts['1'], statusCounts['2'], statusCounts['3']];
  const statusColors = ['rgba(16,185,129,0.6)', 'rgba(239,68,68,0.6)', 'rgba(59,130,246,0.6)'];
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

      const totalAmount = Number(this.refs.totalAmount.textContent.replace(/[^0-9.-]+/g, ''));
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
    return Number(value || 0).toLocaleString("es-CO");
  }

  getStatusClass(estado) {
    const statusMap = {
      '1': 'status-active',
      '2': 'status-cancelled',
      '3': 'status-completed',
      'activo': 'status-active',
      'completada': 'status-completed',
      'cancelada': 'status-cancelled',
      'finalizada': 'status-completed',
      'active': 'status-active',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled'
    };
    return statusMap[String(estado).toLowerCase()] || 'status-active';
  }

  getStatusText(estado) {
    const statusMap = {
      '1': 'Activa',
      '2': 'Cancelada',
      '3': 'Finalizada',
      'activo': 'Activa',
      'completada': 'Finalizada',
      'finalizada': 'Finalizada',
      'cancelada': 'Cancelada'
    };
    return statusMap[String(estado).toLowerCase()] || estado || 'Desconocido';
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
                  <span class="block text-[10px] text-emerald-600 mt-0.5">$${this.formatCurrency(svc.precio || svc.Precio || 0)}</span>
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
      badge.textContent = this.getStatusText(status);
      badge.className = 'inline-block px-3 py-1 rounded-full text-xs font-bold mt-1';
      if (status === '1') {
        badge.classList.add('bg-emerald-100', 'text-emerald-800');
      } else if (status === '2') {
        badge.classList.add('bg-red-100', 'text-red-800');
      } else {
        badge.classList.add('bg-gray-100', 'text-gray-800');
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
    
    // Show edit form
    this.showEditReservationForm(reserva);
  }
  
  // Show edit reservation form
  showEditReservationForm(reserva) {
    const idCliente = reserva.id_cliente || reserva.IDCliente || (reserva.cliente ? reserva.cliente.id : null);
    const idHabitacion = reserva.id_habitacion || reserva.IDHabitacion || (reserva.habitacion ? reserva.habitacion.id : null);
    const idMetodoPago = reserva.id_metodo_pago || reserva.IDMetodoPago || (reserva.metodoPago ? reserva.metodoPago.id : 1);
    const idEstado = reserva.id_estado_reserva || (reserva.estado ? reserva.estado.id : (reserva.Estado || 1));
    
    this.refs.reservationsListSection.style.display = 'none';
    this.refs.reservationFormSection.style.display = 'none';
    this.refs.editReservationSection.style.display = 'block';

    this.refs.editReservationContainer.innerHTML = `
      <div class="section-panel" style="max-width: 800px; margin: 0 auto;">
        <div class="section-panel-header">
          <h2 style="color:var(--brand-deep)"><i class="fa-solid fa-pen"></i> Editar Reserva #${reserva.id_reserva || reserva.IDReserva}</h2>
          <button onclick="window.reservasModule.showReservationsList()" class="btn-secondary">
            Volver a la lista
          </button>
        </div>
        
        <form id="editReservationForm" class="modern-form">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
            <div class="form-group">
              <label style="font-weight:600; margin-bottom:8px; display:block">Huésped:</label>
              <select id="editClienteSelect" class="filter-select" style="width:100%" required>
                <option value="">Seleccionar cliente</option>
                ${this.currentData.clientes.map(c => `
                  <option value="${c.id_cliente || c.IDCliente || c.NroDocumento || c.nro_documento}" ${ (c.id_cliente || c.IDCliente || c.NroDocumento || c.nro_documento) == idCliente ? 'selected' : ''}>
                    ${c.NombreCompleto || `${c.Nombres || c.Nombre || ''} ${c.Apellidos || c.Apellido || ''}`.trim() || 'Cliente'} (${c.NroDocumento || c.nroDocumento || c.documento || 'S/D'})
                  </option>
                `).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label style="font-weight:600; margin-bottom:8px; display:block">Habitación:</label>
              <select id="editHabitacionSelect" class="filter-select" style="width:100%" required>
                <option value="">Seleccionar habitación</option>
                ${this.currentData.habitaciones.map(hab => `
                  <option value="${hab.id_habitacion || hab.IDHabitacion}" ${ (hab.id_habitacion || hab.IDHabitacion) == idHabitacion ? 'selected' : ''}>
                    ${hab.numero || hab.Numero || hab.id_habitacion || hab.IDHabitacion || ''} - ${hab.tipo || hab.Tipo || hab.NombreHabitacion || hab.nombre || 'Habitación'}
                  </option>
                `).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label style="font-weight:600; margin-bottom:8px; display:block">Fecha Entrada:</label>
              <input type="date" id="editFechaInicio" class="search-input" value="${reserva.fecha_inicio || reserva.FechaInicio || ''}" required>
            </div>
            
            <div class="form-group">
              <label style="font-weight:600; margin-bottom:8px; display:block">Fecha Salida:</label>
              <input type="date" id="editFechaFin" class="search-input" value="${reserva.fecha_fin || reserva.FechaFin || ''}" required>
            </div>
            
            <div class="form-group">
              <label style="font-weight:600; margin-bottom:8px; display:block">Método de Pago:</label>
              <select id="editMetodoPago" class="filter-select" style="width:100%" required>
                <option value="1" ${idMetodoPago == 1 ? 'selected' : ''}>Efectivo</option>
                <option value="2" ${idMetodoPago == 2 ? 'selected' : ''}>Tarjeta</option>
                <option value="3" ${idMetodoPago == 3 ? 'selected' : ''}>Transferencia</option>
              </select>
            </div>
            
            <div class="form-group">
              <label style="font-weight:600; margin-bottom:8px; display:block">Estado:</label>
              <select id="editEstadoReserva" class="filter-select" style="width:100%" required>
                <option value="1" ${idEstado == 1 ? 'selected' : ''}>Activa</option>
                <option value="3" ${idEstado == 3 ? 'selected' : ''}>Finalizada</option>
                <option value="2" ${idEstado == 2 ? 'selected' : ''}>Cancelada</option>
              </select>
            </div>

            <div class="form-group" style="grid-column: span 2;">
              <label style="font-weight:600; margin-bottom:8px; display:block">Total ($):</label>
              <input type="number" id="editTotalAmount" class="search-input" value="${reserva.total || reserva.Total || 0}" step="0.01" required>
            </div>
          </div>
          
          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button type="button" onclick="window.reservasModule.showReservationsList()" class="btn-secondary">Cancelar</button>
            <button type="submit" class="btn-primary">Guardar Cambios</button>
          </div>
        </form>
      </div>
    `;
    
    // Setup form submission
    this.container.querySelector('#editReservationForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveReserva(reserva.id_reserva || reserva.IDReserva);
    });
    
    // Ensure module is globally available for onclick handlers
    window.reservasModule = this;
  }
  
  // Save edited reservation
  async saveReserva(id) {
    const editContainer = this.refs.editReservationContainer;
    const formData = {
      id_cliente: parseInt(editContainer.querySelector('#editClienteSelect').value),
      id_habitacion: parseInt(editContainer.querySelector('#editHabitacionSelect').value),
      fecha_inicio: editContainer.querySelector('#editFechaInicio').value,
      fecha_fin: editContainer.querySelector('#editFechaFin').value,
      id_metodo_pago: parseInt(editContainer.querySelector('#editMetodoPago').value),
      id_estado_reserva: parseInt(editContainer.querySelector('#editEstadoReserva').value),
      total: parseFloat(editContainer.querySelector('#editTotalAmount').value)
    };
    
    try {
      console.log('Actualizando reserva:', formData);
      await actualizarReserva(id, formData);
      showAlert('Información', 'Reserva actualizada exitosamente', 'info');
      
      // Reload data and go back to list
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

  // Datos de ejemplo para fallback
  getClientesEjemplo() {
    return [
      { IDCliente: '1', NombreCompleto: 'Juan Pérez', Nombres: 'Juan', Apellidos: 'Pérez', NroDocumento: '1234567890', Estado: '1' },
      { IDCliente: '2', NombreCompleto: 'María García', Nombres: 'María', Apellidos: 'García', NroDocumento: '0987654321', Estado: '1' }
    ];
  }

  getHabitacionesEjemplo() {
    return [
      { 
        IDHabitacion: '1', 
        id_habitacion: 1, 
        Numero: '101', 
        Tipo: 'Familiar', 
        Estado: '1', 
        Precio: 350000,
        descripcion: 'Habitación amplia con múltiples camas, ideal para familias. Incluye aire acondicionado y TV.',
        imagen: getAppUrl('assets/images/rooms/familiar.png'),
        capacidad: 5
      },
      { 
        IDHabitacion: '2', 
        id_habitacion: 2, 
        Numero: '201', 
        Tipo: 'Parejas', 
        Estado: '1', 
        Precio: 250000,
        descripcion: 'Habitación moderna con cama doble, perfecta para parejas. Diseño elegante y confortable.',
        imagen: getAppUrl('assets/images/rooms/parejas.png'),
        capacidad: 2
      },
      { 
        IDHabitacion: '3', 
        id_habitacion: 3, 
        Numero: '301', 
        Tipo: 'Individual', 
        Estado: '1', 
        Precio: 120000,
        descripcion: 'Habitación sencilla y acogedora para una persona. Ideal para viajeros solitarios.',
        imagen: getAppUrl('assets/images/rooms/individual.png'),
        capacidad: 1
      }
    ];
  }

  getPaquetesEjemplo() {
    return [
      { IDPaquete: '1', Nombre: 'Romántico', Descripcion: 'Cena y desayuno', Estado: '1', Precio: 250 },
      { IDPaquete: '2', Nombre: 'Familiar', Descripcion: 'Actividades para niños', Estado: '1', Precio: 400 }
    ];
  }

  getServiciosEjemplo() {
    return [
      { IDServicio: '1', Nombre: 'Spa', Descripcion: 'Tratamientos de spa', Estado: '1', Precio: 100 },
      { IDServicio: '2', Nombre: 'Restaurante', Descripcion: 'Comida gourmet', Estado: '1', Precio: 80 }
    ];
  }

  getReservasEjemplo() {
    return [
      { IDReserva: '1', IDCliente: '1', IDHabitacion: '1', FechaInicio: '2025-01-15', FechaFin: '2025-01-17', Estado: '1', Total: 300 },
      { IDReserva: '2', IDCliente: '2', IDHabitacion: '2', FechaInicio: '2025-01-20', FechaFin: '2025-01-22', Estado: '1', Total: 400 }
    ];
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
