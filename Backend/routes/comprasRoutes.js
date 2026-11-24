const express = require('express');
const router = express.Router();

const { verificarToken } = require('../middlewares/authMiddleware');
const { permitirRoles } = require('../middlewares/rolMiddleware');

const {
    obtenerCompras,
    obtenerCompraPorId,
    registrarCompra,
    recibirCompra,
    anularCompra
} = require('../controllers/comprasController');

// Todas las rutas de compras requieren sesión y rol administrativo
router.use(verificarToken, permitirRoles('ADMINISTRADOR', 'GERENTE'));

// GET /api/compras
router.get('/', obtenerCompras);
// GET /api/compras/:compraId
router.get('/:compraId', obtenerCompraPorId);
// POST /api/compras  (queda PENDIENTE)
router.post('/', registrarCompra);
// POST /api/compras/:compraId/recibir  (entra stock + genera cuenta por pagar)
router.post('/:compraId/recibir', recibirCompra);
// PATCH /api/compras/:compraId/anular  (solo PENDIENTES)
router.patch('/:compraId/anular', anularCompra);

module.exports = router;
