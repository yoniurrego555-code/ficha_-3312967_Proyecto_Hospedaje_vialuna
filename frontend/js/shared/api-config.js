function getApiBase() {
    const { protocol, hostname, port, origin } = window.location;

    if (protocol.startsWith('http') && hostname && (port === '3000' || origin === 'http://localhost:3000' || origin === 'http://127.0.0.1:3000')) {
        return `${origin}/api`;
    }

    return 'http://localhost:3000/api';
}

function apiUrl(path = '') {
    const base = getApiBase().replace(/\/+$/, '');
    const normalizedPath = String(path || '').replace(/^\/+/, '');
    return normalizedPath ? `${base}/${normalizedPath}` : base;
}

function getConnectionErrorMessage(resourceLabel = 'la API') {
    return `No fue posible conectar con ${resourceLabel}. Verifica que el backend este corriendo en localhost:3000.`;
}

export { getApiBase, apiUrl, getConnectionErrorMessage };
