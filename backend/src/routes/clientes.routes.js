const express = require("express");
const router = express.Router();
const controller = require("../controllers/clientes.main.controller");
const { authenticateToken } = require("../middlewares/auth.Middleware");

router.get("/", authenticateToken, controller.listar);
router.get("/:id", authenticateToken, controller.obtener);
router.post("/login", controller.login);
router.post("/", authenticateToken, controller.crear);
router.put("/:id", authenticateToken, controller.actualizar);
router.delete("/:id", authenticateToken, controller.eliminar);

module.exports = router;
