const express = require("express");
const router = express.Router();
const controller = require("../controllers/paquetes.controller");

router.get("/", controller.listar);

// 🔥 ESTA LÍNEA ES LA QUE FALTA
router.get("/:id", controller.obtener);

router.post("/", controller.crear);
router.put("/:id", controller.actualizar);
router.delete("/:id", controller.eliminar);

module.exports = router;