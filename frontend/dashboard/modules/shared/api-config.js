// API Configuration for frontend modules

const API_BASE_URL = 'https://ficha-3312967-proyecto-hospedaje-vialuna.onrender.com/api';
const TOKEN_KEY = 'vialuna_token';
const SESSION_KEY = 'vialuna_usuario';

export function apiUrl(endpoint = '') {
    const base = API_BASE_URL.replace(/\/+$/, '');
    const normalizedEndpoint = String(endpoint || '').replace(/^\/+/, '');
    return normalizedEndpoint ? `${base}/${normalizedEndpoint}` : base;
}

export function getConnectionErrorMessage(serviceName = 'el servicio') {
    return `No se pudo conectar con ${serviceName}. Por favor, verifica tu conexión a internet o intenta más tarde.`;
}

export function getAuthToken() {
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

export function getAuthHeaders() {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}
