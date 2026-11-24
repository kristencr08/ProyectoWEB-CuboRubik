// CONTROLADOR DE PROVEEDORES

const pool = require('../../DB/db');
const { crearError, responderError } = require('../utils/errores');
const { leerIdRuta } = require('../utils/consultas');
const { validarProveedor } = require('../validators/comprasValidation');

// GET /api/proveedores
const obtenerProveedores = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT proveedor_id, nombre, documento, telefono,
              correo, direccion, activo
       FROM core.proveedores
       ORDER BY nombre`
    );

    return res.status(200).json({
      ok: true,
      total: resultado.rowCount,
      proveedores: resultado.rows
    });
  } catch (error) {
    return responderError(res, error, 'Error al consultar proveedores');
  }
};

// POST /api/proveedores
const crearProveedor = async (req, res) => {
  try {
    const validacion = validarProveedor(req.body, { esCreacion: true });

    if (!validacion.valido) {
      return res.status(400).json({ ok: false, errores: validacion.errores });
    }

    const { nombre, documento, telefono, correo, direccion } = req.body;

    const resultado = await pool.query(
      `INSERT INTO core.proveedores
          (nombre, documento, telefono, correo, direccion)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING proveedor_id, nombre, documento, telefono,
                 correo, direccion, activo`,
      [
        nombre.trim(),
        documento || null,
        telefono || null,
        correo || null,
        direccion || null
      ]
    );

    return res.status(201).json({
      ok: true,
      mensaje: 'Proveedor creado',
      proveedor: resultado.rows[0]
    });
  } catch (error) {
    return responderError(res, error, 'Error al crear el proveedor');
  }
};

// PUT /api/proveedores/:proveedorId
const actualizarProveedor = async (req, res) => {
  try {
    const proveedorId = leerIdRuta(req.params.proveedorId, 'proveedor');
    const validacion = validarProveedor(req.body, { esCreacion: false });

    if (!validacion.valido) {
      return res.status(400).json({ ok: false, errores: validacion.errores });
    }

    const { nombre, documento, telefono, correo, direccion, activo } = req.body;

    // COALESCE: los campos que no se envían conservan su valor actual
    const resultado = await pool.query(
      `UPDATE core.proveedores
       SET nombre = COALESCE($2, nombre),
           documento = COALESCE($3, documento),
           telefono = COALESCE($4, telefono),
           correo = COALESCE($5, correo),
           direccion = COALESCE($6, direccion),
           activo = COALESCE($7, activo)
       WHERE proveedor_id = $1
       RETURNING proveedor_id, nombre, documento, telefono,
                 correo, direccion, activo`,
      [
        proveedorId,
        nombre ? nombre.trim() : null,
        documento ?? null,
        telefono ?? null,
        correo ?? null,
        direccion ?? null,
        activo ?? null
      ]
    );

    if (resultado.rowCount === 0) {
      throw crearError(404, 'Proveedor no encontrado');
    }

    return res.status(200).json({ ok: true, proveedor: resultado.rows[0] });
  } catch (error) {
    return responderError(res, error, 'Error al actualizar el proveedor');
  }
};

module.exports = {
  obtenerProveedores,
  crearProveedor,
  actualizarProveedor
};
