import { isClientSession, getSession } from "../../dashboard/core/authGuard.js";
import { ReservasAdminModule } from "../../dashboard/modules/reservas-admin.js";

// ============================================================
// Init Nueva Reserva (Cliente) utilizando Módulo de Admin
// ============================================================
export async function renderNuevaReserva() {
    try {
        const session = getSession();
        if (!session || !isClientSession(session)) {
            window.location.href = '../auth/login.html';
            return;
        }

        const container = document.getElementById('reservationFormSection');
        if (!container) {
            console.error("No se encontró el contenedor #reservationFormSection");
            return;
        }

        // Instanciar el módulo reutilizable de admin en modo cliente
        const module = new ReservasAdminModule(container.parentElement, {
            isClientMode: true,
            showFormOnly: true,
            // Callback invocado después de guardar exitosamente
            onSaveSuccess: (result) => {
                setTimeout(() => {
                    window.location.hash = 'reservas';
                }, 1500);
            }
        });

        await module.initialize();
        
        // El módulo por defecto puede intentar mostrar la lista primero,
        // forzamos la vista del formulario.
        module.showReservationForm();

        // Ocultar botón "volver a lista en línea" ya que el cliente
        // navega con el sidebar SPA
        const backToListBtn = document.getElementById('backToListInlineBtn');
        if (backToListBtn) backToListBtn.style.display = 'none';

        // ==========================================
        // Lógica de Checkboxes y Modales (Cliente)
        // ==========================================
        const chkTerminos = document.getElementById('chkTerminos');
        const chkPrivacidad = document.getElementById('chkPrivacidad');
        const btnReservar = document.getElementById('confirmarReservaBtn');

        const updateBtnState = () => {
            if (chkTerminos && chkPrivacidad && btnReservar) {
                btnReservar.disabled = !(chkTerminos.checked && chkPrivacidad.checked);
            }
        };

        if (chkTerminos) chkTerminos.addEventListener('change', updateBtnState);
        if (chkPrivacidad) chkPrivacidad.addEventListener('change', updateBtnState);

        // Modales
        const modalTerminos = document.getElementById('modalTerminos');
        const modalPrivacidad = document.getElementById('modalPrivacidad');
        
        const openModal = (modal) => {
            if (modal) modal.classList.add('active');
        };
        const closeModal = (modal) => {
            if (modal) modal.classList.remove('active');
        };

        const linkTerminos = document.getElementById('linkTerminos');
        if (linkTerminos) {
            linkTerminos.addEventListener('click', (e) => {
                e.preventDefault();
                openModal(modalTerminos);
            });
        }

        const linkPrivacidad = document.getElementById('linkPrivacidad');
        if (linkPrivacidad) {
            linkPrivacidad.addEventListener('click', (e) => {
                e.preventDefault();
                openModal(modalPrivacidad);
            });
        }

        // Botones de cerrar
        const closeTerminos = document.getElementById('closeTerminos');
        if (closeTerminos) closeTerminos.addEventListener('click', () => closeModal(modalTerminos));

        const closePrivacidad = document.getElementById('closePrivacidad');
        if (closePrivacidad) closePrivacidad.addEventListener('click', () => closeModal(modalPrivacidad));

        // Cerrar al hacer clic fuera
        if (modalTerminos) {
            modalTerminos.addEventListener('click', (e) => {
                if (e.target === modalTerminos) closeModal(modalTerminos);
            });
        }
        if (modalPrivacidad) {
            modalPrivacidad.addEventListener('click', (e) => {
                if (e.target === modalPrivacidad) closeModal(modalPrivacidad);
            });
        }

    } catch (error) {
        console.error('Error inicializando vista de nueva reserva:', error);
    }
}
