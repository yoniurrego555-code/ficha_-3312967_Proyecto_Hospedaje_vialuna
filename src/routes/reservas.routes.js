const express = require("express");
const router = express.Router();
const controller = require("../controllers/reservas.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");

router.get("/", authenticateToken, controller.listar);
router.get("/usuario/:id", authenticateToken, controller.obtenerPorUsuario);
router.get("/:id", authenticateToken, controller.obtener);
router.post("/", authenticateToken, controller.crear);
router.put("/:id", authenticateToken, controller.actualizar);
router.delete("/:id", authenticateToken, controller.eliminar);

module.exports = router;
