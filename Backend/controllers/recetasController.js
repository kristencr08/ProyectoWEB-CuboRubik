// CONTROLADOR DE RECETAS

const { responderError } = require('../utils/errores');
const { leerIdRuta } = require('../utils/consultas');
const service = require('../services/recetasService');
const { validarReceta } = require('../validators/inventarioValidation');

// GET /api/recetas
const obtenerRecetas = async (req, res) => {
  try {
    const recetas = await service.listarRecetas();
    return res.status(200).json({ ok: true, total: recetas.length, recetas });
  } catch (error) {
    return responderError(res, error, 'Error al consultar recetas');
  }
};

// GET /api/recetas/:productoId
const obtenerRecetaPorProducto = async (req, res) => {
  try {
    const productoId = leerIdRuta(req.params.productoId, 'producto');
    const receta = await service.obtenerReceta(productoId);
    return res.status(200).json({ ok: true, receta });
  } catch (error) {
    return responderError(res, error, 'Error al consultar la receta');
  }
};

// PUT /api/recetas/:productoId  (crea o reemplaza la receta completa)
const guardarReceta = async (req, res) => {
  try {
    const productoId = leerIdRuta(req.params.productoId, 'producto');
    const validacion = validarReceta(req.body);

    if (!validacion.valido) {
      return res.status(400).json({ ok: false, errores: validacion.errores });
    }

    await service.guardarReceta(productoId, req.body);
    const receta = await service.obtenerReceta(productoId);

    return res.status(200).json({
      ok: true,
      mensaje: 'Receta guardada',
      receta
    });
  } catch (error) {
    return responderError(res, error, 'Error al guardar la receta');
  }
};

// PATCH /api/recetas/:productoId/estado   { "activo": true|false }
const cambiarEstado = async (req, res) => {
  try {
    const productoId = leerIdRuta(req.params.productoId, 'producto');
    const activo = req.body && req.body.activo;

    if (typeof activo !== 'boolean') {
      return res.status(400).json({
        ok: false,
        mensaje: 'El campo activo debe ser verdadero o falso'
      });
    }

    const receta = await service.cambiarEstadoReceta(productoId, activo);

    return res.status(200).json({ ok: true, receta });
  } catch (error) {
    return responderError(res, error, 'Error al cambiar el estado de la receta');
  }
};

module.exports = {
  obtenerRecetas,
  obtenerRecetaPorProducto,
  guardarReceta,
  cambiarEstado
};
