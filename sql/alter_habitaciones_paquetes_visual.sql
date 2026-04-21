ALTER TABLE habitacion
  ADD COLUMN IF NOT EXISTS ImagenUrl VARCHAR(255) NULL AFTER ImagenHabitacion,
  ADD COLUMN IF NOT EXISTS CapacidadMaximaPersonas INT NOT NULL DEFAULT 1 AFTER Costo;

INSERT INTO habitacion
  (NombreHabitacion, ImagenHabitacion, ImagenUrl, Descripcion, Costo, CapacidadMaximaPersonas, Estado)
SELECT
  'Familiar Deluxe',
  NULL,
  'familiar-deluxe.svg',
  'Ideal para familias con estancia amplia y confortable',
  170000,
  5,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM habitacion WHERE NombreHabitacion = 'Familiar Deluxe'
);

UPDATE habitacion
SET
  ImagenUrl = CASE NombreHabitacion
    WHEN 'Suite' THEN 'suite-ejecutiva.svg'
    WHEN 'Doble' THEN 'doble-confort.svg'
    WHEN 'Sencilla' THEN 'sencilla-serena.svg'
    WHEN 'Familiar Deluxe' THEN 'familiar-deluxe.svg'
    ELSE ImagenUrl
  END,
  CapacidadMaximaPersonas = CASE NombreHabitacion
    WHEN 'Suite' THEN 3
    WHEN 'Doble' THEN 2
    WHEN 'Sencilla' THEN 1
    WHEN 'Familiar Deluxe' THEN 5
    ELSE COALESCE(CapacidadMaximaPersonas, 1)
  END;

UPDATE paquetes
SET IDHabitacion = CASE IDPaquete
  WHEN 1 THEN (SELECT IDHabitacion FROM habitacion WHERE NombreHabitacion = 'Suite' LIMIT 1)
  WHEN 2 THEN (SELECT IDHabitacion FROM habitacion WHERE NombreHabitacion = 'Doble' LIMIT 1)
  WHEN 3 THEN (SELECT IDHabitacion FROM habitacion WHERE NombreHabitacion = 'Sencilla' LIMIT 1)
  WHEN 4 THEN (SELECT IDHabitacion FROM habitacion WHERE NombreHabitacion = 'Familiar Deluxe' LIMIT 1)
  ELSE IDHabitacion
END;

UPDATE paquetes
SET IDServicio = CASE IDPaquete
  WHEN 1 THEN 2
  WHEN 2 THEN 3
  WHEN 3 THEN 4
  WHEN 4 THEN 2
  ELSE IDServicio
END;
