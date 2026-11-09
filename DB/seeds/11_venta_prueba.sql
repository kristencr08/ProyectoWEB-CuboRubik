
-- =====================================================
-- 11_venta_prueba.sql
-- Venta de prueba de dos pupusas de queso
-- Restaurante Orígenes SV
-- =====================================================

WITH contexto AS (
    SELECT
        t.turno_id,
        t.usuario_apertura AS usuario_id,
        c.sucursal_id
    FROM core.turnos_caja t
    JOIN core.cajas c
        ON c.caja_id = t.caja_id
    WHERE t.turno_id = 1
      AND t.usuario_apertura = 2
      AND t.fecha_cierre IS NULL
),
consumos AS (
    SELECT
        dr.ingrediente_id,
        SUM(dr.cantidad * 2) AS cantidad
    FROM core.recetas r
    JOIN core.detalle_recetas dr
        ON dr.receta_id = r.receta_id
    WHERE r.producto_id = 2
    GROUP BY dr.ingrediente_id
),
stock_disponible AS (
    SELECT NOT EXISTS (
        SELECT 1
        FROM consumos co
        CROSS JOIN contexto ctx
        LEFT JOIN core.existencias_ingredientes ei
            ON ei.sucursal_id = ctx.sucursal_id
           AND ei.ingrediente_id = co.ingrediente_id
        WHERE ei.existencia_id IS NULL
           OR ei.cantidad < co.cantidad
    ) AS disponible
),
venta_nueva AS (
    INSERT INTO core.ventas (
        turno_id,
        usuario_id,
        subtotal,
        porcentaje_iva,
        iva,
        total,
        estado
    )
    SELECT
        ctx.turno_id,
        ctx.usuario_id,
        2.00,
        13.00,
        0.26,
        2.26,
        'PAGADA'
    FROM contexto ctx
    CROSS JOIN stock_disponible sd
    WHERE sd.disponible
      AND NOT EXISTS (
          SELECT 1
          FROM core.facturas
          WHERE serie = 'CF-PRUEBA'
            AND numero = 1
      )
    RETURNING venta_id
),
detalle AS (
    INSERT INTO core.detalle_ventas (
        venta_id,
        producto_id,
        cantidad,
        precio_unitario,
        subtotal_linea
    )
    SELECT
        venta_id,
        2,
        2,
        1.00,
        2.00
    FROM venta_nueva
    RETURNING venta_id
),
pago AS (
    INSERT INTO core.pagos (
        venta_id,
        metodo_pago_id,
        monto,
        referencia
    )
    SELECT
        venta_id,
        1,
        2.26,
        'PAGO-PRUEBA-001'
    FROM detalle
    RETURNING venta_id
),
factura AS (
    INSERT INTO core.facturas (
        venta_id,
        sucursal_id,
        cliente_id,
        tipo_documento,
        serie,
        numero,
        cliente_nombre,
        cliente_documento,
        subtotal,
        porcentaje_iva,
        iva,
        total,
        estado
    )
    SELECT
        vn.venta_id,
        ctx.sucursal_id,
        NULL,
        'CONSUMIDOR_FINAL',
        'CF-PRUEBA',
        1,
        'Consumidor final',
        NULL,
        2.00,
        13.00,
        0.26,
        2.26,
        'EMITIDA'
    FROM venta_nueva vn
    JOIN contexto ctx ON TRUE
    JOIN pago p ON p.venta_id = vn.venta_id
    RETURNING venta_id
),
movimientos AS (
    INSERT INTO core.movimientos_inventario (
        sucursal_id,
        usuario_id,
        ingrediente_id,
        producto_id,
        tipo,
        cantidad,
        descripcion
    )
    SELECT
        ctx.sucursal_id,
        ctx.usuario_id,
        co.ingrediente_id,
        NULL,
        'SALIDA',
        co.cantidad,
        'Consumo por venta de prueba'
    FROM consumos co
    CROSS JOIN contexto ctx
    JOIN factura f ON TRUE
    RETURNING sucursal_id, ingrediente_id, cantidad
)
UPDATE core.existencias_ingredientes ei
SET cantidad = ei.cantidad - m.cantidad
FROM movimientos m
WHERE ei.sucursal_id = m.sucursal_id
  AND ei.ingrediente_id = m.ingrediente_id;
