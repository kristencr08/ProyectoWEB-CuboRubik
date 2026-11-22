const express = require('express');
const router = express.Router();

const { verificarToken } = require('../middlewares/authMiddleware');
const { permitirRoles } = require('../middlewares/rolMiddleware');
const { listarClientes, crearCliente } = require('../controllers/clientesController');

const gestionClientes = permitirRoles('ADMINISTRADOR', 'GERENTE', 'CAJERO');

// GET /api/clientes
router.get('/', verificarToken, gestionClientes, listarClientes);
// POST /api/clientes
router.post('/', verificarToken, gestionClientes, crearCliente);

module.exports = router;
