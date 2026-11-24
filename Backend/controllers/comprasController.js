// CONTROLADOR DE COMPRAS

const pool = require('../../DB/db');
const { responderError } = require('../utils/errores');
const { leerIdRuta, leerLimite, leerOpcion } = require('../utils/consultas');
const { obtenerSucursalUsuario } = require('../services/contextoService');
const service = require('../services/comprasService');
const {
  validarCompra,
  validarAnulacion
} = require('../validators/comprasValidation');

const ESTADOS_COMPRA = ['PENDIENTE', 'RECIBIDA', 'ANULADA'];

// GET /api/compras?estado=&proveedorId=&limite=
const obtenerCompras = async (req, res) => {
  try {
    const sucursal = await obtenerSucursalUsuario(pool, req.usuario.id);

    const compras = await service.listarCompras(sucursal.sucursal_id, {
      estado: leerOpcion(req.query.estado, ESTADOS_COMPRA, 'El estado'),
      proveedorId: req.query.proveedorId
        ? leerIdRuta(req.query.proveedorId, 'proveedor')
        : undefined,
      limite: leerLimite(req.query.limite)
    });

    return res.status(200).json({ ok: true, total: compras.length, compras });
  } catch (error) {
    return responderError(res, error, 'Error al consultar compras');
  }
};

// GET /api/compras/:compraId
const obtenerCompraPorId = async (req, res) => {
  try {
    const compraId = leerIdRuta(req.params.compraId, 'identificador de compra');
    const sucursal = await obtenerSucursalUsuario(pool, req.usuario.id);

    const compra = await service.obtenerCompra(compraId, sucursal.sucursal_id);

    return res.status(200).json({ ok: true, compra });
  } catch (error) {
    return responderError(res, error, 'Error al consultar la compra');
  }
};

// POST /api/compras
const registrarCompra = async (req, res) => {
  try {
    const validacion = validarCompra(req.body);

    if (!validacion.valido) {
      return res.status(400).json({ ok: false, errores: validacion.errores });
    }

    const sucursal = await obtenerSucursalUsuario(pool, req.usuario.id);

    const compra = await service.crearCompra({
      ...req.body,
      sucursalId: sucursal.sucursal_id,
      usuarioId: req.usuario.id
    });

    return res.status(201).json({
      ok: true,
      mensaje: 'Compra registrada como PENDIENTE',
      compra
    });
  } catch (error) {
    return responderError(res, error, 'Error al registrar la compra');
  }
};

// POST /api/compras/:compraId/recibir
const recibirCompra = async (req, res) => {
  try {
    const compraId = leerIdRuta(req.params.compraId, 'identificador de compra');
    const sucursal = await obtenerSucursalUsuario(pool, req.usuario.id);

    const resultado = await service.recibirCompra({
      compraId,
      sucursalId: sucursal.sucursal_id,
      usuarioId: req.usuario.id
    });

    return res.status(200).json({
      ok: true,
      mensaje: 'Compra recibida: inventario actualizado y cuenta por pagar generada',
      ...resultado
    });
  } catch (error) {
    return responderError(res, error, 'Error al recibir la compra');
  }
};

// PATCH /api/compras/:compraId/anular   { "motivo": "..." }
const anularCompra = async (req, res) => {
  try {
    const compraId = leerIdRuta(req.params.compraId, 'identificador de compra');
    const validacion = validarAnulacion(req.body);

    if (!validacion.valido) {
      return res.status(400).json({ ok: false, errores: validacion.errores });
    }

    const sucursal = await obtenerSucursalUsuario(pool, req.usuario.id);

    const compra = await service.anularCompra({
      compraId,
      sucursalId: sucursal.sucursal_id,
      motivo: req.body.motivo
    });

    return res.status(200).json({ ok: true, mensaje: 'Compra anulada', compra });
  } catch (error) {
    return responderError(res, error, 'Error al anular la compra');
  }
};

module.exports = {
  obtenerCompras,
  obtenerCompraPorId,
  registrarCompra,
  recibirCompra,
  anularCompra
};
