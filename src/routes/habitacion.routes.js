const express = require("express");
const router = express.Router();
const controller = require("../controllers/habitacion.controller");
const { authenticateToken } = require("../middlewares/auth.Middleware");

router.get("/", controller.listar);
router.get("/:id", controller.obtener);
router.post("/", authenticateToken, controller.crear);
router.put("/:id", authenticateToken, controller.actualizar);
router.delete("/:id", authenticateToken, controller.eliminar);

module.exports = router;