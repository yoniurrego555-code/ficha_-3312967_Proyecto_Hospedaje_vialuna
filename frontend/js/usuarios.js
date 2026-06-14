const API_URL = "https://ficha-3312967-proyecto-hospedaje-vialuna.onrender.com/api";

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
    const response = await fetch(`${API_URL}/auth/login`, {
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
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  return parseResponse(response);
}

export async function recuperarContrasena({ email, newPassword }) {
  const response = await fetch(`${API_URL}/auth/recover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, newPassword })
  });

  return parseResponse(response);
}

export async function verificarEmail(email) {

  const response = await fetch(`${API_URL}/auth/check-email`, {
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
