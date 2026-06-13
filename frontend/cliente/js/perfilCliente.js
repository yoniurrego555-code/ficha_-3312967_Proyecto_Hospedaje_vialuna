import { logout, isClientSession, getSession } from "../../dashboard/core/authGuard.js";
import { authRecover, getCliente, updateCliente } from "../../dashboard/core/api.js";

let clienteActual = null;

async function init() {
    try {
        const session = getSession();
        if (!session || !isClientSession(session)) {
            window.location.href = '../auth/login.html';
            return;
        }

        const userName = session.nombre || session.NombreCompleto || session.Nombres || session.Nombre || 'Cliente';
        const displayElem = document.getElementById('userNameDisplay');
        if (displayElem) displayElem.textContent = userName;
        const initialElem = document.getElementById('userInitial');
        if (initialElem) initialElem.textContent = userName.trim().charAt(0).toUpperCase() || 'V';

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', logout);

        const idCliente = getClientId(session);
        clienteActual = idCliente ? await getCliente(idCliente).catch(() => null) : null;
        renderPerfil(clienteActual || session);

        const perfilForm = document.getElementById('perfilForm');
        if (perfilForm) perfilForm.addEventListener('submit', actualizarPerfil);

        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) passwordForm.addEventListener('submit', cambiarPassword);

        const editBtn = document.getElementById('editProfileBtn');
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (editBtn) editBtn.addEventListener('click', habilitarEdicion);
        if (cancelBtn) cancelBtn.addEventListener('click', () => location.reload());

    } catch (error) {
        console.error('Error en init perfil:', error);
    }
}

function getFullName(session) {
    const stored = session.nombre || session.NombreCompleto;
    if (stored) return stored;
    return [session.nombres || session.Nombres || session.Nombre, session.apellido || session.apellidos || session.Apellido || session.Apellidos]
        .filter(Boolean)
        .join(' ') || 'Cliente';
}

function getClientId(session) {
    return session?.id_cliente || session?.IDCliente || session?.NroDocumento || session?.id || session?.IDUsuario;
}

function renderPerfil(data) {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setVal('tipo_documento', data.TipoDocumento || data.tipo_documento || 'CC');
    setVal('documento', data.NroDocumento || data.id_cliente || data.IDCliente || data.id || '');
    setVal('nombreCompleto', getFullName(data));
    setVal('email', data.Email || data.email || '');
    setVal('telefono', data.Telefono || data.telefono || '');
    setVal('fechaNacimiento', normalizeDate(data.FechaNacimiento || data.fecha_nacimiento || data.fechaNacimiento || data.FechaNac || ''));
}

function splitFullName(value) {
    const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return { nombre: parts[0] || '', apellido: '' };
    return { nombre: parts.slice(0, -1).join(' '), apellido: parts[parts.length - 1] };
}

function normalizeDate(value) {
    if (!value) return '';
    return String(value).slice(0, 10);
}

function habilitarEdicion() {
    const form = document.getElementById('perfilForm');
    const editBtn = document.getElementById('editProfileBtn');
    if (!form) return;

    form.classList.add('is-editing');
    ['nombreCompleto', 'telefono', 'fechaNacimiento'].forEach((id) => {
        const input = document.getElementById(id);
        if (input) input.removeAttribute('readonly');
    });
    if (editBtn) editBtn.style.display = 'none';
}

async function actualizarPerfil(e) {
    e.preventDefault();
    
    const session = getSession();
    const formData = new FormData(e.target);
    const raw = Object.fromEntries(formData.entries());
    const nameParts = splitFullName(raw.nombre_completo);
    const base = clienteActual || session;
    const data = {
        TipoDocumento: raw.tipo_documento || session.TipoDocumento || 'CC',
        Nombre: nameParts.nombre || base.Nombre || base.nombre || '',
        Apellido: nameParts.apellido || base.Apellido || base.apellido || '',
        Direccion: base.Direccion || base.direccion || 'Sin direccion',
        Email: base.Email || base.email || '',
        Telefono: raw.telefono || '',
        FechaNacimiento: raw.fecha_nacimiento || base.FechaNacimiento || base.fecha_nacimiento || '',
        Estado: base.Estado ?? 1,
        IDRol: base.IDRol || 2
    };

    const idCliente = getClientId(session);

    try {
        await updateCliente(idCliente, data);
        
        const nuevaSesion = { ...session, ...data, nombre: `${data.Nombre} ${data.Apellido}`.trim(), email: data.Email, telefono: data.Telefono };
        localStorage.setItem('vialuna_usuario', JSON.stringify(nuevaSesion));
        
        alert('Perfil actualizado con éxito');
        location.reload();
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
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
        const email = (clienteActual?.Email || clienteActual?.email || getSession()?.email || getSession()?.Email || '').trim();
        if (!email) {
            throw new Error('No fue posible identificar el correo de la cuenta.');
        }
        await authRecover({ email, newPassword: data.new_password });
        alert('Contraseña actualizada correctamente');
        e.target.reset();
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        alert('Error al cambiar contraseña: ' + error.message);
    }
}

export async function renderPerfilCliente() {
    await init();
}
