
-- =====================================================
-- 12_venta_producto_directo.sql
-- Venta de prueba de un producto directo
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
producto AS (
    SELECT producto_id, precio_venta
    FROM core.productos
    WHERE codigo = 'BEB-001'
      AND tipo_producto = 'DIRECTO'
),
stock_disponible AS (
    SELECT EXISTS (
        SELECT 1
        FROM core.existencias_productos ep
        CROSS JOIN contexto ctx
        JOIN producto p
            ON p.producto_id = ep.producto_id
        WHERE ep.sucursal_id = ctx.sucursal_id
          AND ep.cantidad >= 1
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
        0.75,
        13.00,
        0.10,
        0.85,
        'PAGADA'
    FROM contexto ctx
    CROSS JOIN stock_disponible sd
    WHERE sd.disponible
      AND NOT EXISTS (
          SELECT 1
          FROM core.facturas
          WHERE serie = 'CF-DIRECTO-PRUEBA'
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
        vn.venta_id,
        p.producto_id,
        1,
        p.precio_venta,
        0.75
    FROM venta_nueva vn
    CROSS JOIN producto p
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
        0.85,
        'PAGO-DIRECTO-PRUEBA-001'
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
        'CF-DIRECTO-PRUEBA',
        1,
        'Consumidor final',
        NULL,
        0.75,
        13.00,
        0.10,
        0.85,
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
        NULL,
        p.producto_id,
        'SALIDA',
        1,
        'Consumo por venta directa de prueba'
    FROM contexto ctx
    CROSS JOIN producto p
    JOIN factura f ON TRUE
    RETURNING sucursal_id, producto_id, cantidad
)
UPDATE core.existencias_productos ep
SET cantidad = ep.cantidad - m.cantidad
FROM movimientos m
WHERE ep.sucursal_id = m.sucursal_id
  AND ep.producto_id = m.producto_id;