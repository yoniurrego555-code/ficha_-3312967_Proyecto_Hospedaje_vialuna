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

    } catch (error) {
        console.error('Error inicializando vista de nueva reserva:', error);
    }
}
