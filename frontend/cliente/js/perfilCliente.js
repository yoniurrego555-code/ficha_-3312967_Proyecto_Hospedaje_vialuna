import { logout, isClientSession, getSession } from "../../dashboard/core/authGuard.js";
import { updateCliente } from "../../dashboard/core/api.js";

console.log('📡 perfilCliente.js detectado');

async function init() {
    console.log('🚀 Inicializando Perfil Cliente...');

    try {
        const session = getSession();
        if (!session || !isClientSession(session)) {
            window.location.href = '../pages/login.html';
            return;
        }

        const userName = session.NombreCompleto || session.Nombres || session.Nombre || 'Cliente';
        const displayElem = document.getElementById('userNameDisplay');
        if (displayElem) displayElem.textContent = userName;

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', logout);

        // Cargar datos en el formulario
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };

        setVal('nombres', session.Nombres || session.Nombre || '');
        setVal('apellidos', session.Apellidos || '');
        setVal('email', session.email || session.Email || '');
        setVal('telefono', session.telefono || session.Telefono || '');

        // Manejar actualización de perfil
        const perfilForm = document.getElementById('perfilForm');
        if (perfilForm) perfilForm.addEventListener('submit', actualizarPerfil);
        
        // Manejar cambio de contraseña
        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) passwordForm.addEventListener('submit', cambiarPassword);

    } catch (error) {
        console.error('❌ Error en init perfil:', error);
    }
}

async function actualizarPerfil(e) {
    e.preventDefault();
    console.log('📤 Actualizando perfil...');
    
    const session = getSession();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    const idCliente = session.id_cliente || session.IDCliente || session.id;

    try {
        await updateCliente(idCliente, data);
        
        // Actualizar sesión local
        const nuevaSesion = { ...session, ...data };
        localStorage.setItem('vialuna_usuario', JSON.stringify(nuevaSesion));
        
        alert('Perfil actualizado con éxito');
        location.reload();
    } catch (error) {
        console.error('❌ Error al actualizar perfil:', error);
        alert('Error al actualizar perfil: ' + error.message);
    }
}

async function cambiarPassword(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    if (data.new_password !== data.confirm_password) {
        alert('La nueva contraseña y la confirmación no coinciden.');
        return;
    }

    try {
        console.log('Simulando cambio de contraseña:', data);
        // Aquí iría la llamada al API de cambio de contraseña
        alert('Contraseña actualizada correctamente (Simulación)');
        e.target.reset();
    } catch (error) {
        console.error('❌ Error al cambiar contraseña:', error);
        alert('Error al cambiar contraseña: ' + error.message);
    }
}

init();
