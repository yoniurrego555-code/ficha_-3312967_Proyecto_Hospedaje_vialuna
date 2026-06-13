const service = require('../services/imagenes_habitacion.service');

exports.listar = (req, res) => {
  const habitacionId = req.params.habitacionId;
  service.listarPorHabitacion(habitacionId)
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
};

exports.crear = (req, res) => {
  const habitacionId = req.params.habitacionId;
  if (!req.file) return res.status(400).json({ error: 'Imagen requerida' });
  const host = req.get('host') || 'localhost:3000';
  const url = `${req.protocol}://${host}/uploads/${req.file.filename}`;
  service.crear(habitacionId, url)
    .then(result => res.status(201).json({ mensaje: 'Imagen agregada', id: result.insertId, url }))
    .catch(err => res.status(500).json({ error: err.message }));
};

exports.eliminar = (req, res) => {
  const id = req.params.id;
  service.eliminar(id)
    .then(() => res.json({ mensaje: 'Eliminada' }))
    .catch(err => res.status(500).json({ error: err.message }));
};
