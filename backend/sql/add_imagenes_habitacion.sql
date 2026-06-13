-- Crear tabla imagenes_habitacion
CREATE TABLE IF NOT EXISTS imagenes_habitacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  habitacion_id INT NOT NULL,
  url_imagen VARCHAR(1024) NOT NULL,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (habitacion_id) REFERENCES habitacion(IDHabitacion) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insertar imágenes reutilizando los archivos ya presentes en el frontend
-- Asegúrate que estas rutas estén disponibles desde el backend (app sirve /frontend)
INSERT INTO imagenes_habitacion (habitacion_id, url_imagen) VALUES
  (8, '/frontend/assets/images/rooms/familiar.png'),
  (9, '/frontend/assets/images/rooms/familiar.png'),
  (3, '/frontend/assets/images/rooms/parejas.png'),
  (4, '/frontend/assets/images/rooms/individual.png');
