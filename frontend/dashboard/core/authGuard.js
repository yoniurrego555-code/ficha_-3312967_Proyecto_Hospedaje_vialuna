import { clearSession, getSession, isAdminSession, isClientSession } from "./api.js";

function getFrontendBaseUrl() {
  return new URL("../../", import.meta.url);
}

export function getAppUrl(path = "") {
  return new URL(path, getFrontendBaseUrl()).toString();
}

export const LOGIN_URL = getAppUrl("public/login.html");
export const ADMIN_DASHBOARD_URL = getAppUrl("pages/admin/dashboard.html");
export const CLIENT_DASHBOARD_URL = getAppUrl("pages/cliente/dashboard.html");
export const ACCESS_DENIED_MESSAGE_KEY = "vialuna_access_denied_message";

let redirecting = false;

function normalizeUrl(target) {
  try {
    return new URL(target, window.location.href).toString();
  } catch (error) {
    return String(target || "");
  }
}

export function revealPage() {
  document.documentElement.removeAttribute("data-auth-pending");
}

export function safeRedirect(target, { replace = true } = {}) {
  const nextUrl = normalizeUrl(target);
  const currentUrl = normalizeUrl(window.location.href);

  if (!nextUrl || nextUrl === currentUrl || redirecting) {
    revealPage();
    return false;
  }

  redirecting = true;

  if (replace) {
    window.location.replace(nextUrl);
    return true;
  }

  window.location.href = nextUrl;
  return true;
}

function matchesRole(session, requiredRole) {
  if (!requiredRole) {
    return Boolean(session);
  }

  if (requiredRole === "admin") {
    return isAdminSession(session);
  }

  if (requiredRole === "cliente" || requiredRole === "client") {
    return isClientSession(session);
  }

  return false;
}

export function getDashboardByRole(session = getSession()) {
  if (isAdminSession(session)) {
    return ADMIN_DASHBOARD_URL;
  }

  if (isClientSession(session)) {
    return CLIENT_DASHBOARD_URL;
  }

  return LOGIN_URL;
}

export function redirectToDashboardByRole(session = getSession(), options = {}) {
  if (!session) {
    safeRedirect(LOGIN_URL, options);
    return null;
  }

  safeRedirect(getDashboardByRole(session), options);
  return session;
}

export function protectPage({ requiredRole = null, deniedMessage = "" } = {}) {
  const session = getSession();

  if (!session || !session.token) {
    safeRedirect(LOGIN_URL);
    return null;
  }

  if (!matchesRole(session, requiredRole)) {
    const message = deniedMessage
      || (requiredRole === "admin"
        ? "No tienes permisos para entrar al panel administrativo."
        : "No tienes permisos para entrar al portal del cliente.");

    window.sessionStorage.setItem(ACCESS_DENIED_MESSAGE_KEY, message);
    safeRedirect(getDashboardByRole(session));
    return null;
  }

  window.__VIALUNA_SESSION__ = session;
  revealPage();
  return session;
}

export function consumeAccessDeniedMessage() {
  const message = window.sessionStorage.getItem(ACCESS_DENIED_MESSAGE_KEY) || "";

  if (message) {
    window.sessionStorage.removeItem(ACCESS_DENIED_MESSAGE_KEY);
  }

  return message;
}

export function logout() {
  clearSession();
  safeRedirect(LOGIN_URL);
}
