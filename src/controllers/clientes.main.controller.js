const service = require("../services/clientes.core.service");

function handleError(res, error, fallbackMessage) {
  console.error(fallbackMessage, error);
  res.status(error.status || 500).json({
    error: error.message || fallbackMessage
  });
}

exports.listar = async (req, res) => {
  try {
    const clientes = await service.listar();
    res.json(clientes);
  } catch (error) {
    handleError(res, error, "Error al listar clientes");
  }
};

exports.obtener = async (req, res) => {
  try {
    const cliente = await service.obtener(req.params.id);

    if (!cliente) {
      return res.status(404).json({ error: "El cliente no existe" });
    }

    res.json(cliente);
  } catch (error) {
    handleError(res, error, "Error al obtener cliente");
  }
};

exports.login = async (req, res) => {
  try {
    const cliente = await service.login(req.body);

    if (!cliente) {
      return res.status(401).json({ error: "Credenciales invalidas" });
    }

    res.json({
      mensaje: "Login exitoso",
      usuario: cliente
    });
  } catch (error) {
    handleError(res, error, "Error al iniciar sesion");
  }
};

exports.crear = async (req, res) => {
  try {
    const result = await service.crear(req.body);
    res.status(201).json({
      mensaje: "Cliente registrado correctamente",
      ...result
    });
  } catch (error) {
    handleError(res, error, "Error al crear cliente");
  }
};

exports.actualizar = async (req, res) => {
  try {
    const cliente = await service.actualizar(req.params.id, req.body);
    res.json({
      mensaje: "Cliente actualizado correctamente",
      cliente
    });
  } catch (error) {
    handleError(res, error, "Error al actualizar cliente");
  }
};

exports.eliminar = async (req, res) => {
  try {
    await service.eliminar(req.params.id);
    res.json({ mensaje: "Cliente eliminado correctamente" });
  } catch (error) {
    handleError(res, error, "Error al eliminar cliente");
  }
};
