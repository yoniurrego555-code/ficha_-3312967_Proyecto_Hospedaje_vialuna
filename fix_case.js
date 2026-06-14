const fs = require('fs');
const path = require('path');

const filesToFix = [
  "backend/src/routes/clientes.routes.js",
  "backend/src/routes/habitacion.routes.js",
  "backend/src/routes/imagenes_habitacion.routes.js",
  "backend/src/routes/paquetes.routes.js",
  "backend/src/routes/reservas.routes.js",
  "backend/src/routes/servicios.routes.js"
];

for (const relPath of filesToFix) {
    const fullPath = path.join(__dirname, relPath);
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace(/auth\.Middleware/g, 'auth.middleware');
    fs.writeFileSync(fullPath, content);
    console.log(`Fixed: ${relPath}`);
}
