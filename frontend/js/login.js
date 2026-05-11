import { loginUsuario } from './usuarios.js';

const form = document.getElementById('loginForm');

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            const email = form.email.value.trim();
            const password = form.password.value;
            console.log('🔐 Intentando login con:', email);

            const res = await loginUsuario({ email, password });
            console.log('📨 Respuesta del login:', res);

            if (!res.token) {
                throw new Error(res.mensaje || res.error || 'No fue posible iniciar sesion');
            }

            console.log('💾 Guardando sesión...');
            localStorage.setItem('vialuna_token', res.token);
            if (res.user) {
                localStorage.setItem('vialuna_usuario', JSON.stringify(res.user));
            }

            console.log('🔑 Token guardado:', res.token ? 'OK' : 'ERROR');
            console.log('👤 Usuario guardado:', res.user);

            const destino = res.user && res.user.rol === 'admin'
                ? 'dashboard-admin.html'
                : '../cliente/dashboard.html';

            console.log('🎯 Redirigiendo a:', destino);
            window.location.href = destino;
        } catch (error) {
            alert(error.message || 'Ocurrio un error al iniciar sesion');
        }
    });
}
