function getApiBase() {
    const defaultOrigin =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:10000'
            : 'https://ficha-3312967-proyecto-hospedaje-vialuna.onrender.com';

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

function getFullImageUrl(imagePath) {
    if (!imagePath) return 'assets/images/placeholder.png';
    // Si ya es absoluta, data URI, o ruta local del frontend, devolverla tal cual
    if (imagePath.startsWith('http') || imagePath.startsWith('data:') || imagePath.startsWith('./') || imagePath.startsWith('../') || imagePath.startsWith('assets/')) {
        return imagePath;
    }
    const cleanPath = imagePath.replace(/^\/+/, '');
    const isUpload = cleanPath.startsWith('uploads/') ? cleanPath : `uploads/${cleanPath}`;
    return `${backendOrigin()}/${isUpload}`;
}

const TOKEN_KEY = 'vialuna_token';
const SESSION_KEY = 'vialuna_usuario';

function getAuthToken() {
    const storedToken =
        sessionStorage.getItem(TOKEN_KEY) ||
        sessionStorage.getItem('token') ||
        '';

    if (storedToken) {
        return storedToken;
    }

    try {
        const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
        return session?.token || '';
    } catch {
        return '';
    }
}

function getAuthHeaders() {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export { getApiBase, apiUrl, backendOrigin, backendUrl, getConnectionErrorMessage, getFullImageUrl, getAuthToken, getAuthHeaders };

