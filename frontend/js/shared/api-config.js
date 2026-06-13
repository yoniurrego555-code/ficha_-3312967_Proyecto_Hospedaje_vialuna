function getApiBase() {
    // Prefer backend at localhost:3000 (default dev server).
    // If frontend is served from a different origin (eg. Live Server 5500), prefer explicit backend.
    const defaultOrigin = 'http://localhost:3000';
    return `${defaultOrigin}/api`;
}

function apiUrl(path = '') {
    const base = getApiBase().replace(/\/+$/, '');
    const normalizedPath = String(path || '').replace(/^\/+/, '');
    return normalizedPath ? `${base}/${normalizedPath}` : base;
}

function backendOrigin() {
    const api = getApiBase();
    return api.replace(/\/api\/?$/, '');
}

function backendUrl(path = '') {
    const origin = backendOrigin().replace(/\/+$/, '');
    const normalized = String(path || '').replace(/^\/+/, '');
    return normalized ? `${origin}/${normalized}` : origin;
}

function getConnectionErrorMessage(resourceLabel = 'la API') {
    return `No fue posible conectar con ${resourceLabel}. Verifica que el backend esté corriendo en ${backendOrigin()}.`;
}

export { getApiBase, apiUrl, backendOrigin, backendUrl, getConnectionErrorMessage };
