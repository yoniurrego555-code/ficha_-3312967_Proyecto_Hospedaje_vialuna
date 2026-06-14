const express = require('express');
const router = express.Router({ mergeParams: true });
const controller = require('../controllers/imagenes_habitacion.controller');
const upload = require('../middlewares/upload.middleware');
const { authenticateToken } = require('../middlewares/auth.middleware');

router.get('/', controller.listar);
router.post('/', authenticateToken, upload.single('imagen'), controller.crear);
router.delete('/:id', authenticateToken, controller.eliminar);

module.exports = router;
