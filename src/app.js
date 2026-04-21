// ======================
// 📦 IMPORTACIONES
// ======================
const express = require("express");
const cors = require("cors");
const path = require("path");

// ======================
// 🚀 CREAR APP
// ======================
const app = express();

// ======================
// 🧩 MIDDLEWARES
// ======================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/frontend", express.static(path.resolve(__dirname, "../../frontend")));


// ======================
// 🔗 RUTAS API
// ======================

// 👤 Usuarios y clientes
app.use("/api/usuarios", require("./routes/usuarios.routes"));
app.use("/api/clientes", require("./routes/clientes.routes"));
app.use("/api/password-recovery", require("./routes/passwordrecovery.routes"));

// 🔐 Seguridad
app.use("/api/roles", require("./routes/roles.routes"));
app.use("/api/permisos", require("./routes/permisos.routes"));
app.use("/api/rolespermisos", require("./routes/rolespermisos.routes"));

// 🏨 Hospedaje
app.use("/api/habitacion", require("./routes/habitacion.routes"));
app.use("/api/servicios", require("./routes/servicios.routes"));
app.use("/api/paquetes", require("./routes/paquetes.routes"));

// 📅 Reservas
app.use("/api/reservas", require("./routes/reservas.routes"));
app.use("/api/detallereservaservicio", require("./routes/detallereservaservicio.routes"));
app.use("/api/detalledereservapaquetes", require("./routes/detalledereservapaquetes.routes"));

// 💳 Pagos y estados
// 💳 Pagos y estados
app.use("/api/metodopago", require("./routes/metodopago.routes"));
app.use("/api/estadosreserva", require("./routes/estadosreserva.routes")); // nombre exacto
// ======================
// 🧪 RUTA DE PRUEBA
// ======================
app.get("/api", (req, res) => {
    res.json({ mensaje: "API funcionando correctamente 🚀" });
});

// ======================
// ❌ MANEJO DE ERRORES GLOBAL
// ======================
app.use((err, req, res, next) => {
    console.error("❌ ERROR:", err.stack);

    res.status(500).json({
        mensaje: "Error interno del servidor",
        error: err.message
    });
});

// ======================
// 📤 EXPORTAR APP
// ======================
module.exports = app;
