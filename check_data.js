import { getReservas } from './frontend/dashboard/core/api.js';

async function checkData() {
    try {
        const reservas = await getReservas();
        console.log('Sample Reserva:', JSON.stringify(reservas[0], null, 2));
    } catch (e) {
        console.error('Error fetching reservas:', e);
    }
}

checkData();
