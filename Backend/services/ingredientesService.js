
const pool = require('../../DB/db');
const { crearError } = require('../utils/errores');

const listarUnidades = async () => {
  const resultado = await pool.query(
    `SELECT unidad_id, nombre, abreviatura
     FROM core.unidades_medida
     WHERE activo = TRUE
     ORDER BY nombre`
  );
  return resultado.rows;
};

const listarIngredientes = async () => {
  const resultado = await pool.query(
    `SELECT i.ingrediente_id, i.codigo, i.nombre, i.descripcion,
            i.activo, i.ultimo_costo,
            um.unidad_id, um.abreviatura AS unidad
     FROM core.ingredientes i
     JOIN core.unidades_medida um ON um.unidad_id = i.unidad_id
     ORDER BY i.nombre`
  );
  return resultado.rows;
};

const crearIngrediente = async ({ codigo, nombre, unidadId, descripcion }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const unidad = await client.query(
      'SELECT 1 FROM core.unidades_medida WHERE unidad_id = $1 AND activo = TRUE',
      [unidadId]
    );

    if (unidad.rowCount === 0) {
      throw crearError(404, 'La unidad de medida no existe');
    }

    const existente = await client.query(
      'SELECT 1 FROM core.ingredientes WHERE codigo = $1',
      [codigo.trim().toUpperCase()]
    );

    if (existente.rowCount > 0) {
      throw crearError(409, 'Ya existe un ingrediente con ese código');
    }

    const ingrediente = await client.query(
      `INSERT INTO core.ingredientes (unidad_id, codigo, nombre, descripcion)
       VALUES ($1, $2, $3, $4)
       RETURNING ingrediente_id, codigo, nombre, descripcion, activo`,
      [
        unidadId,
        codigo.trim().toUpperCase(),
        nombre.trim(),
        descripcion || null
      ]
    );

    await client.query(
      `INSERT INTO core.existencias_ingredientes
          (sucursal_id, ingrediente_id, cantidad)
       SELECT sucursal_id, $1, 0
       FROM core.sucursales
       WHERE activo = TRUE
       ON CONFLICT (sucursal_id, ingrediente_id) DO NOTHING`,
      [ingrediente.rows[0].ingrediente_id]
    );

    await client.query('COMMIT');

    return ingrediente.rows[0];

  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

const actualizarIngrediente = async (ingredienteId, { nombre, descripcion, activo }) => {
  const resultado = await pool.query(
    `UPDATE core.ingredientes
     SET nombre = COALESCE($2, nombre),
         descripcion = COALESCE($3, descripcion),
         activo = COALESCE($4, activo)
     WHERE ingrediente_id = $1
     RETURNING ingrediente_id, codigo, nombre, descripcion, activo`,
    [
      ingredienteId,
      nombre ? nombre.trim() : null,
      descripcion === undefined ? null : descripcion,
      activo === undefined ? null : activo
    ]
  );

  if (resultado.rowCount === 0) {
    throw crearError(404, 'Ingrediente no encontrado');
  }

  return resultado.rows[0];
};

module.exports = {
  listarUnidades,
  listarIngredientes,
  crearIngrediente,
  actualizarIngrediente
};
