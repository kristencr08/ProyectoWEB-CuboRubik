
const pool = require('../../DB/db');
const { crearError } = require('../utils/errores');
const { aMilesimas, milesimasATexto } = require('../utils/numeros');

// Consulta base: producto + receta + ingredientes (JSON) + costo.
// costo_unitario = suma(cantidad x ultimo_costo) / cantidad_producida
const SQL_RECETAS = `
  SELECT
      p.producto_id,
      p.codigo,
      p.nombre AS producto,
      p.precio_venta,
      r.receta_id,
      r.nombre AS receta,
      r.cantidad_producida,
      r.instrucciones,
      r.activo AS receta_activa,
      COALESCE(
        json_agg(
          json_build_object(
            'ingrediente_id', i.ingrediente_id,
            'codigo', i.codigo,
            'nombre', i.nombre,
            'cantidad', dr.cantidad,
            'unidad', um.abreviatura,
            'costo_linea',
              ROUND(dr.cantidad * i.ultimo_costo / r.cantidad_producida, 4)
          )
          ORDER BY i.nombre
        ) FILTER (WHERE dr.detalle_receta_id IS NOT NULL),
        '[]'::json
      ) AS ingredientes,
      ROUND(
        COALESCE(SUM(dr.cantidad * i.ultimo_costo), 0)
        / COALESCE(r.cantidad_producida, 1),
        4
      ) AS costo_unitario
  FROM core.productos p
  LEFT JOIN core.recetas r ON r.producto_id = p.producto_id
  LEFT JOIN core.detalle_recetas dr ON dr.receta_id = r.receta_id
  LEFT JOIN core.ingredientes i ON i.ingrediente_id = dr.ingrediente_id
  LEFT JOIN core.unidades_medida um ON um.unidad_id = i.unidad_id
  WHERE p.tipo_producto = 'ELABORADO'
    AND p.activo = TRUE
    {FILTRO}
  GROUP BY p.producto_id, r.receta_id
  ORDER BY p.nombre`;

const listarRecetas = async () => {
  const resultado = await pool.query(SQL_RECETAS.replace('{FILTRO}', ''));
  return resultado.rows;
};

const obtenerReceta = async (productoId) => {
  const resultado = await pool.query(
    SQL_RECETAS.replace('{FILTRO}', 'AND p.producto_id = $1'),
    [productoId]
  );

  if (resultado.rowCount === 0) {
    throw crearError(404, 'Producto elaborado no encontrado');
  }

  return resultado.rows[0];
};

// Crea la receta de un producto o la reemplaza completa (PUT).
// Todo ocurre en una transacción: nunca queda una receta a medias.
const guardarReceta = async (productoId, datos) => {
  const {
    nombre,
    cantidadProducida = 1,
    instrucciones = null,
    ingredientes
  } = datos;

  const producidaTexto = milesimasATexto(
    aMilesimas(cantidadProducida, 'La cantidad producida')
  );

  const lineas = ingredientes.map((linea) => ({
    ingredienteId: linea.ingredienteId,
    cantidad: milesimasATexto(aMilesimas(linea.cantidad, 'La cantidad del ingrediente'))
  }));

  if (lineas.some((l) => Number(l.cantidad) <= 0)) {
    throw crearError(400, 'Las cantidades deben ser mayores que 0 (máximo 3 decimales)');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const producto = await client.query(
      `SELECT nombre
       FROM core.productos
       WHERE producto_id = $1
         AND activo = TRUE
         AND tipo_producto = 'ELABORADO'`,
      [productoId]
    );

    if (producto.rowCount === 0) {
      throw crearError(404, 'El producto no existe o no es de tipo ELABORADO');
    }

    // Todos los ingredientes deben existir y estar activos
    const ids = lineas.map((l) => l.ingredienteId);
    const validos = await client.query(
      `SELECT ingrediente_id
       FROM core.ingredientes
       WHERE ingrediente_id = ANY($1::BIGINT[])
         AND activo = TRUE`,
      [ids]
    );

    if (validos.rowCount !== ids.length) {
      throw crearError(400, 'Hay ingredientes que no existen o están inactivos');
    }

    const receta = await client.query(
      `INSERT INTO core.recetas
          (producto_id, nombre, cantidad_producida, instrucciones, activo)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (producto_id) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          cantidad_producida = EXCLUDED.cantidad_producida,
          instrucciones = EXCLUDED.instrucciones,
          activo = TRUE
       RETURNING receta_id`,
      [
        productoId,
        (nombre || `Receta ${producto.rows[0].nombre}`).trim(),
        producidaTexto,
        instrucciones
      ]
    );

    const recetaId = receta.rows[0].receta_id;

    await client.query(
      'DELETE FROM core.detalle_recetas WHERE receta_id = $1',
      [recetaId]
    );

    for (const linea of lineas) {
      await client.query(
        `INSERT INTO core.detalle_recetas (receta_id, ingrediente_id, cantidad)
         VALUES ($1, $2, $3)`,
        [recetaId, linea.ingredienteId, linea.cantidad]
      );
    }

    await client.query('COMMIT');

    return recetaId;

  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

// Activar / desactivar receta. Con la receta inactiva, la venta de ese
// producto se rechaza (descontarStockVenta exige receta activa).
const cambiarEstadoReceta = async (productoId, activo) => {
  const resultado = await pool.query(
    `UPDATE core.recetas
     SET activo = $2
     WHERE producto_id = $1
     RETURNING receta_id, activo`,
    [productoId, activo]
  );

  if (resultado.rowCount === 0) {
    throw crearError(404, 'El producto no tiene receta registrada');
  }

  return resultado.rows[0];
};

module.exports = {
  listarRecetas,
  obtenerReceta,
  guardarReceta,
  cambiarEstadoReceta
};
