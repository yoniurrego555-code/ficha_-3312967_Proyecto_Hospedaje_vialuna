const express = require("express");
const router = express.Router();
const controller = require("../controllers/usuarios.controller");

router.get("/", controller.listar);
router.get("/:id", controller.obtener);
router.post("/login", controller.login);
router.post("/", controller.crear);
router.put("/:id", controller.actualizar);
router.delete("/:id", controller.eliminar);

module.exports = router;
