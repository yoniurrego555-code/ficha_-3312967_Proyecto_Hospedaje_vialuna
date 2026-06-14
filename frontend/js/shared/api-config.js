function getApiBase() {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const defaultOrigin = isLocalhost ? 'http://localhost:3000' : 'https://tu-backend-en-render.onrender.com';
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
