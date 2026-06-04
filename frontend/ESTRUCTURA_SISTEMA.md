# Estructura real estabilizada - Via Luna

## Vistas activas

- Landing real: `frontend/index.html`
- Login real: `frontend/auth/login.html`
- Registro real: `frontend/auth/registro.html`
- Recuperacion real: `frontend/auth/recuperar.html`
- Dashboard cliente real: `frontend/cliente/dashboard.html`
- Reservas cliente real: `frontend/cliente/reservas.html`
- Nueva reserva cliente real: `frontend/cliente/nueva-reserva.html`
- Perfil cliente real: `frontend/cliente/perfil.html`
- Dashboard admin real: `frontend/admin/dashboard-admin.html`
- Parciales admin reales: `frontend/admin/*.html`

## Compatibilidad conservada

Estas rutas antiguas existen como redireccion o alias para no romper enlaces:

- `frontend/pages/login.html` -> `../auth/login.html`
- `frontend/pages/registro.html` -> `../auth/registro.html`
- `frontend/pages/recuperar.html` -> `../auth/recuperar.html`
- `frontend/pages/dashboard-admin.html` -> `../admin/dashboard-admin.html`
- `frontend/pages/dashboard-cliente.html` -> `../cliente/dashboard.html`
- Express tambien conserva `/login.html`, `/registro.html`, `/recuperar.html`, `/dashboard-admin.html` y `/dashboard-cliente.html`.

## CSS activo

- `frontend/css/landing.css` para landing.
- `frontend/css/login.css` para auth.
- `frontend/css/cliente.css` para portal cliente.
- `frontend/css/admin.css` para dashboard admin.
- `frontend/css/global.css` como entrada compartida futura.

## JS activo

- `frontend/js/usuarios.js` para login/usuarios.
- `frontend/js/login.js` compatibilidad de login externo.
- `frontend/js/dashboard-admin.js` para admin SPA.
- `frontend/dashboard/core/api.js` y `authGuard.js` para API/sesion.
- `frontend/cliente/js/*.js` para portal cliente.
- `frontend/dashboard/modules/*.js` para modulos admin.

## Eliminado por no tener referencias activas

- `frontend/public/`
- `frontend/styles/`
- `frontend/layouts/`
- `frontend/components/`
- `frontend/scripts/`
- `frontend/.git/` anidado
- `frontend/append_css.js`
- `frontend/append_extra_css.js`
- `frontend/js/dashboard-cliente.js` antiguo
- CSS viejos: `public-theme.css`, `admin-theme.css`, `styles.css`
- Scripts de prueba en raiz y backend: `check_data*.js`, `check_statuses.js`, `rewrite_files.py`, `update_catches.js`, `backend/check_*.js`, `backend/update_rooms.js`
- Copia anidada `Proyecto_Hospedaje_vialuna/`

## Backend

No se cambiaron endpoints funcionales. El servidor real sigue siendo `src/server.js`, que monta rutas desde `backend/src/routes` y sirve `frontend` como carpeta estatica.
