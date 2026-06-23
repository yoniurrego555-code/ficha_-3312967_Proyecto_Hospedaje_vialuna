import { loginUsuario } from './usuarios.js';

const form = document.getElementById('loginForm');

if (form) {

    const submitButton =
        form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {

        e.preventDefault();

        const email =
            form.email.value.trim();

        const password =
            form.password.value.trim();

        // VALIDACIONES

        if (!email || !password) {

            alert('Completa todos los campos');

            return;
        }

        // BLOQUEAR BOTÓN

        submitButton.disabled = true;

        const originalText =
            submitButton.innerHTML;

        submitButton.innerHTML =
            'Ingresando...';

        try {

            console.log('🔐 Intentando login con:', email);

            const res =
                await loginUsuario({
                    email,
                    password
                });

            console.log('📦 Respuesta:', res);

            // VALIDAR TOKEN

            if (!res.token) {

                throw new Error(
                    res.mensaje ||
                    res.error ||
                    'No fue posible iniciar sesión'
                );
            }

            // OBTENER USUARIO

            const usuario =
                res.usuario || res.user;

            if (!usuario) {

                throw new Error(
                    'No se recibió información del usuario'
                );
            }

            // GUARDAR SESIÓN

            sessionStorage.setItem(
                'vialuna_token',
                res.token
            );

            sessionStorage.setItem(
                'vialuna_usuario',
                JSON.stringify(usuario)
            );

            sessionStorage.setItem(
                'vialuna_rol',
                usuario.rol || ''
            );

            console.log('✅ Sesión guardada');

            // REDIRECCIÓN

            let destino =
                '../cliente/dashboard.html';

            if (
                usuario.rol &&
                usuario.rol.toLowerCase() === 'admin'
            ) {

                destino =
                    '../admin/dashboard-admin.html';
            }

            console.log('🚀 Redirigiendo a:', destino);

            window.location.href = destino;

        } catch (error) {

            console.error('❌ Error login:', error);

            alert(
                error.message ||
                'Ocurrió un error al iniciar sesión'
            );

        } finally {

            // RESTAURAR BOTÓN

            submitButton.disabled = false;

            submitButton.innerHTML =
                originalText;
        }
    });
}

