const express = require('express');
const router = express.Router();

const { verificarToken } = require('../middlewares/authMiddleware');
const { permitirRoles } = require('../middlewares/rolMiddleware');

const {
    obtenerRecetas,
    obtenerRecetaPorProducto,
    guardarReceta,
    cambiarEstado
} = require('../controllers/recetasController');

const gestionRecetas = permitirRoles('ADMINISTRADOR', 'GERENTE');

// GET /api/recetas
router.get('/', verificarToken, obtenerRecetas);
// GET /api/recetas/:productoId
router.get('/:productoId', verificarToken, obtenerRecetaPorProducto);
// PUT /api/recetas/:productoId  (crear o reemplazar)
router.put('/:productoId', verificarToken, gestionRecetas, guardarReceta);
// PATCH /api/recetas/:productoId/estado
router.patch('/:productoId/estado', verificarToken, gestionRecetas, cambiarEstado);

module.exports = router;
