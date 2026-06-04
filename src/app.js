const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const backendRoutes = path.join(__dirname, '..', 'backend', 'src', 'routes');

app.use('/api/usuarios', require(path.join(backendRoutes, 'usuarios.routes')));
app.use('/api/clientes', require(path.join(backendRoutes, 'clientes.routes')));
app.use('/api/password-recovery', require(path.join(backendRoutes, 'passwordrecovery.routes')));
app.use('/api/auth', require(path.join(backendRoutes, 'auth.routes')));

app.use('/api/roles', require(path.join(backendRoutes, 'roles.routes')));
app.use('/api/permisos', require(path.join(backendRoutes, 'permisos.routes')));
app.use('/api/rolespermisos', require(path.join(backendRoutes, 'rolespermisos.routes')));

app.use('/api/habitacion', require(path.join(backendRoutes, 'habitacion.routes')));
app.use('/api/habitaciones', require(path.join(backendRoutes, 'habitacion.routes')));
app.use('/api/paquetes', require(path.join(backendRoutes, 'paquetes.routes')));
app.use('/api/servicios', require(path.join(backendRoutes, 'servicios.routes')));

app.use('/api/reservas', require(path.join(backendRoutes, 'reservas.routes')));
app.use('/api/detallereservaservicio', require(path.join(backendRoutes, 'detallereservaservicio.routes')));
app.use('/api/detalledereservapaquetes', require(path.join(backendRoutes, 'detalledereservapaquetes.routes')));
app.use('/api/metodopago', require(path.join(backendRoutes, 'metodopago.routes')));
app.use('/api/estadosreserva', require(path.join(backendRoutes, 'estadosreserva.routes')));

app.get('/api', (req, res) => {
    res.json({ mensaje: 'API funcionando correctamente' });
});

const pageAliases = {
    'login.html': ['auth', 'login.html'],
    'registro.html': ['auth', 'registro.html'],
    'recuperar.html': ['auth', 'recuperar.html'],
    'dashboard-admin.html': ['admin', 'dashboard-admin.html'],
    'dashboard-cliente.html': ['cliente', 'dashboard.html'],
    'eliminar-cuenta.html': ['pages', 'eliminar-cuenta.html']
};

Object.entries(pageAliases).forEach(([route, target]) => {
    app.get(`/${route}`, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'frontend', ...target));
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.use((req, res) => {
    res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ ok: false, mensaje: 'Error interno', error: err.message });
});

module.exports = app;
