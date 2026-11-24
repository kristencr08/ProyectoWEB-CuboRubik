const express = require('express');
const router = express.Router();
const { obtenerProductos, crearPedido } = require('../controllers/posController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.get('/productos', verificarToken, obtenerProductos);
router.post('/pedido', verificarToken, crearPedido);

module.exports = router;