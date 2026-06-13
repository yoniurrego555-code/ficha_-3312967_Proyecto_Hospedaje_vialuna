// src/server.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

console.log("=== ENTORNO CARGADO ===");
console.log("RESEND_API_KEY =", process.env.RESEND_API_KEY ? "CARGADA" : "NO CARGADA");
console.log("EMAIL_FROM =", process.env.EMAIL_FROM);
console.log("ADMIN_EMAIL =", process.env.ADMIN_EMAIL);
console.log("=======================");

const app = require("./app"); // Importa la app de app.js
const PORT = process.env.PORT || 3000; // Puerto configurable

// Inicia el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});