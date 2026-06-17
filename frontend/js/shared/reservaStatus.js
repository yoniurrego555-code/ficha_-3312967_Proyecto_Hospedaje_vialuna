// Módulo compartido para estados de Reservas
// Mapeo oficial:
// 1 = Activa
// 2 = Cancelada
// 3 = Finalizada
// 4 = Rechazada
// 5 = Pendiente

export function getStatusClass(estado) {
  const statusMap = {
    '1': 'reserva-badge badge-activa',
    '2': 'reserva-badge badge-cancelada',
    '3': 'reserva-badge badge-finalizada',
    '4': 'reserva-badge badge-rechazada',
    '5': 'reserva-badge badge-pendiente',
    'activa': 'reserva-badge badge-activa',
    'activo': 'reserva-badge badge-activa',
    'completada': 'reserva-badge badge-finalizada',
    'cancelada': 'reserva-badge badge-cancelada',
    'finalizada': 'reserva-badge badge-finalizada',
    'rechazada': 'reserva-badge badge-rechazada',
    'pendiente': 'reserva-badge badge-pendiente',
    'pendiente de pago': 'reserva-badge badge-pendiente'
  };
  return statusMap[String(estado).toLowerCase()] || 'reserva-badge badge-finalizada';
}

export function getStatusText(estado) {
  const statusMap = {
    '1': 'ACTIVA',
    '2': 'CANCELADA',
    '3': 'FINALIZADA',
    '4': 'RECHAZADA',
    '5': 'PENDIENTE',
    'activa': 'ACTIVA',
    'activo': 'ACTIVA',
    'completada': 'FINALIZADA',
    'finalizada': 'FINALIZADA',
    'cancelada': 'CANCELADA',
    'rechazada': 'RECHAZADA',
    'pendiente': 'PENDIENTE'
  };
  return statusMap[String(estado).toLowerCase()] || String(estado).toUpperCase() || 'DESCONOCIDO';
}
