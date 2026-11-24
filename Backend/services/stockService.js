
const pool = require('../../DB/db');
const { crearError } = require('../utils/errores');
const { aMilesimas, milesimasATexto } = require('../utils/numeros');

// Nombres de tabla/columna FIJOS (nunca vienen del usuario), por eso es
// seguro interpolarlos en el SQL. Los valores sí van siempre como $1, $2...
const CONFIG_ARTICULO = {
  INGREDIENTE: {
    tabla: 'core.existencias_ingredientes',
    columna: 'ingrediente_id',
    existe: `SELECT 1 FROM core.ingredientes
             WHERE ingrediente_id = $1 AND activo = TRUE`
  },
  PRODUCTO_DIRECTO: {
    tabla: 'core.existencias_productos',
    columna: 'producto_id',
    existe: `SELECT 1 FROM core.productos
             WHERE producto_id = $1 AND activo = TRUE
               AND tipo_producto = 'DIRECTO'`
  }
};

// ---------------------------------------------------------
// 1. CONSULTAR INVENTARIO DE UNA SUCURSAL
// ---------------------------------------------------------
const consultarInventario = async (sucursalId) => {
  const resultado = await pool.query(
    `SELECT *
     FROM (
        SELECT
            'INGREDIENTE' AS tipo,
            i.ingrediente_id AS articulo_id,
            i.codigo,
            i.nombre,
            COALESCE(e.cantidad, 0) AS stock,
            COALESCE(e.stock_minimo, 0) AS stock_minimo,
            um.abreviatura AS unidad,
            i.ultimo_costo
        FROM core.ingredientes i
        JOIN core.unidades_medida um
            ON um.unidad_id = i.unidad_id
        LEFT JOIN core.existencias_ingredientes e
            ON e.ingrediente_id = i.ingrediente_id
           AND e.sucursal_id = $1
        WHERE i.activo = TRUE

        UNION ALL

        SELECT
            'PRODUCTO_DIRECTO' AS tipo,
            p.producto_id AS articulo_id,
            p.codigo,
            p.nombre,
            COALESCE(ep.cantidad, 0) AS stock,
            COALESCE(ep.stock_minimo, 0) AS stock_minimo,
            'und' AS unidad,
            p.ultimo_costo
        FROM core.productos p
        LEFT JOIN core.existencias_productos ep
            ON ep.producto_id = p.producto_id
           AND ep.sucursal_id = $1
        WHERE p.activo = TRUE
          AND p.tipo_producto = 'DIRECTO'
     ) inv
     ORDER BY tipo, nombre`,
    [sucursalId]
  );

  // El estado se calcula aquí: una sola regla para toda la API
  return resultado.rows.map((fila) => {
    const stock = Number(fila.stock);
    const minimo = Number(fila.stock_minimo);

    let estadoStock = 'OK';
    if (stock === 0) {
      estadoStock = 'SIN_STOCK';
    } else if (minimo > 0 && stock <= minimo) {
      estadoStock = 'BAJO';
    }

    return { ...fila, estado_stock: estadoStock };
  });
};

// ---------------------------------------------------------
// 2. ALERTAS DE STOCK MINIMO
// Reutilizable: db puede ser el pool o un client (por ejemplo, para
// devolver las alertas justo después de una venta).
// ---------------------------------------------------------
const consultarAlertas = async (sucursalId, db = pool) => {
  const resultado = await db.query(
    `SELECT tipo, articulo_id, codigo, nombre, stock, stock_minimo, unidad
     FROM core.v_alertas_stock
     WHERE sucursal_id = $1
     ORDER BY (stock = 0) DESC, nombre`,
    [sucursalId]
  );

  return resultado.rows;
};

// ---------------------------------------------------------
// 3. DEFINIR STOCK MINIMO
// ---------------------------------------------------------
const establecerStockMinimo = async ({
  sucursalId, tipo, articuloId, stockMinimo
}) => {
  const config = CONFIG_ARTICULO[tipo];
  const minimo = milesimasATexto(aMilesimas(stockMinimo, 'El stock mínimo'));

  const existe = await pool.query(config.existe, [articuloId]);

  if (existe.rowCount === 0) {
    throw crearError(404, 'El artículo no existe o está inactivo');
  }

  // UPSERT: si la sucursal aún no tiene fila de existencia, se crea en 0
  const resultado = await pool.query(
    `INSERT INTO ${config.tabla}
        (sucursal_id, ${config.columna}, cantidad, stock_minimo)
     VALUES ($1, $2, 0, $3)
     ON CONFLICT (sucursal_id, ${config.columna})
     DO UPDATE SET
        stock_minimo = EXCLUDED.stock_minimo,
        fecha_actualizacion = CURRENT_TIMESTAMP
     RETURNING cantidad, stock_minimo`,
    [sucursalId, articuloId, minimo]
  );

  return resultado.rows[0];
};

// ---------------------------------------------------------
// 4. AJUSTE MANUAL DE STOCK (merma, conteo físico, etc.)
// Deja la existencia en "nuevaCantidad" y registra un movimiento AJUSTE.
// La tabla de movimientos exige cantidad > 0, así que se guarda el valor
// absoluto de la diferencia y el sentido (+/-) queda en la descripción.
// ---------------------------------------------------------
const ajustarStock = async ({
  sucursalId, usuarioId, tipo, articuloId, nuevaCantidad, motivo
}) => {
  const config = CONFIG_ARTICULO[tipo];
  const nuevaMilesimas = aMilesimas(nuevaCantidad, 'La nueva cantidad');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existe = await client.query(config.existe, [articuloId]);

    if (existe.rowCount === 0) {
      throw crearError(404, 'El artículo no existe o está inactivo');
    }

    // Garantiza que la fila exista y la bloquea mientras dura la transacción
    await client.query(
      `INSERT INTO ${config.tabla} (sucursal_id, ${config.columna}, cantidad)
       VALUES ($1, $2, 0)
       ON CONFLICT (sucursal_id, ${config.columna}) DO NOTHING`,
      [sucursalId, articuloId]
    );

    const actual = await client.query(
      `SELECT cantidad
       FROM ${config.tabla}
       WHERE sucursal_id = $1
         AND ${config.columna} = $2
       FOR UPDATE`,
      [sucursalId, articuloId]
    );

    const anteriorMilesimas = Math.round(Number(actual.rows[0].cantidad) * 1000);
    const diferencia = nuevaMilesimas - anteriorMilesimas;

    if (diferencia === 0) {
      throw crearError(400, 'La nueva cantidad es igual a la existencia actual');
    }

    await client.query(
      `UPDATE ${config.tabla}
       SET cantidad = $3,
           fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE sucursal_id = $1
         AND ${config.columna} = $2`,
      [sucursalId, articuloId, milesimasATexto(nuevaMilesimas)]
    );

    const signo = diferencia > 0 ? '+' : '-';
    const descripcion =
      `Ajuste manual (${signo}): ${motivo.trim()} ` +
      `[${milesimasATexto(anteriorMilesimas)} -> ${milesimasATexto(nuevaMilesimas)}]`;

    await client.query(
      `INSERT INTO core.movimientos_inventario
          (sucursal_id, usuario_id, ${config.columna}, tipo, cantidad, descripcion)
       VALUES ($1, $2, $3, 'AJUSTE', $4, $5)`,
      [
        sucursalId,
        usuarioId,
        articuloId,
        milesimasATexto(Math.abs(diferencia)),
        descripcion
      ]
    );

    await client.query('COMMIT');

    return {
      anterior: milesimasATexto(anteriorMilesimas),
      nueva: milesimasATexto(nuevaMilesimas),
      diferencia: `${signo}${milesimasATexto(Math.abs(diferencia))}`
    };

  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

// ---------------------------------------------------------
// 5. KARDEX (historial de movimientos)
// ---------------------------------------------------------
const consultarMovimientos = async (sucursalId, filtros = {}) => {
  const condiciones = ['m.sucursal_id = $1'];
  const valores = [sucursalId];

  if (filtros.tipo === 'INGREDIENTE') {
    condiciones.push('m.ingrediente_id IS NOT NULL');
  } else if (filtros.tipo === 'PRODUCTO_DIRECTO') {
    condiciones.push('m.producto_id IS NOT NULL');
  }

  if (filtros.articuloId) {
    valores.push(filtros.articuloId);
    condiciones.push(
      `COALESCE(m.ingrediente_id, m.producto_id) = $${valores.length}`
    );
  }

  if (filtros.movimiento) {
    valores.push(filtros.movimiento);
    condiciones.push(`m.tipo = $${valores.length}`);
  }

  if (filtros.desde) {
    valores.push(filtros.desde);
    condiciones.push(`m.fecha >= $${valores.length}::DATE`);
  }

  if (filtros.hasta) {
    valores.push(filtros.hasta);
    condiciones.push(`m.fecha < ($${valores.length}::DATE + 1)`);
  }

  valores.push(filtros.limite);

  const resultado = await pool.query(
    `SELECT
        m.movimiento_id,
        m.fecha,
        m.tipo AS movimiento,
        CASE WHEN m.ingrediente_id IS NOT NULL
             THEN 'INGREDIENTE' ELSE 'PRODUCTO_DIRECTO' END AS tipo_articulo,
        COALESCE(m.ingrediente_id, m.producto_id) AS articulo_id,
        COALESCE(i.nombre, p.nombre) AS articulo,
        m.cantidad,
        m.descripcion,
        u.nombre AS usuario
     FROM core.movimientos_inventario m
     JOIN core.usuarios u ON u.usuario_id = m.usuario_id
     LEFT JOIN core.ingredientes i ON i.ingrediente_id = m.ingrediente_id
     LEFT JOIN core.productos p ON p.producto_id = m.producto_id
     WHERE ${condiciones.join(' AND ')}
     ORDER BY m.fecha DESC, m.movimiento_id DESC
     LIMIT $${valores.length}`,
    valores
  );

  return resultado.rows;
};

module.exports = {
  consultarInventario,
  consultarAlertas,
  establecerStockMinimo,
  ajustarStock,
  consultarMovimientos
};
