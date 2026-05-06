const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "vialuna-jwt-secret";

function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      error: "Token no proporcionado."
    });
  }

  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({
      error: "Token inválido o vencido."
    });
  }
}

function authorizeRoles(...allowedRoles) {
  const normalized = allowedRoles.map((role) => String(role || "").toLowerCase());

  return (req, res, next) => {
    const currentRole = String(req.auth?.rol || "").toLowerCase();

    if (!currentRole) {
      return res.status(401).json({
        error: "Sesión no válida."
      });
    }

    if (!normalized.includes(currentRole)) {
      return res.status(403).json({
        error: "No tienes permisos para acceder a este recurso."
      });
    }

    next();
  };
}

function optionalAuth(req, res, next) {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme === "Bearer" && token) {
    try {
      req.auth = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      req.auth = null;
    }
  }

  next();
}

module.exports = {
  authenticateToken,
  authorizeRoles,
  optionalAuth
};
