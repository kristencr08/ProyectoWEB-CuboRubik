// CONTROLADOR DE INGREDIENTES Y UNIDADES DE MEDIDA

const { responderError } = require('../utils/errores');
const { leerIdRuta } = require('../utils/consultas');
const service = require('../services/ingredientesService');
const { validarIngrediente } = require('../validators/inventarioValidation');

// GET /api/inventario/unidades
const obtenerUnidades = async (req, res) => {
  try {
    const unidades = await service.listarUnidades();
    return res.status(200).json({ ok: true, unidades });
  } catch (error) {
    return responderError(res, error, 'Error al consultar unidades');
  }
};

// GET /api/inventario/ingredientes
const obtenerIngredientes = async (req, res) => {
  try {
    const ingredientes = await service.listarIngredientes();
    return res.status(200).json({ ok: true, total: ingredientes.length, ingredientes });
  } catch (error) {
    return responderError(res, error, 'Error al consultar ingredientes');
  }
};

// POST /api/inventario/ingredientes
const crearIngrediente = async (req, res) => {
  try {
    const validacion = validarIngrediente(req.body, { esCreacion: true });

    if (!validacion.valido) {
      return res.status(400).json({ ok: false, errores: validacion.errores });
    }

    const ingrediente = await service.crearIngrediente(req.body);

    return res.status(201).json({
      ok: true,
      mensaje: 'Ingrediente creado',
      ingrediente
    });
  } catch (error) {
    return responderError(res, error, 'Error al crear el ingrediente');
  }
};

// PUT /api/inventario/ingredientes/:ingredienteId
const actualizarIngrediente = async (req, res) => {
  try {
    const ingredienteId = leerIdRuta(req.params.ingredienteId, 'ingrediente');
    const validacion = validarIngrediente(req.body, { esCreacion: false });

    if (!validacion.valido) {
      return res.status(400).json({ ok: false, errores: validacion.errores });
    }

    const ingrediente = await service.actualizarIngrediente(
      ingredienteId, req.body
    );

    return res.status(200).json({ ok: true, ingrediente });
  } catch (error) {
    return responderError(res, error, 'Error al actualizar el ingrediente');
  }
};

module.exports = {
  obtenerUnidades,
  obtenerIngredientes,
  crearIngrediente,
  actualizarIngrediente
};
