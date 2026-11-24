const express = require('express');
const router = express.Router();

const { verificarToken } = require('../middlewares/authMiddleware');
const { permitirRoles } = require('../middlewares/rolMiddleware');
const { obtenerPerfil, obtenerTurnoActual } = require('../controllers/perfilController');

// GET /api/perfil (cualquier usuario autenticado)
router.get('/', verificarToken, obtenerPerfil);

// GET /api/perfil/turno-actual (roles que pueden vender)
router.get(
  '/turno-actual',
  verificarToken,
  permitirRoles('ADMINISTRADOR', 'GERENTE', 'CAJERO'),
  obtenerTurnoActual
);

module.exports = router;
