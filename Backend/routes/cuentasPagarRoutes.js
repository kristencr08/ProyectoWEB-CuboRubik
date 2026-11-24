const express = require('express');
const router = express.Router();

const { verificarToken } = require('../middlewares/authMiddleware');
const { permitirRoles } = require('../middlewares/rolMiddleware');

const {
    obtenerCuentas,
    obtenerResumen,
    obtenerCuentaPorId,
    registrarPago
} = require('../controllers/cuentasPagarController');

router.use(verificarToken, permitirRoles('ADMINISTRADOR', 'GERENTE'));

// GET /api/cuentas-por-pagar
router.get('/', obtenerCuentas);
// GET /api/cuentas-por-pagar/resumen   (antes de "/:cxpId")
router.get('/resumen', obtenerResumen);
// GET /api/cuentas-por-pagar/:cxpId
router.get('/:cxpId', obtenerCuentaPorId);
// POST /api/cuentas-por-pagar/:cxpId/pagos
router.post('/:cxpId/pagos', registrarPago);

module.exports = router;
