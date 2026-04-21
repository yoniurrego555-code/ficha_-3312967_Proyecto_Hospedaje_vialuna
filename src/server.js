// src/server.js
require("dotenv").config();
const app = require("./app"); // Importa la app de app.js
const PORT = process.env.PORT || 3000; // Puerto configurable

// Inicia el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});