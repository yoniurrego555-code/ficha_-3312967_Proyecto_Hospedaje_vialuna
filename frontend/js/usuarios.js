import { apiUrl } from './shared/api-config.js';

async function parseResponse(response, isLogin = false) {
  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    if (isLogin) {
      throw new Error("Correo o contraseña incorrectos.");
    }
    const raw = data.message || data.mensaje || data.error || "Error en la solicitud";
    throw new Error(raw);
  }

  return data;
}

export async function loginUsuario({ email, password }) {
  try {
    const response = await fetch(apiUrl('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await parseResponse(response, true);
    const usuario = data.user || data.usuario;
    return {
      ...data,
      usuario,
      user: usuario
    };
  } catch (error) {
    // Errores de red o del servidor → mensaje amigable
    if (error.message === "Correo o contraseña incorrectos.") throw error;
    throw new Error("Correo o contraseña incorrectos.");
  }
}

export async function registrarUsuario(data) {
  const response = await fetch(apiUrl('/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  return parseResponse(response);
}

export async function recuperarContrasena({ email, newPassword }) {
  const response = await fetch(apiUrl('/auth/recover'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, newPassword })
  });

  return parseResponse(response);
}

export async function olvideContrasena({ email }) {
  const response = await fetch(apiUrl('/auth/forgot-password'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  return parseResponse(response);
}

export async function restablecerContrasena({ token, newPassword }) {
  const response = await fetch(apiUrl('/auth/reset-password'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword })
  });

  return parseResponse(response);
}

export async function verificarEmail(email) {

  const response = await fetch(apiUrl('/auth/check-email'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email
    })
  });

  return parseResponse(response);
}
