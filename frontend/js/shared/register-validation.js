/**
 * register-validation.js — Validación y construcción del payload de registro de cliente.
 * Exporta:
 *   validateRegisterPayload(payload) → { ok: boolean, error?: string }
 *   buildRegisterPayload(form) → Object listo para enviar a /auth/register
 */

/**
 * Valida los campos del formulario de registro antes de enviarlo.
 * @param {Object} payload
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateRegisterPayload(payload) {
  const {
    nombre,
    apellido,
    documento,
    telefono,
    email,
    contrasena,
    confirmar,
  } = payload;

  if (!nombre || nombre.trim().length < 2) {
    return { ok: false, error: 'El nombre debe tener al menos 2 caracteres.' };
  }
  if (!apellido || apellido.trim().length < 2) {
    return { ok: false, error: 'El apellido debe tener al menos 2 caracteres.' };
  }
  if (!documento || documento.trim().length < 5) {
    return { ok: false, error: 'El número de documento debe tener al menos 5 caracteres.' };
  }
  if (!/^\d+$/.test(documento.trim())) {
    return { ok: false, error: 'El número de documento solo debe contener dígitos.' };
  }
  if (!telefono || telefono.trim().length < 7) {
    return { ok: false, error: 'El teléfono debe tener al menos 7 dígitos.' };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return { ok: false, error: 'Ingresa un correo electrónico válido.' };
  }
  if (!contrasena || contrasena.length < 6) {
    return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
  }
  if (contrasena !== confirmar) {
    return { ok: false, error: 'Las contraseñas no coinciden.' };
  }

  return { ok: true };
}

/**
 * Construye el objeto payload a enviar al backend a partir del formulario de registro.
 * Mapea los `name` del HTML a los campos que espera /auth/register.
 * @param {HTMLFormElement} form
 * @returns {Object}
 */
export function buildRegisterPayload(form) {
  const get = (name) => {
    const el = form.elements[name];
    return el ? el.value.trim() : '';
  };

  return {
    Nombre:        get('Nombre'),
    Apellido:      get('Apellido'),
    NroDocumento:  get('NroDocumento'),
    TipoDocumento: get('TipoDocumento') || 'CC',
    Telefono:      get('Telefono'),
    Email:         get('Email'),
    Contrasena:    form.elements['Contrasena'] ? form.elements['Contrasena'].value : '',
    Direccion:     get('Direccion') || '',
    // Pais se agrega en el caller tras leer el selector de países
  };
}
