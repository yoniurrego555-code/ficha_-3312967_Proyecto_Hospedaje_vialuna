// airbnbCalendar.js
// Utility to compute occupied date ranges for a given room based on reservations.
import { showAlert } from '../../dashboard/modules/ui-utils.js';

// Returns an array of objects: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }.
export function computeOccupiedRanges(roomId, reservations) {
  if (!roomId) return [];
  const occupied = [];
  if (!Array.isArray(reservations)) return occupied;
  reservations.forEach((res) => {
    const rRoomId = String(res.id_habitacion || res.IDHabitacion || '');
    if (rRoomId !== String(roomId)) return;
    // Exclude cancelled reservations (estado 2 or similar)
    const estado = String(res.id_estado_reserva || res.Estado || res.estado || '').toLowerCase();
    if (['2', 'cancelada', 'cancelado'].includes(estado)) return;
    const start = (res.fecha_inicio || res.FechaInicio || '').split('T')[0];
    const end = (res.fecha_fin || res.FechaFin || '').split('T')[0];
    if (start && end) {
      occupied.push({ from: start, to: end });
    }
  });
  // Optionally merge overlapping ranges for efficiency
  if (occupied.length === 0) return occupied;
  occupied.sort((a, b) => a.from.localeCompare(b.from));
  const merged = [occupied[0]];
  for (let i = 1; i < occupied.length; i++) {
    const last = merged[merged.length - 1];
    if (occupied[i].from <= last.to) {
      // Overlap – extend the end if needed
      if (occupied[i].to > last.to) last.to = occupied[i].to;
    } else {
      merged.push(occupied[i]);
    }
  }
  return merged;
}

// Initialize calendar inputs with validation against occupied ranges.
// startInputId / endInputId are the DOM element IDs of the date inputs.
// occupiedRanges should be the result of computeOccupiedRanges.
export function initCalendar(startInputId, endInputId, occupiedRanges = []) {
  const startInput = document.getElementById(startInputId);
  const endInput = document.getElementById(endInputId);
  if (!startInput || !endInput) return;

  // Helper to check if a date (YYYY-MM-DD) falls inside any occupied range.
  function isDateOccupied(dateStr) {
    return occupiedRanges.some((r) => dateStr >= r.from && dateStr <= r.to);
  }

  // When start date changes, enforce min for end and validate.
  startInput.addEventListener('change', () => {
    const startVal = startInput.value;
    if (!startVal) return;
    // If selected start date is occupied, clear and warn.
    if (isDateOccupied(startVal)) {
      showAlert('Advertencia', 'La fecha de inicio seleccionada está ocupada. Por favor elija otra fecha.', 'warning');
      startInput.value = '';
      endInput.value = '';
      endInput.min = '';
      return;
    }
    // Set minimum for end date: next day after start.
    const nextDay = new Date(startVal);
    nextDay.setDate(nextDay.getDate() + 1);
    const minEnd = nextDay.toISOString().split('T')[0];
    endInput.min = minEnd;
    // If current end is before new min, clear it.
    if (endInput.value && endInput.value < minEnd) {
      endInput.value = '';
    }
  });

  // When end date changes, validate against start and occupied ranges.
  endInput.addEventListener('change', () => {
    const startVal = startInput.value;
    const endVal = endInput.value;
    if (!startVal || !endVal) return;
    if (endVal <= startVal) {
      showAlert('Advertencia', 'La fecha de salida debe ser posterior a la fecha de inicio.', 'warning');
      endInput.value = '';
      return;
    }
    // Ensure none of the dates in the selected range are occupied.
    let conflict = false;
    let cursor = new Date(startVal);
    while (cursor < new Date(endVal)) {
      const iso = cursor.toISOString().split('T')[0];
      if (isDateOccupied(iso)) {
        conflict = true;
        break;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (conflict) {
      showAlert('Advertencia', 'El rango seleccionado contiene fechas ocupadas. Por favor ajuste las fechas.', 'warning');
      endInput.value = '';
    }
  });
}
