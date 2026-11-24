const express = require('express');
const router = express.Router();

// Importar los controladores de caja.
const {
  aperturaCaja,
  movimientoCaja,
  solicitudCierreCaja,
  autorizacionCierreCaja
} = require('../controllers/cajaController');
// Importar middleware de autenticación.
const { verificarToken } = require('../middlewares/authMiddleware');


// RUTAS DE CAJA
// Abrir caja y asignar cajero.
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
// Solicitar cierre de caja (cajero).
router.post(
  '/:turnoId/solicitar-cierre',
  verificarToken,
  solicitudCierreCaja
);
// Autorizar cierre de caja (administrador o gerente).
router.post(
  '/:turnoId/autorizar-cierre',
  verificarToken,
  autorizacionCierreCaja
);



// EXPORTAR RUTAS
module.exports = router;
