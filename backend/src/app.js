const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// =====================================
// 🔥 CONFIGURACIÓN BASE
// =====================================

// Si estás detrás de Render / proxy
app.set("trust proxy", 1);

// =====================================
// 🌐 CORS PRODUCCIÓN + DESARROLLO
// =====================================

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:5500",
    "http://127.0.0.1:5501",
    "https://ficha-3312967-proyecto-hospedaje-vi.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// =====================================
// 📦 MIDDLEWARES
// =====================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================================
// 📁 ARCHIVOS ESTÁTICOS
// =====================================

app.use("/uploads", express.static(path.resolve(__dirname, "../public/uploads")));

// =====================================
// 🛣️ RUTAS
// =====================================

app.use("/api/usuarios", require("./routes/usuarios.routes"));
app.use("/api/clientes", require("./routes/clientes.routes"));
app.use("/api/password-recovery", require("./routes/passwordrecovery.routes"));
app.use("/api/auth", require("./routes/auth.routes"));

app.use("/api/roles", require("./routes/roles.routes"));
app.use("/api/permisos", require("./routes/permisos.routes"));
app.use("/api/rolespermisos", require("./routes/rolespermisos.routes"));

app.use("/api/habitacion", require("./routes/habitacion.routes"));
app.use("/api/habitaciones", require("./routes/habitacion.routes"));
app.use("/api/habitaciones/:habitacionId/imagenes", require("./routes/imagenes_habitacion.routes"));

app.use("/api/servicios", require("./routes/servicios.routes"));
app.use("/api/paquetes", require("./routes/paquetes.routes"));

app.use("/api/reservas", require("./routes/reservas.routes"));
app.use("/api/detallereservaservicio", require("./routes/detallereservaservicio.routes"));
app.use("/api/detalledereservapaquetes", require("./routes/detalledereservapaquetes.routes"));

app.use("/api/metodopago", require("./routes/metodopago.routes"));
app.use("/api/estadosreserva", require("./routes/estadosreserva.routes"));

// =====================================
// 🧪 TEST API
// =====================================

app.get("/api", (req, res) => {
  res.json({ mensaje: "API funcionando correctamente 🚀" });
});

// =====================================
// ❌ ERROR HANDLER
// =====================================

app.use((err, req, res, next) => {
  console.error("ERROR:", err);

  res.status(500).json({
    mensaje: "Error interno del servidor",
    error: err.message
  });
});

module.exports = app;