# Backend de Proyecto Hospedaje ViaLuna

Este directorio contiene la API de Express para el proyecto de hospedaje.

## Estructura

- src/server.js: arranca el servidor.
- src/app.js: configura la aplicación Express y las rutas.
- src/config/db.js: conexión a la base de datos MySQL.
- src/routes/: definiciones de rutas.
- src/controllers/: lógica de controladores.
- src/services/: lógica de servicios.
- src/models/: modelos de datos.

## Uso

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar `backend/.env.example` a `backend/.env` y ajustar los valores.

3. Ejecutar en desarrollo:

   ```bash
   npm run dev
   ```

4. Abrir `http://localhost:3000/api` para verificar que la API funcione.

