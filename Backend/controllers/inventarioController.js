// CONTROLADOR DE INVENTARIO

const pool = require('../../DB/db');
const { responderError } = require('../utils/errores');
const {
  leerIdRuta, leerLimite, leerFecha, leerOpcion
} = require('../utils/consultas');
const { obtenerSucursalUsuario } = require('../services/contextoService');
const {
  consultarInventario,
  consultarAlertas,
  establecerStockMinimo,
  ajustarStock,
  consultarMovimientos
} = require('../services/stockService');
const {
  validarAjusteStock,
  validarStockMinimo
} = require('../validators/inventarioValidation');
const { TIPOS_ARTICULO } = require('../validators/comunes');

// GET /api/inventario
const obtenerInventario = async (req, res) => {
  try {
    const sucursal = await obtenerSucursalUsuario(pool, req.usuario.id);
    const inventario = await consultarInventario(sucursal.sucursal_id);

    return res.status(200).json({
      ok: true,
      sucursal,
      total: inventario.length,
      alertas: inventario.filter((a) => a.estado_stock !== 'OK').length,
      inventario
    });
  } catch (error) {
    return responderError(res, error, 'Error al consultar inventario');
  }
};

// GET /api/inventario/alertas
const obtenerAlertas = async (req, res) => {
  try {
    const sucursal = await obtenerSucursalUsuario(pool, req.usuario.id);
    const alertas = await consultarAlertas(sucursal.sucursal_id);

    return res.status(200).json({
      ok: true,
      sucursal,
      total: alertas.length,
      alertas
    });
  } catch (error) {
    return responderError(res, error, 'Error al consultar alertas de stock');
  }
};

// GET /api/inventario/movimientos?tipo=&articuloId=&movimiento=&desde=&hasta=&limite=
const obtenerMovimientos = async (req, res) => {
  try {
    const sucursal = await obtenerSucursalUsuario(pool, req.usuario.id);

    const filtros = {
      tipo: leerOpcion(req.query.tipo, TIPOS_ARTICULO, 'El tipo'),
      movimiento: leerOpcion(
        req.query.movimiento, ['ENTRADA', 'SALIDA', 'AJUSTE'], 'El movimiento'
      ),
      articuloId: req.query.articuloId
        ? leerIdRuta(req.query.articuloId, 'artículo')
        : undefined,
      desde: leerFecha(req.query.desde, 'La fecha desde'),
      hasta: leerFecha(req.query.hasta, 'La fecha hasta'),
      limite: leerLimite(req.query.limite)
    };

    const movimientos = await consultarMovimientos(sucursal.sucursal_id, filtros);

    return res.status(200).json({
      ok: true,
      total: movimientos.length,
      movimientos
    });
  } catch (error) {
    return responderError(res, error, 'Error al consultar movimientos');
  }
};

// PUT /api/inventario/stock-minimo
const definirStockMinimo = async (req, res) => {
  try {
    const validacion = validarStockMinimo(req.body);

    if (!validacion.valido) {
      return res.status(400).json({ ok: false, errores: validacion.errores });
    }

    const sucursal = await obtenerSucursalUsuario(pool, req.usuario.id);
    const { tipo, articuloId, stockMinimo } = req.body;

    const resultado = await establecerStockMinimo({
      sucursalId: sucursal.sucursal_id, tipo, articuloId, stockMinimo
    });

    return res.status(200).json({
      ok: true,
      mensaje: 'Stock mínimo actualizado',
      existencia: resultado
    });
  } catch (error) {
    return responderError(res, error, 'Error al definir el stock mínimo');
  }
};

// POST /api/inventario/ajustes
const registrarAjuste = async (req, res) => {
  try {
    const validacion = validarAjusteStock(req.body);

    if (!validacion.valido) {
      return res.status(400).json({ ok: false, errores: validacion.errores });
    }

    const sucursal = await obtenerSucursalUsuario(pool, req.usuario.id);
    const { tipo, articuloId, nuevaCantidad, motivo } = req.body;

    const resultado = await ajustarStock({
      sucursalId: sucursal.sucursal_id,
      usuarioId: req.usuario.id,
      tipo, articuloId, nuevaCantidad, motivo
    });

    return res.status(201).json({
      ok: true,
      mensaje: 'Ajuste registrado',
      ajuste: resultado
    });
  } catch (error) {
    return responderError(res, error, 'Error al registrar el ajuste');
  }
};

module.exports = {
  obtenerInventario,
  obtenerAlertas,
  obtenerMovimientos,
  definirStockMinimo,
  registrarAjuste
};
