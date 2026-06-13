-- 1. Agregar campos de aceptación de términos y políticas
ALTER TABLE reservas
ADD COLUMN acepta_terminos BOOLEAN DEFAULT FALSE,
ADD COLUMN fecha_aceptacion DATETIME NULL;

-- 2. Agregar campos para anulación de reservas
ALTER TABLE reservas
ADD COLUMN motivo_cancelacion VARCHAR(255) NULL,
ADD COLUMN fecha_cancelacion DATETIME NULL;

-- 3. Asegurar que el estado "Cancelada" y "Modificada" existan (ID 2 para Cancelada, ID 4 para Modificada por ejemplo)
-- Nota: Ajustar los IDs según la tabla de estadosreserva si ya existen.
INSERT IGNORE INTO estadosreserva (IdEstadoReserva, NombreEstadoReserva) VALUES (2, 'Cancelada');
INSERT IGNORE INTO estadosreserva (IdEstadoReserva, NombreEstadoReserva) VALUES (4, 'Modificada');
