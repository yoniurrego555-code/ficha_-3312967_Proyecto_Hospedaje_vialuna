// Utilidades compartidas para todo el frontend

/**
 * Formatea un número a moneda colombiana (COP).
 * Ejemplo: 230000 -> "230.000"
 * @param {number|string} value - El valor a formatear
 * @returns {string} - El valor formateado
 */
export function formatCurrency(value) {
  const amount = Number(value) || 0;
  // Usar toLocaleString con formato de-DE (o es-CO) para asegurar el punto de miles
  // Es importante usar 'es-CO' pero a veces los navegadores usan coma para miles en es-CO.
  // 'es-CO' oficial: 230.000,00
  return amount.toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}
