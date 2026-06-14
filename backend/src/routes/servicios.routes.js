const express = require("express");
const router = express.Router();
const controller = require("../controllers/servicios.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

router.get("/", controller.listar);
router.get("/:id", controller.obtener);
router.post("/", authenticateToken, upload.single("imagen"), controller.crear);
router.put("/:id", authenticateToken, upload.single("imagen"), controller.actualizar);
router.delete("/:id", authenticateToken, controller.eliminar);

module.exports = router;