const service = require("../services/passwordrecovery.service");

function handleError(res, error, fallbackMessage) {
  console.error(fallbackMessage, error);
  res.status(error.status || 500).json({
    error: error.message || fallbackMessage
  });
}

exports.requestReset = async (req, res) => {
  try {
    const response = await service.requestReset(req.body);
    res.json(response);
  } catch (error) {
    handleError(res, error, "Error solicitando recuperacion de clave");
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const response = await service.resetPassword(req.body);
    res.json(response);
  } catch (error) {
    handleError(res, error, "Error restableciendo la clave");
  }
};
