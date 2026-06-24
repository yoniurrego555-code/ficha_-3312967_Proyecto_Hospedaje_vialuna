// src/server.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

console.log("=== ENTORNO CARGADO ===");
if (!process.env.SMTP_PASS) {
  console.warn("⚠️ SMTP_PASS no configurado");
} else {
  console.log("SMTP_PASS = CARGADA");
}

if (!process.env.EMAIL_FROM) {
  console.warn("⚠️ EMAIL_FROM no configurado");
} else {
  console.log("EMAIL_FROM =", process.env.EMAIL_FROM);
}
console.log("ADMIN_EMAIL =", process.env.ADMIN_EMAIL);
console.log("=======================");

const app = require("./app"); // Importa la app de app.js
const pool = require("./config/db"); // Importar pool de base de datos
const PORT = process.env.PORT; // Puerto dinámico para producción
const { initCronJobs } = require("./services/cron.service"); // Importar cron jobs
const transporter = require("./config/mailer"); // Importar transporter de Nodemailer

// Validar conexión SMTP de forma no bloqueante
transporter.verify()
  .then(() => console.log("✅ Conexión SMTP exitosa. Listo para enviar correos."))
  .catch(error => console.error("❌ Error de conexión SMTP:", error.message || error));

// Script temporal para validar que la Base de Datos responde
async function checkDatabaseConnection() {
    try {
        const [rows] = await pool.query("SELECT NOW() as fecha;");
        console.log(`✅ Base de datos (TiDB/MySQL) conectada correctamente. Fecha DB: ${rows[0].fecha}`);
    } catch (error) {
        console.error("❌ Error detallado conectando a la base de datos:", error);
    }
}

// Inicia el servidor
app.listen(PORT, async () => {
    console.log(`Servidor de API corriendo exitosamente en el puerto ${PORT}`);
    await checkDatabaseConnection();
    initCronJobs(); // Iniciar tareas programadas de reservas
});