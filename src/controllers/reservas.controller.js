const service = require("../services/reservas.service");

function handleError(res, error, fallbackMessage) {
  console.error(fallbackMessage, error);
  res.status(error.status || 500).json({
    error: error.message || fallbackMessage
  });
}

exports.listar = async (req, res) => {
  try {
    const reservas = await service.listar(req.query);
    res.json(reservas);
  } catch (error) {
    handleError(res, error, "Error al listar reservas");
  }
};

exports.obtener = async (req, res) => {
  try {
    const reserva = await service.obtener(req.params.id);

    if (!reserva) {
      return res.status(404).json({ error: "La reserva no existe" });
    }

    res.json(reserva);
  } catch (error) {
    handleError(res, error, "Error al obtener la reserva");
  }
};

exports.obtenerPorUsuario = async (req, res) => {
  try {
    const reservas = await service.obtenerPorUsuario(req.params.id);
    res.json(reservas);
  } catch (error) {
    handleError(res, error, "Error al obtener las reservas del usuario");
  }
};

exports.crear = async (req, res) => {
  try {
    const reserva = await service.crear(req.body);
    res.status(201).json({
      mensaje: "Reserva creada correctamente",
      reserva
    });
  } catch (error) {
    handleError(res, error, "Error al crear la reserva");
  }
};

exports.actualizar = async (req, res) => {
  try {
    const reserva = await service.actualizar(req.params.id, req.body);
    res.json({
      mensaje: "Reserva actualizada correctamente",
      reserva
    });
  } catch (error) {
    handleError(res, error, "Error al actualizar la reserva");
  }
};

exports.eliminar = async (req, res) => {
  try {
    const result = await service.eliminar(req.params.id);

    if (!result.affectedRows) {
      return res.status(404).json({
        error: "La reserva no existe"
      });
    }

    res.json({
      mensaje: "Reserva cancelada correctamente"
    });
  } catch (error) {
    handleError(res, error, "Error al cancelar la reserva");
  }
};
