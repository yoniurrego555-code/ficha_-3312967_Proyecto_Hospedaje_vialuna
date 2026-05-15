const express = require("express");
const router = express.Router();
const controller = require("../controllers/paquetes.controller");
const { authenticateToken } = require("../middlewares/auth.Middleware");

router.get("/", controller.listar);

// 🔥 ESTA LÍNEA ES LA QUE FALTA
router.get("/:id", controller.obtener);

router.post("/", authenticateToken, controller.crear);
router.put("/:id", authenticateToken, controller.actualizar);
router.delete("/:id", authenticateToken, controller.eliminar);

module.exports = router;