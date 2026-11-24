const express = require('express');
const router = express.Router();

const { verificarToken } = require('../middlewares/authMiddleware');
const { permitirRoles } = require('../middlewares/rolMiddleware');
const { listarFacturas, obtenerFactura } = require('../controllers/facturasController');

const consultaFacturas = permitirRoles('ADMINISTRADOR', 'GERENTE', 'CAJERO');

// GET /api/facturas
router.get('/', verificarToken, consultaFacturas, listarFacturas);
// GET /api/facturas/:id
router.get('/:id', verificarToken, consultaFacturas, obtenerFactura);

module.exports = router;
