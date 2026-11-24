// CONTROLADOR DE CUENTAS POR PAGAR

const pool = require('../../DB/db');
const { responderError } = require('../utils/errores');
const { leerIdRuta, leerLimite, leerOpcion } = require('../utils/consultas');
const { obtenerSucursalUsuario } = require('../services/contextoService');
const service = require('../services/cuentasPagarService');
const { validarPago } = require('../validators/comprasValidation');

const ESTADOS_CXP = ['PENDIENTE', 'PARCIAL', 'PAGADA'];

// GET /api/cuentas-por-pagar?estado=&proveedorId=&vencidas=true&limite=
const obtenerCuentas = async (req, res) => {
  try {
    const sucursal = await obtenerSucursalUsuario(pool, req.usuario.id);

    const cuentas = await service.listarCuentas(sucursal.sucursal_id, {
      estado: leerOpcion(req.query.estado, ESTADOS_CXP, 'El estado'),
      proveedorId: req.query.proveedorId
        ? leerIdRuta(req.query.proveedorId, 'proveedor')
        : undefined,
      soloVencidas: req.query.vencidas === 'true',
      limite: leerLimite(req.query.limite)
    });

    return res.status(200).json({ ok: true, total: cuentas.length, cuentas });
  } catch (error) {
    return responderError(res, error, 'Error al consultar cuentas por pagar');
  }
};

// GET /api/cuentas-por-pagar/resumen
const obtenerResumen = async (req, res) => {
  try {
    const sucursal = await obtenerSucursalUsuario(pool, req.usuario.id);
    const resumen = await service.obtenerResumen(sucursal.sucursal_id);

    return res.status(200).json({ ok: true, resumen });
  } catch (error) {
    return responderError(res, error, 'Error al consultar el resumen');
  }
};

// GET /api/cuentas-por-pagar/:cxpId
const obtenerCuentaPorId = async (req, res) => {
  try {
    const cxpId = leerIdRuta(req.params.cxpId, 'identificador de cuenta');
    const sucursal = await obtenerSucursalUsuario(pool, req.usuario.id);

    const cuenta = await service.obtenerCuenta(cxpId, sucursal.sucursal_id);

    return res.status(200).json({ ok: true, cuenta });
  } catch (error) {
    return responderError(res, error, 'Error al consultar la cuenta');
  }
};

// POST /api/cuentas-por-pagar/:cxpId/pagos
const registrarPago = async (req, res) => {
  try {
    const cxpId = leerIdRuta(req.params.cxpId, 'identificador de cuenta');
    const validacion = validarPago(req.body);

    if (!validacion.valido) {
      return res.status(400).json({ ok: false, errores: validacion.errores });
    }

    const sucursal = await obtenerSucursalUsuario(pool, req.usuario.id);

    const resultado = await service.registrarPago({
      cxpId,
      sucursalId: sucursal.sucursal_id,
      usuarioId: req.usuario.id,
      monto: req.body.monto,
      metodoPago: req.body.metodoPago,
      referencia: req.body.referencia
    });

    return res.status(201).json({
      ok: true,
      mensaje: 'Pago registrado',
      ...resultado
    });
  } catch (error) {
    return responderError(res, error, 'Error al registrar el pago');
  }
};

module.exports = {
  obtenerCuentas,
  obtenerResumen,
  obtenerCuentaPorId,
  registrarPago
};
