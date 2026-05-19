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
      this.renderReservationsTable(reservas);
      this.updateMetrics();

      // Setup event listeners
      this.setupEventListeners();

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
    
    if (this.refs.clienteSelect) {
      this.refs.clienteSelect.innerHTML = `
        <option value="">Seleccionar cliente...</option>
        ${activeClients.map(cliente => {
          const nombreCompleto = cliente.NombreCompleto || 
                              `${cliente.Nombres || ''} ${cliente.Apellidos || ''}`.trim() || 
                              cliente.nombre_completo ||
                              `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() ||
                              cliente.nombre || 
                              cliente.Nombre ||
                              `${cliente.PrimerNombre || ''} ${cliente.PrimerApellido || ''}`.trim() ||
                              'Cliente sin nombre';
          const clienteId = cliente.id_cliente || cliente.IDCliente || cliente.id || cliente.ID || cliente.NroDocumento || cliente.nro_documento;
          return `
            <option value="${clienteId}" data-document="${cliente.NroDocumento || cliente.nro_documento || ''}">
              ${nombreCompleto}
            </option>
          `;
        }).join('')}
      `;

      // Add change handler for document auto-fill
      this.refs.clienteSelect.addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const documentNumber = selectedOption.dataset.document;
        if (documentNumber && this.refs.documentoInput) {
          this.refs.documentoInput.value = documentNumber;
        }
      });

      // Setup date restrictions
      this.setupDateRestrictions();
    }
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
          // Set minimum date for fechaFin to be the same as fechaInicio
          this.refs.fechaFin.setAttribute('min', startDate);
          
          // If fechaFin is earlier than fechaInicio, clear it
          if (this.refs.fechaFin.value && this.refs.fechaFin.value < startDate) {
            this.refs.fechaFin.value = '';
          }
        }
      });
    }
    
    // Set minimum date for fechaFin
    if (this.refs.fechaFin) {
      this.refs.fechaFin.setAttribute('min', today);
    }
  }

  // Helper to resolve room image
  resolveRoomImage(hab) {
    const imgName = hab.imagen || hab.ImagenHabitacion;
    if (typeof imgName === 'string' && imgName.trim() !== '' && imgName !== 'null' && imgName !== '[object Object]') {
      if (imgName.startsWith('http')) return imgName;
      const cleanName = imgName.replace(/^(\.\.\/)+assets\/images\/rooms\//, '').replace('assets/images/rooms/', '');
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
    const availableRooms = habitaciones.filter(h => Number(h.Estado) === 1);
    
    if (!this.refs.roomSelection) return;
    
    this.refs.roomSelection.innerHTML = availableRooms.map(hab => {
      const isSelected = activeRooms.find(r => (r.id_habitacion || r.IDHabitacion) == (hab.id_habitacion || hab.IDHabitacion));
      return `
        <div class="room-card ${isSelected ? 'selected' : ''}" 
             data-id="${hab.id_habitacion || hab.IDHabitacion}"
             style="cursor: pointer; border-radius: 16px; overflow: hidden; background: white; border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: all 0.3s ease;">
          <div class="room-image" style="height: 150px; position: relative;">
            <img src="${this.resolveRoomImage(hab)}" 
                 onerror="this.src='${getAppUrl('assets/images/rooms/individual.png')}'"
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
    const activePackages = paquetes.filter(p => Number(p.Estado) === 1);
    
    if (!this.refs.packagesGrid) return;
    
    this.refs.packagesGrid.innerHTML = activePackages.map(pkg => {
      const isSelected = this.currentData.selectedPackages.find(p => (p.id_paquete || p.IDPaquete) == (pkg.id_paquete || pkg.IDPaquete));
      return `
        <div class="package-checkbox modern-package">
          <input type="checkbox" id="pkg_${pkg.id_paquete || pkg.IDPaquete}" 
                 data-package-id="${pkg.id_paquete || pkg.IDPaquete}" 
                 ${isSelected ? 'checked' : ''}
                 style="position: absolute; opacity: 0; cursor: pointer;">
          <label for="pkg_${pkg.id_paquete || pkg.IDPaquete}" 
                 class="package-label ${isSelected ? 'selected' : ''}"
                 style="display: block; cursor: pointer; border-radius: 16px; background: ${isSelected ? 'rgba(31, 106, 77, 0.05)' : 'white'}; border: 1px solid ${isSelected ? 'var(--brand)' : 'rgba(0,0,0,0.08)'}; position: relative; transition: all 0.3s ease; padding: 20px;">
            <div class="package-info">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <h4 style="margin: 0; font-size: 1.1rem; color: var(--brand-deep);">${pkg.nombre || pkg.Nombre || 'Paquete'}</h4>
                ${isSelected ? '<span style="color: var(--brand); font-weight: bold;">✓ Seleccionado</span>' : ''}
              </div>
              <p style="margin: 0 0 15px 0; font-size: 0.9rem; color: var(--muted);">
                ${pkg.descripcion || 'Incluye servicios especiales para tu estadía.'}
              </p>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="package-price" style="font-weight: 700; color: var(--brand); font-size: 1.1rem;">$${this.formatCurrency(pkg.precio || pkg.Precio || 0)}</span>
                <span style="font-size: 0.8rem; background: var(--paper); padding: 4px 10px; border-radius: 20px; color: var(--muted);">Paquete Adicional</span>
              </div>
            </div>
          </label>
        </div>
      `;
    }).join('');

    // Add change handlers
    this.container.querySelectorAll('.package-checkbox input').forEach(checkbox => {
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
    const activeServices = servicios.filter(s => Number(s.Estado) === 1);
    
    if (!this.refs.servicesGrid) return;
    
    this.refs.servicesGrid.innerHTML = activeServices.map(service => {
      const isSelected = this.currentData.selectedServices.find(s => (s.id_servicio || s.IDServicio) == (service.id_servicio || service.IDServicio));
      
      // Resolve service info and image
      const name = String(service.nombre || service.Nombre || '').toLowerCase();
      const desc = String(service.descripcion || service.Descripcion || '').toLowerCase();
      const fullText = `${name} ${desc}`;
      
      let serviceImg = getAppUrl('assets/images/service/SPA.png'); 
      if (fullText.includes('spa') || fullText.includes('masaje') || fullText.includes('relajacion')) {
        serviceImg = getAppUrl('assets/images/service/SPA.png');
      } else if (fullText.includes('caballo') || fullText.includes('cabalgata')) {
        serviceImg = getAppUrl('assets/images/service/cabalgata.png');
      } else if (fullText.includes('caminata') || fullText.includes('guiado') || fullText.includes('recorrido')) {
        serviceImg = getAppUrl('assets/images/service/caminata.png');
      }

      // Improve title if generic
      let displayTitle = service.nombre || service.Nombre || 'Servicio';
      if (displayTitle.toLowerCase() === 'servicio') {
        if (fullText.includes('spa') || fullText.includes('masaje') || fullText.includes('relajacion')) displayTitle = 'Spa & Relajación';
        else if (fullText.includes('caballo') || fullText.includes('cabalgata')) displayTitle = 'Cabalgata Guiada';
        else if (fullText.includes('caminata') || fullText.includes('guiado') || fullText.includes('recorrido')) displayTitle = 'Caminata Ecológica';
      }

      return `
        <div class="service-item-row">
          <div class="service-icon-box" style="padding: 0; overflow: hidden; border-radius: 8px; width: 50px; height: 50px;">
             <img src="${serviceImg}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'">
          </div>
          <div class="service-item-info">
            <h5>${displayTitle}</h5>
            <p>${service.descripcion || service.Descripcion || 'Servicio adicional para complementar tu estadía.'}</p>
          </div>
          <div class="service-item-actions">
            <span style="font-weight: 700; color: var(--brand);">$${this.formatCurrency(service.precio || service.Precio || service.Costo || 0)}</span>
            <input type="checkbox" class="service-check-input" 
                   data-service-id="${service.id_servicio || service.IDServicio}" 
                   ${isSelected ? 'checked' : ''}>
          </div>
        </div>
      `;
    }).join('');

    // Add click handlers to the whole row
    this.container.querySelectorAll('.service-item-row').forEach(row => {
      row.style.cursor = 'pointer';
      row.addEventListener('click', (e) => {
        // Prevent double toggle if the checkbox itself was clicked
        if (e.target.type === 'checkbox') return;
        
        const checkbox = row.querySelector('.service-check-input');
        checkbox.checked = !checkbox.checked;
        
        // Trigger change event manually
        const event = new Event('change');
        checkbox.dispatchEvent(event);
      });
    });

    // Add change handlers
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
        
        // Visual feedback on the row
        const row = checkbox.closest('.service-item-row');
        if (row) {
          if (checkbox.checked) row.classList.add('selected');
          else row.classList.remove('selected');
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
    if (!this.refs.reservationsTableBody) return;
    
    if (!reservas.length) {
      this.refs.reservationsTableBody.innerHTML = '<tr><td colspan="7" class="px-6 py-8 text-center text-muted font-semibold">No hay reservas registradas.</td></tr>';
      return;
    }

    this.refs.reservationsTableBody.innerHTML = reservas.map(reserva => {
      const cliente = this.currentData.clientes.find(c => c.id_cliente == reserva.id_cliente);
      const habitacion = this.currentData.habitaciones.find(h => h.id_habitacion == reserva.id_habitacion);
      const status = this._extractStatusId(reserva);
      const resId = reserva.id_reserva || reserva.IDReserva || reserva.IdReserva || reserva.id || 'null';
      
      return `
      <tr class="hover:bg-gray-50/50 transition-all duration-200">
        <td class="px-6 py-4 font-bold text-gray-400">#${resId}</td>
        <td class="px-6 py-4">
            <div class="font-semibold text-brand-deep">${cliente ? (cliente.NombreCompleto || `${cliente.Nombres || ''} ${cliente.Apellidos || ''}`.trim() || 'Cliente sin nombre') : reserva.nr_documento || "Sin cliente"}</div>
            <div class="text-xs text-muted mt-0.5">${cliente ? (cliente.Email || '') : ''}</div>
        </td>
        <td class="px-6 py-4">
            <span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">${habitacion ? (habitacion.numero || habitacion.Numero || 'N/A') : "---"}</span>
        </td>
        <td class="px-6 py-4">
            <div class="text-xs font-semibold text-brand-deep">${reserva.fecha_inicio || "--"}</div>
            <div class="text-[10px] text-muted mt-0.5">hasta ${reserva.fecha_fin || "--"}</div>
        </td>
        <td class="px-6 py-4 font-bold text-brand">$${this.formatCurrency(reserva.total || 0)}</td>
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
        <td class="px-6 py-4">
          <div class="action-group-modern">
            <button class="btn-action-modern view" 
                    onclick="window.reservasModule.verDetalleReserva(${resId})" 
                    title="Ver detalle">🔍</button>
            <button class="btn-action-modern edit" 
                    onclick="window.reservasModule.editReserva(${resId})" 
                    title="Editar">✏️</button>
            <button class="btn-action-modern delete" 
                    onclick="window.reservasModule.deleteReserva(${resId})" 
                    title="Eliminar">🗑️</button>
          </div>
        </td>
      </tr>
    `;
    }).join('');
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
    
    // Room price
    if (this.currentData.selectedRoom) {
      const room = this.currentData.selectedRoom;
      const roomPrice = Number(room.precio || room.Precio || room.Costo || room.costo || 0);
      subtotal += roomPrice;
      
      if (summaryRoom) {
        summaryRoom.innerHTML = `
          <img src="${this.resolveRoomImage(room)}" alt="Room" onerror="this.src='${getAppUrl('assets/images/rooms/individual.png')}'">
          <div class="summary-item-details">
            <h5 style="color: var(--brand-deep); font-size: 1.1rem; margin-bottom: 4px;">${room.numero || room.Numero || 'Habitación'} - ${room.tipo || room.Tipo || room.NombreHabitacion || 'Estándar'}</h5>
            <p style="font-size: 0.85rem; color: var(--muted); margin-bottom: 8px; line-height: 1.4;">
              ${room.descripcion || room.Descripcion || 'Habitación confortable equipada con servicios esenciales para tu descanso.'}
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.85rem; background: var(--paper); padding: 2px 8px; border-radius: 12px; color: var(--brand);">👤 ${ (String(room.tipo || room.Tipo || room.NombreHabitacion || '').toLowerCase().includes('familiar')) ? 5 : (room.capacidad || room.Capacidad || 2) } Pers.</span>
              <strong style="color: var(--brand); font-size: 1rem;">$${this.formatCurrency(roomPrice)}</strong>
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
    if (this.refs.reservationForm) this.refs.reservationForm.reset();
    this.currentData.selectedRoom = null;
    this.currentData.selectedPackages = [];
    this.currentData.selectedServices = [];
    this.container.querySelectorAll('.room-card').forEach(card => card.classList.remove('selected'));
    this.container.querySelectorAll('.package-checkbox input').forEach(cb => cb.checked = false);
    this.container.querySelectorAll('.service-checkbox input').forEach(cb => cb.checked = false);
    this.calculateTotal();
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
    
   // Form submission
if (this.refs.reservationForm) {
  this.refs.reservationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      // 🔴 VALIDACIONES
      if (!this.currentData.selectedRoom) {
        throw new Error('Selecciona una habitación');
      }

      if (!this.refs.clienteSelect.value) {
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

      const formData = {
        id_cliente: parseInt(this.refs.clienteSelect.value),
        id_habitacion: this.currentData.selectedRoom.id_habitacion || this.currentData.selectedRoom.IDHabitacion,
        fecha_inicio: this.refs.fechaInicio.value,
        fecha_fin: this.refs.fechaFin.value,
        hora_entrada: this.refs.horaEntrada.value || '14:00',
        hora_salida: this.refs.horaSalida.value || '12:00',

        // ✅ AQUÍ ESTÁ EL FIX REAL - CAMPO CORRECTO PARA BACKEND
        id_metodo_pago: parseInt(this.refs.metodoPago.value),

        estado: parseInt(this.refs.estadoReserva.value),

        total: Number(
          this.refs.totalAmount.textContent.replace(/[^0-9.]+/g, '')
        ),

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

      alert(' Reserva creada correctamente');

      // 🔄 RECARGAR
      await this.reloadData();
      this.renderReservationsTable(this.currentData.reservas);
      this.updateMetrics();
      this.showReservationsList();

    } catch (error) {
      console.error('❌ Error:', error);
      alert(error.message || 'Error al crear reserva');
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
      const cliente = this.currentData.clientes.find(c => c.id_cliente == reserva.id_cliente);
      const habitacion = this.currentData.habitaciones.find(h => h.id_habitacion == reserva.id_habitacion);
      
      const clienteName = cliente ? (cliente.NombreCompleto || `${cliente.Nombres || ''} ${cliente.Apellidos || ''}`.trim() || '').toLowerCase() : '';
      const habitacionNumber = habitacion ? (habitacion.numero || habitacion.Numero || '').toLowerCase() : '';
      
      const matchesSearch = !searchTerm || 
        clienteName.includes(searchTerm) ||
        habitacionNumber.includes(searchTerm) ||
        (reserva.id_reserva && reserva.id_reserva.toString().includes(searchTerm));
      
      const matchesStatus = !statusFilter || this._extractStatusId(reserva) == statusFilter;
      
      return matchesSearch && matchesStatus;
    });

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
      alert('Estado de reserva actualizado con éxito');
      
      // Actualizar datos locales y re-renderizar
      await this.reloadData();
      this.renderReservationsTable(this.currentData.reservas);
      this.updateMetrics();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert('No se pudo actualizar el estado de la reserva: ' + (error.message || 'Error desconocido'));
      // Re-renderizar para revertir el cambio visual en el select si falló
      this.renderReservationsTable(this.currentData.reservas);
    }
  }

  // View details of reservation in premium modal
  verDetalleReserva(id) {
    if (!id || id === 'undefined' || id === 'null') {
      alert('ID de reserva no válido');
      return;
    }
    const reserva = this.currentData.reservas.find(r => (r.id_reserva || r.IDReserva || r.IdReserva || r.id) == id);
    if (!reserva) {
      alert('Reserva no encontrada');
      return;
    }

    const cliente = this.currentData.clientes.find(c => (c.id_cliente || c.IDCliente) == reserva.id_cliente);
    const habitacion = this.currentData.habitaciones.find(h => (h.id_habitacion || h.IDHabitacion) == reserva.id_habitacion);
    const status = this._extractStatusId(reserva);

    // Populate modal elements
    document.getElementById('detalleReservaID').textContent = `ID: #${reserva.id_reserva || reserva.IDReserva || id}`;
    
    // Guest info
    document.getElementById('detResClienteNombre').textContent = cliente ? (cliente.NombreCompleto || `${cliente.Nombres || ''} ${cliente.Apellidos || ''}`.trim() || 'Cliente sin nombre') : reserva.nr_documento || 'Huésped Principal';
    document.getElementById('detResClienteDoc').textContent = `Doc: ${cliente ? (cliente.NroDocumento || cliente.nro_documento || '--') : reserva.nr_documento || '--'}`;
    document.getElementById('detResClienteEmail').textContent = `Email: ${cliente ? (cliente.Email || '--') : '--'}`;
    document.getElementById('detResClienteTel').textContent = `Tel: ${cliente ? (cliente.Telefono || '--') : '--'}`;

    // Room info
    document.getElementById('detResHabNombre').textContent = habitacion ? `Habitación ${habitacion.numero || habitacion.Numero} - ${habitacion.tipo || habitacion.Tipo}` : 'Sin Habitación';
    document.getElementById('detResHabPrecio').textContent = habitacion ? `$${this.formatCurrency(habitacion.precio || habitacion.Precio || 0)} / noche` : '--';

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
      alert('ID de reserva no válido');
      return;
    }
    const reserva = this.currentData.reservas.find(r => (r.id_reserva || r.IDReserva || r.IdReserva || r.id) == id);
    if (!reserva) {
      alert('Reserva no encontrada');
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
          <h2 style="color:var(--brand-deep)">✏️ Editar Reserva #${reserva.id_reserva || reserva.IDReserva}</h2>
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
                  <option value="${c.id_cliente || c.IDCliente}" ${ (c.id_cliente || c.IDCliente) == idCliente ? 'selected' : ''}>
                    ${c.NombreCompleto || `${c.Nombres || ''} ${c.Apellidos || ''}`.trim()} (${c.NroDocumento || c.nroDocumento})
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
                    ${hab.numero || hab.Numero} - ${hab.tipo || hab.Tipo}
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
      alert('Reserva actualizada exitosamente');
      
      // Reload data and go back to list
      await this.reloadData();
      this.showReservationsList();
    } catch (error) {
      console.error('Error actualizando reserva:', error);
      alert('Error al actualizar la reserva: ' + (error.message || 'Error desconocido'));
    }
  }
  
  // Delete reservation
  async deleteReserva(id) {
    if (!id || id === 'undefined' || id === 'null') {
      alert('ID de reserva no válido');
      return;
    }
    const reserva = this.currentData.reservas.find(r => (r.id_reserva || r.IDReserva || r.IdReserva || r.id) == id);
    if (!reserva) {
      alert('Reserva no encontrada');
      return;
    }
    
    const idCliente = reserva.id_cliente || reserva.IDCliente || (reserva.cliente ? reserva.cliente.id : null);
    const cliente = this.currentData.clientes.find(c => (c.id_cliente || c.IDCliente) == idCliente);
    const clienteName = cliente ? (cliente.NombreCompleto || `${cliente.Nombres || ''} ${cliente.Apellidos || ''}`.trim()) : 'Huésped';
    
    if (!confirm(`¿Está seguro de eliminar la reserva #${id} de ${clienteName}?`)) {
      return;
    }
    
    try {
      console.log(`Eliminando reserva ${id}`);
      await cancelarReserva(id);
      alert('Reserva eliminada exitosamente');
      
      await this.reloadData();
      this.showReservationsList();
    } catch (error) {
      console.error('Error eliminando reserva:', error);
      alert('Error al eliminar la reserva: ' + (error.message || 'Error desconocido'));
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
