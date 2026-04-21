ALTER TABLE reservas
ADD COLUMN hora_entrada TIME NULL AFTER fecha_fin,
ADD COLUMN hora_salida TIME NULL AFTER hora_entrada;
