
const descontarStockVenta = async (
  client,
  { sucursalId, usuarioId, ventaId, detalles }
) => {

  
  const ingredientes = new Map();
  const productosDirectos = new Map();

  
  for (const item of detalles) {

    
    if (item.tipo_producto === 'DIRECTO') {

      const anterior =
        productosDirectos.get(item.producto_id) || 0;

      productosDirectos.set(
        item.producto_id,
        anterior + item.cantidad
      );

      continue;
    }

    
    if (item.tipo_producto !== 'ELABORADO') {
      const error = new Error('Tipo de producto no válido');
      error.status = 400;
      throw error;
    }

    
    const receta = await client.query(
      `SELECT
          dr.ingrediente_id,
          i.nombre,
          i.activo AS ingrediente_activo,
          ROUND(
            dr.cantidad * $2::NUMERIC
            / r.cantidad_producida, 3
          ) AS requerido
       FROM core.recetas r
       JOIN core.detalle_recetas dr
         ON dr.receta_id = r.receta_id
       JOIN core.ingredientes i
         ON i.ingrediente_id = dr.ingrediente_id
       WHERE r.producto_id = $1
         AND r.activo = TRUE`,
      [item.producto_id, item.cantidad]
    );

    if (receta.rowCount === 0) {
      const error = new Error(
        `No hay receta activa para el producto ${item.producto_id}`
      );
      error.status = 409;
      throw error;
    }

    
    for (const fila of receta.rows) {

      if (!fila.ingrediente_activo) {
        const error = new Error(
          `Ingrediente inactivo: ${fila.nombre}`
        );
        error.status = 409;
        throw error;
      }

      const id = String(fila.ingrediente_id);

      
      const milesimas =
        Math.round(Number(fila.requerido) * 1000);

      if (
        !Number.isSafeInteger(milesimas) ||
        milesimas <= 0
      ) {
        const error = new Error(
          `Cantidad inválida para ${fila.nombre}`
        );
        error.status = 409;
        throw error;
      }

      const anterior = ingredientes.get(id) || {
        nombre: fila.nombre,
        milesimas: 0
      };

      anterior.milesimas += milesimas;

      ingredientes.set(id, anterior);
    }
  }

  const movimientos = [];

  // 4. Descontar ingredientes de la sucursal
  const ingredientesOrdenados =
    [...ingredientes].sort(
      (a, b) => Number(a[0]) - Number(b[0])
    );

  for (const [id, dato] of ingredientesOrdenados) {

    const cantidad =
      (dato.milesimas / 1000).toFixed(3);

    const resultado = await client.query(
      `UPDATE core.existencias_ingredientes
       SET cantidad = cantidad - $3::NUMERIC,
           fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE sucursal_id = $1
         AND ingrediente_id = $2
         AND cantidad >= $3::NUMERIC
       RETURNING cantidad`,
      [sucursalId, id, cantidad]
    );

    if (resultado.rowCount === 0) {
      const error = new Error(
        `Stock insuficiente de: ${dato.nombre}`
      );
      error.status = 409;
      throw error;
    }

    // 5. Registrar la salida de inventario
    await client.query(
      `INSERT INTO core.movimientos_inventario
       (
         sucursal_id,
         usuario_id,
         ingrediente_id,
         tipo,
         cantidad,
         descripcion
       )
       VALUES ($1, $2, $3, 'SALIDA', $4, $5)`,
      [
        sucursalId,
        usuarioId,
        id,
        cantidad,
        `Consumo por venta #${ventaId}`
      ]
    );

    movimientos.push({
      tipo: 'INGREDIENTE',
      articulo_id: id,
      nombre: dato.nombre,
      cantidad
    });
  }

  // 6. Descontar productos de reventa
  const directosOrdenados =
    [...productosDirectos].sort(
      (a, b) => Number(a[0]) - Number(b[0])
    );

  for (const [productoId, cantidad] of directosOrdenados) {

    const resultado = await client.query(
      `UPDATE core.existencias_productos
       SET cantidad = cantidad - $3::NUMERIC,
           fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE sucursal_id = $1
         AND producto_id = $2
         AND cantidad >= $3::NUMERIC
       RETURNING cantidad`,
      [sucursalId, productoId, cantidad]
    );

    if (resultado.rowCount === 0) {
      const error = new Error(
        `Stock insuficiente del producto #${productoId}`
      );
      error.status = 409;
      throw error;
    }

    await client.query(
      `INSERT INTO core.movimientos_inventario
       (
         sucursal_id,
         usuario_id,
         producto_id,
         tipo,
         cantidad,
         descripcion
       )
       VALUES ($1, $2, $3, 'SALIDA', $4, $5)`,
      [
        sucursalId,
        usuarioId,
        productoId,
        cantidad,
        `Venta directa #${ventaId}`
      ]
    );

    movimientos.push({
      tipo: 'PRODUCTO_DIRECTO',
      articulo_id: productoId,
      cantidad
    });
  }

  
  return movimientos;
};

module.exports = { descontarStockVenta };
