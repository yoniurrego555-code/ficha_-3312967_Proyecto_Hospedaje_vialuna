import { getEstadosReserva } from './frontend/dashboard/core/api.js';

async function checkStatuses() {
    try {
        const statuses = await getEstadosReserva();
        console.log('Estados Reserva:', JSON.stringify(statuses, null, 2));
    } catch (e) {
        console.error('Error fetching statuses:', e);
    }
}

checkStatuses();
