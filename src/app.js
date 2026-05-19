const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const usuariosRoutes = require('./routes/usuarios_crud.routes');
const habitacionesRoutes = require('./routes/habitaciones.routes');
const paquetesRoutes = require('./routes/paquetes.routes');
const serviciosRoutes = require('./routes/servicios.routes');
const reservasRoutes = require('./routes/reservas.routes');
const detalleReservasRoutes = require('./routes/detalle_reservas.routes');

app.use('/api/usuarios', require('../backend/src/routes/usuarios.routes'));
app.use('/api/roles', require('../backend/src/routes/roles.routes'));
app.use('/api/permisos', require('../backend/src/routes/permisos.routes'));
app.use('/api/rolespermisos', require('../backend/src/routes/rolespermisos.routes'));
app.use('/api/habitaciones', habitacionesRoutes);
app.use('/api/paquetes', paquetesRoutes);
app.use('/api/servicios', serviciosRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/detalle_reservas', detalleReservasRoutes);

[
    'index.html',
    'login.html',
    'registro.html',
    'recuperar.html',
    'eliminar-cuenta.html',
    'reservar.html',
    'habitaciones.html',
    'paquetes.html',
    'servicios.html',
    'usuarios.html',
    'reservas.html'
].forEach((page) => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', page));
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'index.html'));
});

app.use((req, res) => {
    res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ ok: false, mensaje: 'Error interno' });
});

module.exports = app;
