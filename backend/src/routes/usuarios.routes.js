const express = require("express");
const router = express.Router();
const controller = require("../controllers/usuarios.controller");
const upload = require("../middlewares/upload.middleware");

router.get("/", controller.listar);
router.get("/:id", controller.obtener);
router.post("/login", controller.login);
router.post("/", upload.single("avatar"), controller.crear);
router.put("/:id", upload.single("avatar"), controller.actualizar);
router.delete("/:id", controller.eliminar);

module.exports = router;
