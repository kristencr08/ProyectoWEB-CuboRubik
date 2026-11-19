const express = require('express');
const router = express.Router();

const { verificarToken } = require('../middlewares/authMiddleware');
const { permitirRoles } = require('../middlewares/rolMiddleware');

const {
    obtenerInventario,
    obtenerAlertas,
    obtenerMovimientos,
    definirStockMinimo,
    registrarAjuste
} = require('../controllers/inventarioController');

const {
    obtenerUnidades,
    obtenerIngredientes,
    crearIngrediente,
    actualizarIngrediente
} = require('../controllers/ingredientesController');

// Roles que pueden modificar el inventario
const gestionInventario = permitirRoles('ADMINISTRADOR', 'GERENTE');

// CONSULTAS (cualquier usuario autenticado)
// GET /api/inventario
router.get('/', verificarToken, obtenerInventario);
// GET /api/inventario/alertas
router.get('/alertas', verificarToken, obtenerAlertas);
// GET /api/inventario/movimientos
router.get('/movimientos', verificarToken, obtenerMovimientos);
// GET /api/inventario/unidades
router.get('/unidades', verificarToken, obtenerUnidades);
// GET /api/inventario/ingredientes
router.get('/ingredientes', verificarToken, obtenerIngredientes);

// MODIFICACIONES (solo administrador o gerente)
// PUT /api/inventario/stock-minimo
router.put('/stock-minimo', verificarToken, gestionInventario, definirStockMinimo);
// POST /api/inventario/ajustes
router.post('/ajustes', verificarToken, gestionInventario, registrarAjuste);
// POST /api/inventario/ingredientes
router.post('/ingredientes', verificarToken, gestionInventario, crearIngrediente);
// PUT /api/inventario/ingredientes/:ingredienteId
router.put(
    '/ingredientes/:ingredienteId',
    verificarToken,
    gestionInventario,
    actualizarIngrediente
);

module.exports = router;
