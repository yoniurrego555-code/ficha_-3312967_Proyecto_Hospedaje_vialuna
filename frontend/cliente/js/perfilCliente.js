import { logout, isClientSession, getSession } from "../../dashboard/core/authGuard.js";
import { authRecover, getCliente, updateCliente } from "../../dashboard/core/api.js";
import { showAlert } from "../../dashboard/modules/ui-utils.js";
import { buildCountryOptions, findCountry, bindCountryDial } from "../../js/shared/countries.js";

let clienteActual = null;

/* ─── helpers ─────────────────────────────────────────────────── */
function getFullName(data) {
    const stored = data.nombre || data.NombreCompleto;
    if (stored) return stored;
    return [
        data.nombres || data.Nombres || data.Nombre,
        data.apellido || data.apellidos || data.Apellido || data.Apellidos
    ].filter(Boolean).join(' ') || 'Cliente';
}

function getClientId(session) {
    return session?.id_cliente || session?.IDCliente || session?.NroDocumento || session?.id || session?.IDUsuario;
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

/* ─── render del formulario ────────────────────────────────────── */
function renderPerfil(data) {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setVal('tipo_documento', data.TipoDocumento || data.tipo_documento || 'CC');
    setVal('documento', data.NroDocumento || data.id_cliente || data.IDCliente || data.id || '');
    
    const nameParts = splitFullName(getFullName(data));
    setVal('nombre', data.Nombre || data.nombre || data.Nombres || data.nombres || nameParts.nombre);
    setVal('apellido', data.Apellido || data.apellido || data.Apellidos || data.apellidos || nameParts.apellido);
    
    setVal('email', data.Email || data.email || '');
    setVal('telefono', data.Telefono || data.telefono || '');
    setVal('fechaNacimiento', normalizeDate(data.FechaNacimiento || data.fecha_nacimiento || data.fechaNacimiento || data.FechaNac || ''));
    setVal('departamento', data.Departamento || data.departamento || '');
    setVal('direccion', data.Direccion || data.direccion || '');

    // Selector de país con código de llamada
    const paisCode = data.PaisCode || 'CO';
    const paisSel = document.getElementById('paisCode');
    if (paisSel) {
        paisSel.innerHTML = buildCountryOptions(paisCode);
        bindCountryDial('paisCode', 'dialCodeDisplay');
    }
}

/* ─── habilitar edición ────────────────────────────────────────── */
function habilitarEdicion() {
    const form = document.getElementById('perfilForm');
    const editBtn = document.getElementById('editProfileBtn');
    if (!form) return;

    form.classList.add('is-editing');
    ['nombre', 'apellido', 'telefono', 'fechaNacimiento', 'departamento', 'direccion', 'email'].forEach((id) => {
        const input = document.getElementById(id);
        if (input) input.removeAttribute('readonly');
    });
    
    const tipoDoc = document.getElementById('tipo_documento');
    if (tipoDoc) tipoDoc.removeAttribute('disabled');
    // Habilitar el selector de país
    const paisSel = document.getElementById('paisCode');
    if (paisSel) paisSel.removeAttribute('disabled');

    if (editBtn) editBtn.style.display = 'none';
}

/* ─── actualizar perfil ────────────────────────────────────────── */
async function actualizarPerfil(e) {
    e.preventDefault();

    const session = getSession();
    const formData = new FormData(e.target);
    const raw = Object.fromEntries(formData.entries());
    const base = clienteActual || session;

    // País seleccionado (presentacional, nombre legible para BD)
    const paisSel = document.getElementById('paisCode');
    const paisCode = paisSel ? paisSel.value : 'CO';
    const paisInfo = findCountry(paisCode);
    const paisName = paisInfo ? paisInfo.name : (base.Pais || 'Colombia');

    const data = {
        TipoDocumento: raw.tipo_documento || session.TipoDocumento || 'CC',
        Nombre: raw.nombre || base.Nombre || base.nombre || '',
        Apellido: raw.apellido || base.Apellido || base.apellido || '',
        Direccion: raw.direccion || base.Direccion || base.direccion || '',
        Email: raw.email || base.Email || base.email || '',
        Telefono: raw.telefono || '',
        FechaNacimiento: raw.fecha_nacimiento || base.FechaNacimiento || base.fecha_nacimiento || '',
        Pais: paisName,
        Departamento: raw.departamento || base.Departamento || base.departamento || '',
        Estado: base.Estado ?? 1,
        IDRol: base.IDRol || 2
    };

    const idCliente = getClientId(session);

    if (!idCliente) {
        showAlert('Error', 'No se pudo identificar tu cuenta. Por favor inicia sesión de nuevo.', 'error');
        return;
    }

    const submitBtn = e.target.querySelector('[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Guardando...'; }

    try {
        await updateCliente(idCliente, data);

        // Actualizar sesión local
        const nuevaSesion = {
            ...session,
            ...data,
            nombre: `${data.Nombre} ${data.Apellido}`.trim(),
            email: data.Email,
            telefono: data.Telefono
        };
        localStorage.setItem('vialuna_usuario', JSON.stringify(nuevaSesion));

        showAlert('Éxito', 'Perfil actualizado correctamente.', 'success');
        setTimeout(() => location.reload(), 1200);
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        showAlert('Error', 'No fue posible guardar los cambios: ' + (error.message || 'Error desconocido'), 'error');
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Guardar cambios'; }
    }
}

/* ─── cambiar contraseña ────────────────────────────────────────── */
async function cambiarPassword(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    if (!data.new_password || data.new_password.length < 6) {
        showAlert('Advertencia', 'La nueva contraseña debe tener al menos 6 caracteres.', 'warning');
        return;
    }

    if (data.new_password !== data.confirm_password) {
        showAlert('Advertencia', 'La nueva contraseña y la confirmación no coinciden.', 'warning');
        return;
    }

    const submitBtn = e.target.querySelector('[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Cambiando...'; }

    try {
        const email = (
            clienteActual?.Email ||
            clienteActual?.email ||
            getSession()?.email ||
            getSession()?.Email ||
            ''
        ).trim();

        if (!email) {
            throw new Error('No fue posible identificar el correo de la cuenta.');
        }

        await authRecover({ email, newPassword: data.new_password });
        showAlert('Éxito', 'Contraseña actualizada correctamente.', 'success');
        e.target.reset();
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        showAlert('Error', 'Error al cambiar contraseña: ' + (error.message || 'Error desconocido'), 'error');
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Cambiar contraseña'; }
    }
}

/* ─── init ─────────────────────────────────────────────────────── */
async function init() {
    try {
        const session = getSession();

        if (!session || !isClientSession(session)) {
            window.location.href = '../auth/login.html';
            return;
        }

        // Nombre en navbar
        const userName = session.nombre || session.NombreCompleto || session.Nombres || session.Nombre || 'Cliente';
        const displayElem = document.getElementById('userNameDisplay');
        if (displayElem) displayElem.textContent = userName;
        const initialElem = document.getElementById('userInitial');
        if (initialElem) initialElem.textContent = userName.trim().charAt(0).toUpperCase() || 'V';

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', logout);

        // Cargar datos del cliente desde la API
        const idCliente = getClientId(session);
        if (idCliente) {
            try {
                clienteActual = await getCliente(idCliente);
            } catch (apiErr) {
                console.warn('No se pudo cargar desde API, usando sesión local:', apiErr.message);
                clienteActual = null;
            }
        }

        renderPerfil(clienteActual || session);

        // Listeners del formulario
        const perfilForm = document.getElementById('perfilForm');
        if (perfilForm) perfilForm.addEventListener('submit', actualizarPerfil);

        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) passwordForm.addEventListener('submit', cambiarPassword);

        const editBtn = document.getElementById('editProfileBtn');
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (editBtn) editBtn.addEventListener('click', habilitarEdicion);
        if (cancelBtn) cancelBtn.addEventListener('click', () => location.reload());

    } catch (error) {
        console.error('Error crítico en init perfil:', error);
        showAlert('Error', 'No fue posible cargar el perfil. Intenta de nuevo.', 'error');
    }
}

export async function renderPerfilCliente() {
    await init();
}

document.addEventListener('DOMContentLoaded', init);
