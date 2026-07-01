const express = require("express");
const router = express.Router();
const controller = require("../controllers/reservas.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");
const uploadComprobante = require("../middlewares/uploadComprobante.middleware");

router.get("/", authenticateToken, controller.listar);
router.get("/usuario/:id", authenticateToken, controller.obtenerPorUsuario);
router.get("/:id", authenticateToken, controller.obtener);
router.post("/", authenticateToken, controller.crear);
router.put("/:id", authenticateToken, controller.actualizar);
router.delete("/:id", authenticateToken, controller.eliminar);

// Pago por comprobante
router.post("/:id/comprobante", authenticateToken, uploadComprobante.single('comprobante'), controller.subirComprobante);
router.delete("/:id/comprobante", authenticateToken, controller.eliminarComprobante);
router.put("/:id/estado-pago", authenticateToken, controller.actualizarEstadoPago);

// Pagos adicionales
router.post("/:id/pago_adicional", authenticateToken, uploadComprobante.single('comprobante'), controller.subirPagoAdicional);
router.put("/pagos/:idPago/estado", authenticateToken, controller.actualizarEstadoPagoAdicional);
module.exports = router;
