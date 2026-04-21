const express = require("express");
const router = express.Router();
const controller = require("../controllers/reservas.controller");

router.get("/", controller.listar);
router.get("/usuario/:id", controller.obtenerPorUsuario);
router.get("/:id", controller.obtener);
router.post("/", controller.crear);
router.put("/:id", controller.actualizar);
router.delete("/:id", controller.eliminar);

module.exports = router;
