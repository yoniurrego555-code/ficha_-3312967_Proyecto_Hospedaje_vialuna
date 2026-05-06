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

// Admin Reservas module
export class ReservasAdminModule {
  constructor(container) {
    this.container = container;
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
      const [clientes, habitaciones, paquetes, servicios, reservas] = await Promise.all([
        getClientes(),
        getHabitaciones(),
        getPaquetes(),
        getServicios(),
        getReservas()
      ]);

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

  // Render rooms
  renderRooms(habitaciones) {
    const activeRooms = this.currentData.selectedRoom ? [this.currentData.selectedRoom] : [];
    const availableRooms = habitaciones.filter(h => Number(h.Estado) === 1);
    
    if (!this.refs.roomSelection) {
      console.error('roomSelection container not found');
      return;
    }
    
    this.refs.roomSelection.innerHTML = availableRooms.map(hab => `
      <div class="room-card modern-card ${activeRooms.find(r => (r.id_habitacion || r.IDHabitacion) == (hab.id_habitacion || hab.IDHabitacion)) ? 'selected' : ''}" 
           data-id="${hab.id_habitacion || hab.IDHabitacion}"
           style="cursor: pointer; transition: all 0.3s ease; border: 2px solid #ddd; border-radius: 12px; padding: 20px; margin: 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; position: relative; overflow: hidden;">
        <div class="room-info" style="position: relative; z-index: 2;">
          <h4 style="margin: 0 0 8px 0; font-size: 1.2em; font-weight: bold;">🏨 ${hab.numero || hab.Numero || hab.numero_habitacion || hab.NumeroHabitacion || `Habitación ${hab.id_habitacion || hab.IDHabitacion}`}</h4>
          <p style="margin: 0 0 8px 0; opacity: 0.9;">${hab.tipo || hab.Tipo || hab.tipo_habitacion || hab.TipoHabitacion || 'Estándar'}</p>
          <p class="room-price" style="margin: 0; font-size: 1.1em; font-weight: bold;">💰 $${this.formatCurrency(hab.precio || hab.Precio || hab.precio_noche || hab.PrecioNoche || 0)}/noche</p>
        </div>
        <div class="card-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.1); opacity: 0; transition: opacity 0.3s ease;"></div>
      </div>
    `).join('');

    // Add click handlers
    this.container.querySelectorAll('.room-card').forEach(card => {
      card.addEventListener('click', () => {
        this.container.querySelectorAll('.room-card').forEach(c => {
          c.classList.remove('selected');
          c.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        });
        card.classList.add('selected');
        card.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        
        const roomId = parseInt(card.dataset.id);
        console.log('🔥 ID seleccionado (convertido a número):', roomId);
        console.log('🔥 Buscando en this.currentData.habitaciones:', this.currentData.habitaciones);
        
        this.currentData.selectedRoom = this.currentData.habitaciones.find(h => parseInt(h.id_habitacion || h.IDHabitacion) === roomId);
        
        console.log('🔥 Habitación encontrada y guardada:', this.currentData.selectedRoom);
        
        this.calculateTotal();
      });
      
      // Add hover effects
      card.addEventListener('mouseenter', () => {
        if (!card.classList.contains('selected')) {
          card.style.transform = 'translateY(-5px)';
          card.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
          card.querySelector('.card-overlay').style.opacity = '1';
        }
      });
      
      card.addEventListener('mouseleave', () => {
        if (!card.classList.contains('selected')) {
          card.style.transform = 'translateY(0)';
          card.style.boxShadow = 'none';
          card.querySelector('.card-overlay').style.opacity = '0';
        }
      });
    });
  }

  // Render packages
  renderPackages(paquetes) {
    const activePackages = paquetes.filter(p => Number(p.Estado) === 1);
    
    if (!this.refs.packagesGrid) {
      console.error('packagesGrid container not found');
      return;
    }
    
    if (this.refs.packagesGrid) {
      this.refs.packagesGrid.innerHTML = activePackages.map(pkg => `
        <div class="package-checkbox modern-package" style="position: relative; margin: 10px;">
          <input type="checkbox" id="pkg_${pkg.id_paquete || pkg.IDPaquete}" 
                 data-package-id="${pkg.id_paquete || pkg.IDPaquete}" 
                 ${this.currentData.selectedPackages.find(p => (p.id_paquete || p.IDPaquete) == (pkg.id_paquete || pkg.IDPaquete)) ? 'checked' : ''}
                 style="position: absolute; opacity: 0; cursor: pointer;">
          <label for="pkg_${pkg.id_paquete || pkg.IDPaquete}" 
                 class="package-label modern-label"
                 style="display: block; cursor: pointer; border: 2px solid #ddd; border-radius: 12px; padding: 20px; margin: 0; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; position: relative; overflow: hidden; transition: all 0.3s ease;">
            <div class="package-info" style="position: relative; z-index: 2;">
              <h4 style="margin: 0 0 8px 0; font-size: 1.1em; font-weight: bold;">📦 ${pkg.nombre || pkg.Nombre || pkg.nombre_paquete || pkg.NombrePaquete || `Paquete ${pkg.id_paquete || pkg.IDPaquete}`}</h4>
              <p style="margin: 0 0 8px 0; opacity: 0.9; font-size: 0.9em;">${pkg.descripcion || pkg.Descripcion || pkg.descripcion_paquete || pkg.DescripcionPaquete || 'Sin descripción'}</p>
              <span class="package-price" style="font-weight: bold; font-size: 1.1em;">💵 $${this.formatCurrency(pkg.precio || pkg.Precio || pkg.precio_paquete || pkg.PrecioPaquete || 0)}</span>
            </div>
            <div class="check-overlay" style="position: absolute; top: 10px; right: 10px; width: 24px; height: 24px; border: 2px solid white; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center;">
              <span style="display: none; font-size: 14px;">✓</span>
            </div>
          </label>
        </div>
      `).join('');

      // Add change handlers and visual effects
      this.container.querySelectorAll('.package-checkbox input').forEach(checkbox => {
        const label = checkbox.nextElementSibling;
        const checkOverlay = label.querySelector('.check-overlay span');
        
        // Update initial state
        if (checkbox.checked) {
          label.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
          label.style.transform = 'scale(1.02)';
          checkOverlay.style.display = 'block';
        }
        
        checkbox.addEventListener('change', () => {
          const pkgId = checkbox.dataset.packageId;
          const pkg = activePackages.find(p => (p.id_paquete || p.IDPaquete) == pkgId);
          
          if (checkbox.checked && pkg) {
            this.currentData.selectedPackages.push(pkg);
            label.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
            label.style.transform = 'scale(1.02)';
            checkOverlay.style.display = 'block';
          } else {
            this.currentData.selectedPackages = this.currentData.selectedPackages.filter(p => (p.id_paquete || p.IDPaquete) != pkgId);
            label.style.background = 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
            label.style.transform = 'scale(1)';
            checkOverlay.style.display = 'none';
          }
          
          this.calculateTotal();
        });
        
        // Add hover effects
        label.addEventListener('mouseenter', () => {
          if (!checkbox.checked) {
            label.style.transform = 'translateY(-3px) scale(1.01)';
            label.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
          }
        });
        
        label.addEventListener('mouseleave', () => {
          if (!checkbox.checked) {
            label.style.transform = 'scale(1)';
            label.style.boxShadow = 'none';
          }
        });
      });
    }
  }

  // Render services
  renderServices(servicios) {
    const activeServices = servicios.filter(s => Number(s.Estado) === 1);
    
    if (!this.refs.servicesGrid) {
      console.error('servicesGrid container not found');
      return;
    }
    
    if (this.refs.servicesGrid) {
      this.refs.servicesGrid.innerHTML = activeServices.map(service => `
        <div class="service-checkbox modern-service" style="position: relative; margin: 10px;">
          <input type="checkbox" id="svc_${service.id_servicio || service.IDServicio}" 
                 data-service-id="${service.id_servicio || service.IDServicio}" 
                 ${this.currentData.selectedServices.find(s => (s.id_servicio || s.IDServicio) == (service.id_servicio || service.IDServicio)) ? 'checked' : ''}
                 style="position: absolute; opacity: 0; cursor: pointer;">
          <label for="svc_${service.id_servicio || service.IDServicio}" 
                 class="service-label modern-label"
                 style="display: block; cursor: pointer; border: 2px solid #ddd; border-radius: 12px; padding: 20px; margin: 0; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; position: relative; overflow: hidden; transition: all 0.3s ease;">
            <div class="service-info" style="position: relative; z-index: 2;">
              <h4 style="margin: 0 0 8px 0; font-size: 1.1em; font-weight: bold;">🎯 ${service.nombre || service.Nombre || service.nombre_servicio || service.NombreServicio || `Servicio ${service.id_servicio || service.IDServicio}`}</h4>
              <p style="margin: 0 0 8px 0; opacity: 0.9; font-size: 0.9em;">${service.descripcion || service.Descripcion || service.descripcion_servicio || service.DescripcionServicio || 'Sin descripción'}</p>
              <span class="service-price" style="font-weight: bold; font-size: 1.1em;">⭐ $${this.formatCurrency(service.precio || service.Precio || service.Costo || service.costo || service.precio_servicio || service.PrecioServicio || 0)}</span>
            </div>
            <div class="check-overlay" style="position: absolute; top: 10px; right: 10px; width: 24px; height: 24px; border: 2px solid white; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center;">
              <span style="display: none; font-size: 14px;">✓</span>
            </div>
          </label>
        </div>
      `).join('');

      // Add change handlers and visual effects
      this.container.querySelectorAll('.service-checkbox input').forEach(checkbox => {
        const label = checkbox.nextElementSibling;
        const checkOverlay = label.querySelector('.check-overlay span');
        
        // Update initial state
        if (checkbox.checked) {
          label.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
          label.style.transform = 'scale(1.02)';
          checkOverlay.style.display = 'block';
        }
        
        checkbox.addEventListener('change', () => {
          const svcId = checkbox.dataset.serviceId;
          const service = activeServices.find(s => (s.id_servicio || s.IDServicio) == svcId);
          
          if (checkbox.checked && service) {
            this.currentData.selectedServices.push(service);
            label.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            label.style.transform = 'scale(1.02)';
            checkOverlay.style.display = 'block';
          } else {
            this.currentData.selectedServices = this.currentData.selectedServices.filter(s => (s.id_servicio || s.IDServicio) != svcId);
            label.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
            label.style.transform = 'scale(1)';
            checkOverlay.style.display = 'none';
          }
          
          this.calculateTotal();
        });
        
        // Add hover effects
        label.addEventListener('mouseenter', () => {
          if (!checkbox.checked) {
            label.style.transform = 'translateY(-3px) scale(1.01)';
            label.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
          }
        });
        
        label.addEventListener('mouseleave', () => {
          if (!checkbox.checked) {
            label.style.transform = 'scale(1)';
            label.style.boxShadow = 'none';
          }
        });
      });
    }
  }

  // Render reservations table
  renderReservationsTable(reservas) {
    if (!this.refs.reservationsTableBody) return;
    
    if (!reservas.length) {
      this.refs.reservationsTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay reservas registradas.</td></tr>';
      return;
    }

    this.refs.reservationsTableBody.innerHTML = reservas.map(reserva => {
      const cliente = this.currentData.clientes.find(c => c.id_cliente == reserva.id_cliente);
      const habitacion = this.currentData.habitaciones.find(h => h.id_habitacion == reserva.id_habitacion);
      
      return `
      <tr>
        <td>#${reserva.id_reserva}</td>
        <td>${cliente ? (cliente.NombreCompleto || `${cliente.Nombres || ''} ${cliente.Apellidos || ''}`.trim() || 'Cliente sin nombre') : reserva.nr_documento || "Sin cliente"}</td>
        <td>${habitacion ? (habitacion.numero || habitacion.Numero || 'N/A') : "Sin habitación"}</td>
        <td>${reserva.fecha_inicio || "--"} al ${reserva.fecha_fin || "--"}</td>
        <td>$${this.formatCurrency(reserva.total || 0)}</td>
        <td><span class="status-badge ${this.getStatusClass(reserva.Estado)}">${this.getStatusText(reserva.Estado)}</span></td>
        <td>
          <div class="action-buttons">
            <button class="action-btn-small edit-btn" data-id="${reserva.id_reserva}">
              ✏️ Editar
            </button>
            <button class="action-btn-small delete-btn" data-id="${reserva.id_reserva}">
              🗑️ Eliminar
            </button>
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
    const activeReservations = this.currentData.reservas.filter(r => Number(r.Estado) === 1);
    const monthlyIncome = this.currentData.reservas.reduce((sum, r) => sum + Number(r.total || 0), 0);

    if (this.refs.totalReservations) this.refs.totalReservations.textContent = this.currentData.reservas.length;
    if (this.refs.activeReservations) this.refs.activeReservations.textContent = activeReservations.length;
    if (this.refs.todayReservations) this.refs.todayReservations.textContent = todayReservations.length;
    if (this.refs.monthlyRevenue) this.refs.monthlyRevenue.textContent = `$${this.formatCurrency(monthlyIncome)}`;
  }

  // Calculate total
  calculateTotal() {
    let subtotal = 0;
    
    // Room price
    if (this.currentData.selectedRoom) {
      const roomPrice = Number(this.currentData.selectedRoom.precio || this.currentData.selectedRoom.Precio || 0);
      subtotal += roomPrice;
    }
    
    // Package prices
    this.currentData.selectedPackages.forEach(pkg => {
      if (pkg) {
        subtotal += Number(pkg.precio || pkg.Precio || pkg.precio_unitario || pkg.PrecioUnitario || 0);
      }
    });
    
    // Service prices
    this.currentData.selectedServices.forEach(service => {
      if (service) {
        subtotal += Number(service.precio || service.Precio || service.Costo || service.costo || 0);
      }
    });
    
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
    if (this.refs.reservationFormSection) this.refs.reservationFormSection.style.display = 'block';
    this.clearForm();
  }

  // Show reservations list
  showReservationsList() {
    if (this.refs.reservationFormSection) this.refs.reservationFormSection.style.display = 'none';
    if (this.refs.reservationsListSection) this.refs.reservationsListSection.style.display = 'block';
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
          this.refs.totalAmount.textContent.replace(/[^0-9.-]+/g, '')
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
      
      const matchesStatus = !statusFilter || reserva.Estado == statusFilter;
      
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
      '2': 'status-completed',
      '3': 'status-cancelled',
      'activo': 'status-active',
      'completada': 'status-completed',
      'cancelada': 'status-cancelled',
      'active': 'status-active',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled'
    };
    return statusMap[String(estado).toLowerCase()] || 'status-active';
  }

  getStatusText(estado) {
    const statusMap = {
      '1': 'Activo',
      '2': 'Completada',
      '3': 'Cancelada',
      'activo': 'Activo',
      'completada': 'Completada',
      'cancelada': 'Cancelada'
    };
    return statusMap[estado] || estado || 'Desconocido';
  }

  // Edit reservation
  async editReserva(id) {
    const reserva = this.currentData.reservas.find(r => r.id_reserva == id);
    if (!reserva) {
      alert('Reserva no encontrada');
      return;
    }
    
    // Show edit form (similar to create form but with pre-filled data)
    this.showEditReservationForm(reserva);
  }
  
  // Show edit reservation form
  showEditReservationForm(reserva) {
    const cliente = this.currentData.clientes.find(c => c.id_cliente == reserva.id_cliente);
    const habitacion = this.currentData.habitaciones.find(h => h.id_habitacion == reserva.id_habitacion);
    
    this.container.innerHTML = `
      <div class="reservations-form-view">
        <div class="form-header">
          <h2>Editar Reserva #${reserva.id_reserva}</h2>
          <button onclick="window.reservasModule.showReservationsList()" class="btn-back">
            ← Volver a la lista
          </button>
        </div>
        
        <form id="editReservationForm" class="reservation-form">
          <div class="form-grid">
            <div class="form-group">
              <label>Cliente:</label>
              <select id="editClienteSelect" required>
                <option value="">Seleccionar cliente</option>
                ${this.currentData.clientes.map(cliente => `
                  <option value="${cliente.id_cliente}" ${cliente.id_cliente == reserva.id_cliente ? 'selected' : ''}>
                    ${cliente.NombreCompleto || `${cliente.Nombres || ''} ${cliente.Apellidos || ''}`.trim()} (${cliente.NroDocumento})
                  </option>
                `).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label>Habitación:</label>
              <select id="editHabitacionSelect" required>
                <option value="">Seleccionar habitación</option>
                ${this.currentData.habitaciones.map(hab => `
                  <option value="${hab.id_habitacion}" ${hab.id_habitacion == reserva.id_habitacion ? 'selected' : ''}>
                    ${hab.numero || hab.Numero} - ${hab.tipo || hab.Tipo}
                  </option>
                `).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label>Fecha Inicio:</label>
              <input type="date" id="editFechaInicio" value="${reserva.fecha_inicio}" required>
            </div>
            
            <div class="form-group">
              <label>Fecha Fin:</label>
              <input type="date" id="editFechaFin" value="${reserva.fecha_fin}" required>
            </div>
            
            <div class="form-group">
              <label>Hora Entrada:</label>
              <input type="time" id="editHoraEntrada" value="${reserva.hora_entrada || '14:00'}">
            </div>
            
            <div class="form-group">
              <label>Hora Salida:</label>
              <input type="time" id="editHoraSalida" value="${reserva.hora_salida || '12:00'}">
            </div>
            
            <div class="form-group">
              <label>Método de Pago:</label>
              <select id="editMetodoPago" required>
                <option value="">Seleccionar método</option>
                <option value="1" ${reserva.metodo_pago === 1 ? 'selected' : ''}>Efectivo</option>
                <option value="2" ${reserva.metodo_pago === 2 ? 'selected' : ''}>Tarjeta</option>
                <option value="3" ${reserva.metodo_pago === 3 ? 'selected' : ''}>Transferencia</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Estado:</label>
              <select id="editEstadoReserva" required>
                <option value="1" ${reserva.Estado == 1 ? 'selected' : ''}>Activo</option>
                <option value="2" ${reserva.Estado == 2 ? 'selected' : ''}>Completada</option>
                <option value="3" ${reserva.Estado == 3 ? 'selected' : ''}>Cancelada</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Total:</label>
              <input type="number" id="editTotalAmount" value="${reserva.total}" step="0.01" required>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn-primary">Actualizar Reserva</button>
            <button type="button" onclick="window.reservasModule.showReservationsList()" class="btn-secondary">Cancelar</button>
          </div>
        </form>
      </div>
    `;
    
    // Setup form submission
    this.container.querySelector('#editReservationForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveReserva(reserva.id_reserva);
    });
  }
  
  // Save edited reservation
  async saveReserva(id) {
    const formData = {
      id_cliente: parseInt(this.container.querySelector('#editClienteSelect').value),
      id_habitacion: parseInt(this.container.querySelector('#editHabitacionSelect').value),
      fecha_inicio: this.container.querySelector('#editFechaInicio').value,
      fecha_fin: this.container.querySelector('#editFechaFin').value,
      hora_entrada: this.container.querySelector('#editHoraEntrada').value || '14:00',
      hora_salida: this.container.querySelector('#editHoraSalida').value || '12:00',
      metodo_pago: this.container.querySelector('#editMetodoPago').value,
      estado: parseInt(this.container.querySelector('#editEstadoReserva').value),
      total: parseFloat(this.container.querySelector('#editTotalAmount').value)
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
    const reserva = this.currentData.reservas.find(r => r.id_reserva == id);
    if (!reserva) {
      alert('Reserva no encontrada');
      return;
    }
    
    const cliente = this.currentData.clientes.find(c => c.id_cliente == reserva.id_cliente);
    const clienteName = cliente ? (cliente.NombreCompleto || `${cliente.Nombres || ''} ${cliente.Apellidos || ''}`.trim()) : 'Cliente desconocido';
    
    if (!confirm(`¿Está seguro de eliminar la reserva #${reserva.id_reserva} de ${clienteName}? Esta acción no se puede deshacer.`)) {
      return;
    }
    
    try {
      console.log(`Eliminando reserva ${id}`);
      await cancelarReserva(id);
      alert('Reserva eliminada exitosamente');
      
      // Reload data and refresh list
      await this.reloadData();
      this.showReservationsList();
    } catch (error) {
      console.error('Error eliminando reserva:', error);
      alert('Error al eliminar la reserva: ' + (error.message || 'Error desconocido'));
    }
  }
  
  // Reload all data
  async reloadData() {
    const [clientes, habitaciones, paquetes, servicios, reservas] = await Promise.all([
      getClientes(),
      getHabitaciones(),
      getPaquetes(),
      getServicios(),
      getReservas()
    ]);
    
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

// HTML template for the reservas module
const reservasTemplate = `
  <div class="dashboard-header">
    <h1>Reservas</h1>
    <p>Gestiona todas las reservas del hotel</p>
  </div>

  <!-- Metrics -->
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-icon">📊</div>
      <div class="metric-content">
        <h3>Total Reservas</h3>
        <p class="metric-value" id="totalReservations">0</p>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-icon">✅</div>
      <div class="metric-content">
        <h3>Reservas Activas</h3>
        <p class="metric-value" id="activeReservations">0</p>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-icon">📅</div>
      <div class="metric-content">
        <h3>Reservas Hoy</h3>
        <p class="metric-value" id="todayReservations">0</p>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-icon">💰</div>
      <div class="metric-content">
        <h3>Ingresos del Mes</h3>
        <p class="metric-value" id="monthlyRevenue">$0</p>
      </div>
    </div>
  </div>

  <!-- Reservations List Section -->
  <div class="reservations-section" id="reservationsListSection">
    <div class="section-header">
      <h2>Lista de Reservas</h2>
      <button class="btn-primary" id="showReservationFormBtn">
        <span>➕</span> Crear Nueva Reserva
      </button>
    </div>

    <!-- Filters -->
    <div class="filters-container">
      <input type="text" class="search-input" id="searchReservations" placeholder="Buscar reservas...">
      <select class="filter-select" id="filterStatus">
        <option value="">Todos los estados</option>
        <option value="1">Activa</option>
        <option value="2">Completada</option>
        <option value="3">Cancelada</option>
      </select>
    </div>

    <!-- Table -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Habitación</th>
            <th>Fechas</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="reservationsTableBody">
          <tr><td colspan="7" class="empty-state">Cargando...</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Reservation Form Section -->
  <div class="reservation-form-section" id="reservationFormSection" style="display: none;">
    <div class="section-header">
      <h2>Nueva Reserva</h2>
      <button class="btn-secondary" id="cancelNewReservationBtn">Cancelar</button>
    </div>

    <form class="reservation-form" id="reservationForm">
      <!-- Basic Information -->
      <div class="form-section">
        <h3>Información Básica</h3>
        <div class="form-grid">
          <div class="form-group">
            <label for="clienteSelect">Cliente *</label>
            <select id="clienteSelect" required>
              <option value="">Seleccionar cliente...</option>
            </select>
          </div>
          <div class="form-group">
            <label for="documentoInput">Documento</label>
            <input type="text" id="documentoInput" readonly>
          </div>
          <div class="form-group">
            <label for="fechaInicio">Fecha Inicio *</label>
            <input type="date" id="fechaInicio" required min="">
          </div>
          <div class="form-group">
            <label for="fechaFin">Fecha Fin *</label>
            <input type="date" id="fechaFin" required min="">
          </div>
          <div class="form-group">
            <label for="horaEntrada">Hora Entrada</label>
            <input type="time" id="horaEntrada" value="14:00">
          </div>
          <div class="form-group">
            <label for="horaSalida">Hora Salida</label>
            <input type="time" id="horaSalida" value="12:00">
          </div>
        </div>
      </div>

      <!-- Room Selection -->
      <div class="form-section">
        <h3>Selección de Habitación *</h3>
        <div class="room-selection" id="roomSelection">
          <!-- Rooms will be loaded here -->
        </div>
      </div>

      <!-- Packages -->
      <div class="form-section">
        <h3>Paquetes Adicionales</h3>
        <div class="packages-grid" id="packagesGrid">
          <!-- Packages will be loaded here -->
        </div>
      </div>

      <!-- Services -->
      <div class="form-section">
        <h3>Servicios Adicionales</h3>
        <div class="services-grid" id="servicesGrid">
          <!-- Services will be loaded here -->
        </div>
      </div>

      <!-- Payment Information -->
      <div class="form-section">
        <h3>Información de Pago</h3>
        <div class="form-grid">
          <div class="form-group">
            <label for="metodoPago">Método de Pago *</label>
            <select id="metodoPago" required>
              <option value="">Seleccionar...</option>
              <option value="1">Efectivo</option>
              <option value="2">Tarjeta</option>
              <option value="3">Transferencia</option>
            </select>
          </div>
          <div class="form-group">
            <label for="estadoReserva">Estado Reserva *</label>
            <select id="estadoReserva" required>
              <option value="1">Activa</option>
              <option value="2">Pendiente</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Total -->
      <div class="form-section">
        <div class="total-section">
          <div class="total-row">
            <span>Subtotal:</span>
            <span id="subtotal">$0</span>
          </div>
          <div class="total-row">
            <strong>Total:</strong>
            <strong id="totalAmount">$0</strong>
          </div>
        </div>
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="clearFormBtn">Limpiar Formulario</button>
        <button type="submit" class="btn-primary">Crear Reserva</button>
      </div>
    </form>
  </div>
`;

// Export function for SPA integration
export async function renderReservas(container) {
  try {
    // Insert HTML template
    container.innerHTML = reservasTemplate;
    
    // Create and initialize module
    const reservasModule = new ReservasAdminModule(container);
    await reservasModule.initialize();
    
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
