const express = require("express");
const router = express.Router();
const controller = require("../controllers/rolespermisos.controller");

// 🔥 ESTE ES EL IMPORTANTE
router.get("/", controller.listar);
router.post("/seed-defaults", controller.sembrarPermisosBase);

router.get("/:id", controller.obtener);
router.post("/", controller.crear);
router.put("/:id", controller.actualizar);
router.delete("/:id", controller.eliminar);

module.exports = router;
