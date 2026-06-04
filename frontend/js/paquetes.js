// Wrapper para inicializar el módulo de Paquetes cuando se carga la página pública
// Integra con el módulo existente en dashboard/modules/paquetes.js
import { apiUrl } from './shared/api-config.js';

async function initStandalone() {
    // Si la SPA ya inicializa el módulo, no hacemos nada
    if (window.paquetesModule) return;

    try {
        const mod = await import('../dashboard/modules/paquetes.js');
        // Intentar encontrar el contenedor principal del HTML público
        const main = document.querySelector('main.content') || document.body;
        // Si el HTML fue diseñado para inyectar en <main class="content">, usarlo
        const container = main;

        if (typeof mod.renderPaquetes === 'function') {
            mod.renderPaquetes(container);
        }
    } catch (err) {
        console.error('Error inicializando módulo de paquetes (standalone):', err);
    }
}

document.addEventListener('DOMContentLoaded', initStandalone);
