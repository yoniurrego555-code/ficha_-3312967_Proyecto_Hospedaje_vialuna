const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// Configuración para proxy inverso (Render, Railway, Heroku)
app.set("trust proxy", 1);

// Configuración de CORS dinámica
app.use(cors({
    origin: function (origin, callback) {
        // Permitir solicitudes sin origen (ej. Postman, curl) o si se especifica FRONTEND_URL como '*'
        if (!origin || process.env.FRONTEND_URL === '*') {
            return callback(null, true);
        }
        
        const allowedOrigins = [];
        
        // Usar unicamente FRONTEND_URL dinámicamente para producción segura
        if (process.env.FRONTEND_URL) {
            allowedOrigins.push(process.env.FRONTEND_URL);
        }

        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.resolve(__dirname, "../public/uploads")));

app.use("/api/usuarios", require("./routes/usuarios.routes"));
app.use("/api/clientes", require("./routes/clientes.routes"));
app.use("/api/password-recovery", require("./routes/passwordrecovery.routes"));
app.use("/api/auth", require("./routes/auth.routes"));

app.use("/api/roles", require("./routes/roles.routes"));
app.use("/api/permisos", require("./routes/permisos.routes"));
app.use("/api/rolespermisos", require("./routes/rolespermisos.routes"));

app.use("/api/habitacion", require("./routes/habitacion.routes"));
app.use("/api/habitaciones", require("./routes/habitacion.routes"));
app.use('/api/habitaciones/:habitacionId/imagenes', require('./routes/imagenes_habitacion.routes'));
app.use("/api/servicios", require("./routes/servicios.routes"));
app.use("/api/paquetes", require("./routes/paquetes.routes"));

app.use("/api/reservas", require("./routes/reservas.routes"));
app.use("/api/detallereservaservicio", require("./routes/detallereservaservicio.routes"));
app.use("/api/detalledereservapaquetes", require("./routes/detalledereservapaquetes.routes"));

app.use("/api/metodopago", require("./routes/metodopago.routes"));
app.use("/api/estadosreserva", require("./routes/estadosreserva.routes"));

app.get("/api", (req, res) => {
  res.json({ mensaje: "API funcionando correctamente" });
});

app.use((err, req, res, next) => {
  console.error("ERROR:", err.stack);

  res.status(500).json({
    mensaje: "Error interno del servidor",
    error: err.message
  });
});

module.exports = app;

// touch
// touch