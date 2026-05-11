const API_URL = "http://localhost:3000/api";

// Credenciales de ejemplo para modo offline (basadas en datos reales de la BD)
const USUARIOS_EJEMPLO = [
  {
    email: 'admin@vialuna.com',
    password: 'admin123', // Contraseña por defecto (puede ser diferente en BD real)
    user: {
      id: '1',
      nombre: 'admin Administrador',
      email: 'admin@vialuna.com',
      rol: 'admin',
      IDRol: 1
    },
    token: 'mock-token-admin-' + Date.now()
  },
  {
    email: 'zury.daniela@vialuna.com',
    password: 'admin123',
    user: {
      id: '2',
      nombre: 'zurydaniela Daniela',
      email: 'zury.daniela@vialuna.com',
      rol: 'admin',
      IDRol: 1
    },
    token: 'mock-token-admin-zury-' + Date.now()
  },
  {
    email: 'yoniurrego444@gmail.com',
    password: 'yoniurrego200421@',
    user: {
      id: '3',
      nombre: 'Yoni Urrego',
      email: 'yoniurrego444@gmail.com',
      rol: 'admin',
      IDRol: 1
    },
    token: 'mock-token-admin-yoni-' + Date.now()
  },
  {
    email: 'saritaurrego@gmail.com',
    password: '123456',
    user: {
      id: '1023748798',
      nombre: 'Sarita Urrego',
      email: 'saritaurrego@gmail.com',
      rol: 'cliente',
      IDRol: 2
    },
    token: 'mock-token-cliente-' + Date.now()
  }
];

export async function loginUsuario({ email, password }) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || 'Error al iniciar sesión');
    }

    return await response.json();
  } catch (error) {
    console.error('Error al conectar con el backend, usando modo offline:', error);
    
    // Buscar en usuarios de ejemplo
    const usuarioEjemplo = USUARIOS_EJEMPLO.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (usuarioEjemplo) {
      console.log('Login exitoso en modo offline:', usuarioEjemplo.email);
      return {
        token: usuarioEjemplo.token,
        rol: usuarioEjemplo.user.rol,
        id: usuarioEjemplo.user.id,
        nombre: usuarioEjemplo.user.nombre,
        email: usuarioEjemplo.user.email,
        user: usuarioEjemplo.user,
        offline: true
      };
    }

    // Si no encuentra, mostrar error con sugerencias
    throw new Error(
      'Backend no disponible. Credenciales incorrectas.\n\n' +
      'Administradores disponibles (modo offline):\n' +
      '- admin@vialuna.com / admin123\n' +
      '- zury.daniela@vialuna.com / admin123\n' +
      '- yoniurrego444@gmail.com / yoniurrego200421@\n\n' +
      'Cliente disponible (modo offline):\n' +
      '- saritaurrego@gmail.com / 123456'
    );
  }
}

export async function registrarUsuario(data) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || errorData.error || 'Error al registrar usuario');
  }

  return await response.json();
}

export async function recuperarContrasena({ email, newPassword }) {
  const response = await fetch(`${API_URL}/auth/recover`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, newPassword })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || errorData.error || 'Error al recuperar contraseña');
  }

  return await response.json();
}

export async function verificarEmail(email) {
  const response = await fetch(`${API_URL}/auth/check-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || errorData.error || 'Error al verificar email');
  }

  return await response.json();
}
