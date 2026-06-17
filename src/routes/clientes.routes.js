const express = require("express");
const router = express.Router();
const controller = require("../controllers/clientes.controller");
const upload = require("../middlewares/upload.middleware");
const { authenticateToken } = require("../middlewares/auth.middleware");

router.get("/", authenticateToken, controller.listar);
router.get("/:id", authenticateToken, controller.obtener);
router.post("/login", controller.login);
router.post("/", authenticateToken, upload.single("avatar"), controller.crear);
router.put("/:id", authenticateToken, upload.single("avatar"), controller.actualizar);
router.delete("/:id", authenticateToken, controller.eliminar);

module.exports = router;
