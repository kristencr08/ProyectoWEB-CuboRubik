const express = require('express');
const router = express.Router();
const {
    registrarEmpleado,
    obtenerEmpleados,
    obtenerPlanillas,
    crearPlanilla,
    generarDetallePlanilla,
    obtenerPlanilla,
    procesarPlanilla,
    marcarPlanillaPagada
} = require('../controllers/nominaController');

const { verificarToken } = require('../middlewares/authMiddleware');
const { permitirRoles } = require('../middlewares/rolMiddleware');


// RUTAS DE EMPLEADOS
// Registrar un empleado
router.post('/empleados', verificarToken, registrarEmpleado);
// Obtener empleados de una sucursal
router.get(
    '/empleados/sucursal/:sucursalId',
    verificarToken,
    obtenerEmpleados
);


// RUTAS DE PLANILLAS
router.get(
    '/planillas/sucursal/:sucursalId',
    verificarToken,
    permitirRoles('ADMINISTRADOR', 'GERENTE'),
    obtenerPlanillas
);
// Crear planilla quincenal
router.post('/planillas', verificarToken, crearPlanilla);
// Generar detalles y calcular deducciones
router.post(
    '/planillas/:planillaId/detalles',
    verificarToken,
    generarDetallePlanilla
);
// Consultar una planilla
router.get(
    '/planillas/:planillaId',
    verificarToken,
    obtenerPlanilla
);
// Procesar planilla
router.post(
    '/planillas/:planillaId/procesar',
    verificarToken,
    procesarPlanilla
);
// Marcar planilla como pagada
router.patch(
    '/planillas/:planillaId/pagar',
    verificarToken,
    marcarPlanillaPagada
);

    
module.exports = router;
