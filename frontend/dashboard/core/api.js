export const API_URL = "http://localhost:3000/api";
export const SESSION_KEY = "vialuna_usuario";
export const TOKEN_KEY = "vialuna_token";
export const ROLE_KEY = "vialuna_rol";

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.error || data?.message || data?.mensaje || "Error en la solicitud");
    error.status = response.status;
    throw error;
  }

  return data;
}

export function saveSession(usuario) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(usuario));
  if (usuario?.token) {
    localStorage.setItem(TOKEN_KEY, usuario.token);
  }
  if (usuario?.rol) {
    localStorage.setItem(ROLE_KEY, usuario.rol);
  }
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function isAdminSession(session = getSession()) {
  return String(session?.rol || "").toLowerCase() === "admin" || Number(session?.IDRol) === 1;
}

export function isClientSession(session = getSession()) {
  return String(session?.rol || "").toLowerCase() === "cliente" || Number(session?.IDRol) === 2;
}

function normalize(value) {
  return String(value ?? "").trim();
}

export function reservationBelongsToSession(reserva, session = getSession()) {
  if (!reserva || !session) return false;
  return normalize(reserva.id_cliente) === normalize(session.id_cliente);
}

export function clienteBelongsToSession(cliente, session = getSession()) {
  if (!cliente || !session) return false;
  return normalize(cliente.IDCliente) === normalize(session.id_cliente);
}

export function getReservationOwnershipFilters(session = getSession()) {
  if (!session) return {};
  return { id_cliente: session.id_cliente };
}

export function authLogin(payload) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function authRegister(payload) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function authRecover(payload) {
  return request("/auth/recover", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function checkEmailExists(email) {
  return request("/auth/check-email", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export function getClientes() {
  return request("/clientes");
}

export function createCliente(payload) {
  return request("/clientes", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateCliente(id, payload) {
  return request(`/clientes/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteCliente(id) {
  return request(`/clientes/${id}`, {
    method: "DELETE"
  });
}

export function toggleEstadoCliente(id, estado) {
  return request(`/clientes/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ Estado: estado })
  });
}

export function getHabitaciones() {
  return request("/habitacion");
}

export function createHabitacion(payload) {
  return request("/habitacion", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateHabitacion(id, payload) {
  return request(`/habitacion/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteHabitacion(id) {
  return request(`/habitacion/${id}`, {
    method: "DELETE"
  });
}

export function getServicios() {
  return request("/servicios");
}

export function createServicio(payload) {
  return request("/servicios", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateServicio(id, payload) {
  return request(`/servicios/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteServicio(id) {
  return request(`/servicios/${id}`, {
    method: "DELETE"
  });
}

export function getPaquetes() {
  return request("/paquetes");
}

export function createPaquete(payload) {
  return request("/paquetes", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updatePaquete(id, payload) {
  return request(`/paquetes/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deletePaquete(id) {
  return request(`/paquetes/${id}`, {
    method: "DELETE"
  });
}

export function getMetodosPago() {
  return request("/metodopago");
}

export function createMetodoPago(payload) {
  return request("/metodopago", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateMetodoPago(id, payload) {
  return request(`/metodopago/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteMetodoPago(id) {
  return request(`/metodopago/${id}`, {
    method: "DELETE"
  });
}

export function getEstadosReserva() {
  return request("/estadosreserva");
}

export function getReservas(filters = {}) {
  const query = new URLSearchParams(filters).toString();
  return request(`/reservas${query ? `?${query}` : ""}`);
}

export function crearReserva(payload) {
  return request("/reservas", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function actualizarReserva(id, payload) {
  return request(`/reservas/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function cancelarReserva(id) {
  return request(`/reservas/${id}`, {
    method: "DELETE"
  });
}

export function getRoles() {
  return request("/roles");
}

export function getPermisos() {
  return request("/permisos");
}

export function getRolesPermisos() {
  return request("/rolespermisos");
}
