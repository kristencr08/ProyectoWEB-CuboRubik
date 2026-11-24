const express = require('express');
const router = express.Router();

const { verificarToken } = require('../middlewares/authMiddleware');
const { permitirRoles } = require('../middlewares/rolMiddleware');

const {
    obtenerProveedores,
    crearProveedor,
    actualizarProveedor
} = require('../controllers/proveedoresController');

const gestionCompras = permitirRoles('ADMINISTRADOR', 'GERENTE');

// GET /api/proveedores
router.get('/', verificarToken, gestionCompras, obtenerProveedores);
// POST /api/proveedores
router.post('/', verificarToken, gestionCompras, crearProveedor);
// PUT /api/proveedores/:proveedorId
router.put('/:proveedorId', verificarToken, gestionCompras, actualizarProveedor);

module.exports = router;
