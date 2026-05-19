// API Configuration for frontend modules

const API_BASE_URL = 'http://localhost:3000/api';

export function apiUrl(endpoint) {
    return `${API_BASE_URL}/${endpoint}`;
}

export function getConnectionErrorMessage(serviceName = 'el servicio') {
    return `No se pudo conectar con ${serviceName}. Por favor, verifica tu conexión a internet o intenta más tarde.`;
}

export function getAuthHeaders() {
    const token = localStorage.getItem('vialuna_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}
