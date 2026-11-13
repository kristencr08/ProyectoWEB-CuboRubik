const express = require('express');
const router = express.Router();

// Importar los controladores de caja.
const {
  aperturaCaja,
  movimientoCaja,
  cierreCaja
} = require('../controllers/cajaController');

// Importar middleware de autenticación.
const { verificarToken } = require('../middlewares/authMiddleware');


// RUTAS DE CAJA
router.post(
  '/abrir',
  verificarToken,
  aperturaCaja
);
// Registrar un movimiento en un turno.
router.post(
  '/:turnoId/movimientos',
  verificarToken,
  movimientoCaja
);
// Cerrar una caja.
router.post(
  '/:turnoId/cerrar',
  verificarToken,
  cierreCaja
);


module.exports = router;
