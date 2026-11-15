
const express = require('express');
const router = express.Router();

const { verificarToken } = require('../middlewares/authMiddleware');

const {
    obtenerInventario
} = require('../controllers/inventarioController');

// GET /api/inventario
router.get('/', verificarToken, obtenerInventario);

module.exports = router;
