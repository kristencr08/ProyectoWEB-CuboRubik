// SERVICIO DE COMPRAS
const pool = require('../../DB/db');
const { crearError } = require('../utils/errores');
const {
  PORCENTAJE_IVA,
  aCentavos,
  aMilesimas,
  centavosATexto,
  milesimasATexto,
  subtotalLinea,
  calcularIva
} = require('../utils/numeros');

// Igual que en stockService: nombres fijos, nunca provenientes del usuario.
const TABLAS_EXISTENCIA = {
  INGREDIENTE: {
    existencias: 'core.existencias_ingredientes',
    catalogo: 'core.ingredientes',
    columna: 'ingrediente_id'
  },
  PRODUCTO_DIRECTO: {
    existencias: 'core.existencias_productos',
    catalogo: 'core.productos',
    columna: 'producto_id'
  }
};

// ---------------------------------------------------------
// 1. CREAR COMPRA (estado PENDIENTE, aún no mueve inventario)
// ---------------------------------------------------------
const crearCompra = async ({
  sucursalId, usuarioId, proveedorId, numeroDocumento,
  diasCredito = 0, observaciones = null, detalles
}) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const proveedor = await client.query(
      `SELECT proveedor_id
       FROM core.proveedores
       WHERE proveedor_id = $1 AND activo = TRUE`,
      [proveedorId]
    );

    if (proveedor.rowCount === 0) {
      throw crearError(404, 'Proveedor no encontrado o inactivo');
    }

    const documento = numeroDocumento.trim();

    const duplicada = await client.query(
      `SELECT 1
       FROM core.compras
       WHERE proveedor_id = $1 AND numero_documento = $2`,
      [proveedorId, documento]
    );

    if (duplicada.rowCount > 0) {
      throw crearError(
        409,
        'Ya existe una compra con ese número de documento para este proveedor'
      );
    }

    // Validar cada artículo y calcular las líneas con enteros
    const lineas = [];
    let subtotal = 0;

    for (const detalle of detalles) {
      const esIngrediente = detalle.tipo === 'INGREDIENTE';

      const articulo = esIngrediente
        ? await client.query(
            `SELECT 1 FROM core.ingredientes
             WHERE ingrediente_id = $1 AND activo = TRUE`,
            [detalle.articuloId]
          )
        : await client.query(
            `SELECT 1 FROM core.productos
             WHERE producto_id = $1 AND activo = TRUE
               AND tipo_producto = 'DIRECTO'`,
            [detalle.articuloId]
          );

      if (articulo.rowCount === 0) {
        throw crearError(
          404,
          `${esIngrediente ? 'Ingrediente' : 'Producto de reventa'} ` +
          `#${detalle.articuloId} no existe o no es válido`
        );
      }

      const cantidad = aMilesimas(detalle.cantidad, 'La cantidad');
      const costo = aCentavos(detalle.costoUnitario, 'El costo unitario');

      if (cantidad <= 0) {
        throw crearError(400, 'La cantidad debe ser mayor que 0');
      }

      const subtotalDeLinea = subtotalLinea(cantidad, costo);
      subtotal += subtotalDeLinea;

      lineas.push({
        ingredienteId: esIngrediente ? detalle.articuloId : null,
        productoId: esIngrediente ? null : detalle.articuloId,
        cantidad,
        costo,
        subtotal: subtotalDeLinea
      });
    }

    const iva = calcularIva(subtotal);
    const total = subtotal + iva;

    const compra = await client.query(
      `INSERT INTO core.compras
          (proveedor_id, sucursal_id, usuario_id, numero_documento,
           subtotal, porcentaje_iva, iva, total,
           dias_credito, estado, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDIENTE', $10)
       RETURNING compra_id, numero_documento, subtotal, porcentaje_iva,
                 iva, total, dias_credito, estado, fecha_compra`,
      [
        proveedorId, sucursalId, usuarioId, documento,
        centavosATexto(subtotal), PORCENTAJE_IVA.toFixed(2),
        centavosATexto(iva), centavosATexto(total),
        diasCredito, observaciones
      ]
    );

    const compraId = compra.rows[0].compra_id;

    for (const linea of lineas) {
      await client.query(
        `INSERT INTO core.detalle_compras
            (compra_id, ingrediente_id, producto_id,
             cantidad, costo_unitario, subtotal_linea)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          compraId,
          linea.ingredienteId,
          linea.productoId,
          milesimasATexto(linea.cantidad),
          centavosATexto(linea.costo),
          centavosATexto(linea.subtotal)
        ]
      );
    }

    await client.query('COMMIT');

    return { ...compra.rows[0], lineas: lineas.length };

  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

// ---------------------------------------------------------
// 2. RECIBIR COMPRA
// Todo o nada: si algo falla, no entra stock ni se crea la cuenta.
// ---------------------------------------------------------
const recibirCompra = async ({ compraId, sucursalId, usuarioId }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // FOR UPDATE: si dos personas intentan recibir la misma compra a la vez,
    // la segunda espera y luego la ve como RECIBIDA (no duplica el stock).
    const compraResultado = await client.query(
      `SELECT compra_id, proveedor_id, sucursal_id, numero_documento,
              total, dias_credito, estado
       FROM core.compras
       WHERE compra_id = $1
       FOR UPDATE`,
      [compraId]
    );

    if (compraResultado.rowCount === 0) {
      throw crearError(404, 'Compra no encontrada');
    }

    const compra = compraResultado.rows[0];

    if (String(compra.sucursal_id) !== String(sucursalId)) {
      throw crearError(403, 'La compra pertenece a otra sucursal');
    }

    if (compra.estado !== 'PENDIENTE') {
      throw crearError(
        409,
        `La compra ya está ${compra.estado} y no se puede recibir`
      );
    }

    // Orden fijo para evitar interbloqueos entre recepciones simultáneas
    const detalles = await client.query(
      `SELECT ingrediente_id, producto_id, cantidad, costo_unitario
       FROM core.detalle_compras
       WHERE compra_id = $1
       ORDER BY ingrediente_id NULLS LAST, producto_id`,
      [compraId]
    );

    for (const detalle of detalles.rows) {
      const tipo = detalle.ingrediente_id ? 'INGREDIENTE' : 'PRODUCTO_DIRECTO';
      const config = TABLAS_EXISTENCIA[tipo];
      const articuloId = detalle.ingrediente_id || detalle.producto_id;

      // UPSERT: suma a la existencia o la crea si no existía
      await client.query(
        `INSERT INTO ${config.existencias}
            (sucursal_id, ${config.columna}, cantidad)
         VALUES ($1, $2, $3)
         ON CONFLICT (sucursal_id, ${config.columna})
         DO UPDATE SET
            cantidad = ${config.existencias}.cantidad + EXCLUDED.cantidad,
            fecha_actualizacion = CURRENT_TIMESTAMP`,
        [sucursalId, articuloId, detalle.cantidad]
      );

      await client.query(
        `INSERT INTO core.movimientos_inventario
            (sucursal_id, usuario_id, ${config.columna},
             tipo, cantidad, descripcion)
         VALUES ($1, $2, $3, 'ENTRADA', $4, $5)`,
        [
          sucursalId,
          usuarioId,
          articuloId,
          detalle.cantidad,
          `Recepción compra ${compra.numero_documento || compra.compra_id}`
        ]
      );

      // Último costo: base para calcular el costo de las recetas
      await client.query(
        `UPDATE ${config.catalogo}
         SET ultimo_costo = $2
         WHERE ${config.columna} = $1`,
        [articuloId, detalle.costo_unitario]
      );
    }

    await client.query(
      `UPDATE core.compras
       SET estado = 'RECIBIDA',
           fecha_recepcion = CURRENT_TIMESTAMP
       WHERE compra_id = $1`,
      [compraId]
    );

    // Cuenta por pagar: vence "dias_credito" días después de la recepción
    const totalCentavos = Math.round(Number(compra.total) * 100);

    const cuenta = await client.query(
      `INSERT INTO core.cuentas_por_pagar
          (compra_id, proveedor_id, sucursal_id,
           monto_total, saldo,
           fecha_emision, fecha_vencimiento, estado)
       VALUES ($1, $2, $3, $4, $4,
               CURRENT_DATE, CURRENT_DATE + $5::INTEGER, $6)
       RETURNING cxp_id, monto_total, saldo,
                 fecha_emision, fecha_vencimiento, estado`,
      [
        compraId,
        compra.proveedor_id,
        sucursalId,
        compra.total,
        compra.dias_credito,
        totalCentavos === 0 ? 'PAGADA' : 'PENDIENTE'
      ]
    );

    await client.query('COMMIT');

    return {
      compra_id: compraId,
      estado: 'RECIBIDA',
      articulos_ingresados: detalles.rowCount,
      cuenta_por_pagar: cuenta.rows[0]
    };

  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

// ---------------------------------------------------------
// 3. ANULAR COMPRA (solo si sigue PENDIENTE)
// ---------------------------------------------------------
const anularCompra = async ({ compraId, sucursalId, motivo }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const resultado = await client.query(
      `SELECT sucursal_id, estado
       FROM core.compras
       WHERE compra_id = $1
       FOR UPDATE`,
      [compraId]
    );

    if (resultado.rowCount === 0) {
      throw crearError(404, 'Compra no encontrada');
    }

    const compra = resultado.rows[0];

    if (String(compra.sucursal_id) !== String(sucursalId)) {
      throw crearError(403, 'La compra pertenece a otra sucursal');
    }

    if (compra.estado !== 'PENDIENTE') {
      throw crearError(
        409,
        'Solo se pueden anular compras PENDIENTES. ' +
        'Si ya se recibió, corrija el stock con un ajuste de inventario.'
      );
    }

    const anulada = await client.query(
      `UPDATE core.compras
       SET estado = 'ANULADA',
           observaciones = CONCAT_WS(' | ', observaciones, $2::TEXT)
       WHERE compra_id = $1
       RETURNING compra_id, estado`,
      [compraId, `ANULADA: ${motivo.trim()}`]
    );

    await client.query('COMMIT');

    return anulada.rows[0];

  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

// ---------------------------------------------------------
// 4. CONSULTAS
// ---------------------------------------------------------
const listarCompras = async (sucursalId, { estado, proveedorId, limite }) => {
  const condiciones = ['c.sucursal_id = $1'];
  const valores = [sucursalId];

  if (estado) {
    valores.push(estado);
    condiciones.push(`c.estado = $${valores.length}`);
  }

  if (proveedorId) {
    valores.push(proveedorId);
    condiciones.push(`c.proveedor_id = $${valores.length}`);
  }

  valores.push(limite);

  const resultado = await pool.query(
    `SELECT c.compra_id, c.numero_documento, p.nombre AS proveedor,
            c.fecha_compra, c.subtotal, c.iva, c.total,
            c.dias_credito, c.estado
     FROM core.compras c
     JOIN core.proveedores p ON p.proveedor_id = c.proveedor_id
     WHERE ${condiciones.join(' AND ')}
     ORDER BY c.fecha_compra DESC, c.compra_id DESC
     LIMIT $${valores.length}`,
    valores
  );

  return resultado.rows;
};

const obtenerCompra = async (compraId, sucursalId) => {
  const cabecera = await pool.query(
    `SELECT c.compra_id, c.numero_documento, c.proveedor_id,
            p.nombre AS proveedor, c.fecha_compra, c.fecha_recepcion,
            c.subtotal, c.porcentaje_iva, c.iva, c.total,
            c.dias_credito, c.estado, c.observaciones,
            u.nombre AS usuario
     FROM core.compras c
     JOIN core.proveedores p ON p.proveedor_id = c.proveedor_id
     JOIN core.usuarios u ON u.usuario_id = c.usuario_id
     WHERE c.compra_id = $1
       AND c.sucursal_id = $2`,
    [compraId, sucursalId]
  );

  if (cabecera.rowCount === 0) {
    throw crearError(404, 'Compra no encontrada');
  }

  const detalles = await pool.query(
    `SELECT dc.detalle_compra_id,
            CASE WHEN dc.ingrediente_id IS NOT NULL
                 THEN 'INGREDIENTE' ELSE 'PRODUCTO_DIRECTO' END AS tipo,
            COALESCE(dc.ingrediente_id, dc.producto_id) AS articulo_id,
            COALESCE(i.nombre, pr.nombre) AS articulo,
            dc.cantidad, dc.costo_unitario, dc.subtotal_linea
     FROM core.detalle_compras dc
     LEFT JOIN core.ingredientes i ON i.ingrediente_id = dc.ingrediente_id
     LEFT JOIN core.productos pr ON pr.producto_id = dc.producto_id
     WHERE dc.compra_id = $1
     ORDER BY dc.detalle_compra_id`,
    [compraId]
  );

  const cuenta = await pool.query(
    `SELECT cxp_id, monto_total, saldo, fecha_vencimiento, estado
     FROM core.cuentas_por_pagar
     WHERE compra_id = $1`,
    [compraId]
  );

  return {
    ...cabecera.rows[0],
    detalles: detalles.rows,
    cuenta_por_pagar: cuenta.rows[0] || null
  };
};

module.exports = {
  crearCompra,
  recibirCompra,
  anularCompra,
  listarCompras,
  obtenerCompra
};
