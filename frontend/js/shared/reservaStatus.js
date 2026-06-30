// Módulo compartido para estados de Reservas
// Mapeo oficial:
// 1 = Pendiente
// 2 = Confirmada
// 3 = En Proceso
// 4 = Completada
// 6 = Rechazada

export function getStatusClass(estado) {
  const statusMap = {
    '1': 'px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200', // Pendiente
    '2': 'px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200', // Confirmada
    '3': 'px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200', // En Proceso
    '4': 'px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200', // Completada
    '6': 'px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-800 border border-red-200', // Rechazada
    '7': 'px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-900 border border-red-300', // Cancelada
    'pendiente': 'px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200',
    'confirmada': 'px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200',
    'en_proceso': 'px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200',
    'completada': 'px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200',
    'rechazada': 'px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-800 border border-red-200',
    'cancelada': 'px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-900 border border-red-300'
  };
  return statusMap[String(estado).toLowerCase()] || 'px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200';
}

export function getStatusText(estado) {
  const statusMap = {
    '1': 'PENDIENTE',
    '2': 'CONFIRMADA',
    '3': 'EN PROCESO',
    '4': 'COMPLETADA',
    '6': 'RECHAZADA',
    '7': 'CANCELADA',
    'pendiente': 'PENDIENTE',
    'confirmada': 'CONFIRMADA',
    'en proceso': 'EN PROCESO',
    'en_proceso': 'EN PROCESO',
    'completada': 'COMPLETADA',
    'rechazada': 'RECHAZADA',
    'cancelada': 'CANCELADA'
  };
  return statusMap[String(estado).toLowerCase()] || String(estado).toUpperCase() || 'DESCONOCIDO';
}
