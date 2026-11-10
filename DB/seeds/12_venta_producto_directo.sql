
-- =====================================================
-- 12_venta_producto_directo.sql
-- Venta de prueba de un producto directo
-- Restaurante Orígenes SV
-- =====================================================

-- 1. CONTEXTO DE LA VENTA
WITH contexto AS (
    SELECT
        t.turno_id,
        t.usuario_apertura AS usuario_id,
        c.sucursal_id
    FROM core.turnos_caja t
    JOIN core.cajas c
        ON c.caja_id = t.caja_id
    JOIN core.sucursales s
        ON s.sucursal_id = c.sucursal_id
    JOIN core.usuarios u
        ON u.usuario_id = t.usuario_apertura
       AND u.sucursal_id = c.sucursal_id
    WHERE s.nombre = 'Sucursal Central'
      AND u.correo = 'cajero@origenes.test'
      AND t.fecha_cierre IS NULL
),

-- 2. PRODUCTO DIRECTO
producto AS (
    SELECT
        producto_id,
        precio_venta
    FROM core.productos
    WHERE codigo = 'BEB-001'
      AND tipo_producto = 'DIRECTO'
),

-- 3. MÉTODO DE PAGO
metodo_pago AS (
    SELECT metodo_pago_id
    FROM core.metodos_pago
    WHERE codigo = 'EFECTIVO'
),

-- 4. CALCULAR LOS IMPORTES
importes AS (
    SELECT
        p.producto_id,
        p.precio_venta AS subtotal,
        ROUND(p.precio_venta * 0.13, 2) AS iva,
        ROUND(p.precio_venta + ROUND(p.precio_venta * 0.13, 2), 2) AS total
    FROM producto p
),

-- 5. VALIDAR EXISTENCIAS
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

-- 6. CREAR LA VENTA
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
        i.subtotal,
        13.00,
        i.iva,
        i.total,
        'PAGADA'
    FROM contexto ctx
    CROSS JOIN importes i
    CROSS JOIN metodo_pago mp
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

-- 7. REGISTRAR DETALLE DE LA VENTA
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
        i.producto_id,
        1,
        i.subtotal,
        i.subtotal
    FROM venta_nueva vn
    CROSS JOIN importes i
    RETURNING venta_id
),

-- 8. REGISTRAR PAGO EN EFECTIVO
pago AS (
    INSERT INTO core.pagos (
        venta_id,
        metodo_pago_id,
        monto,
        referencia
    )
    SELECT
        d.venta_id,
        mp.metodo_pago_id,
        i.total,
        'PAGO-DIRECTO-PRUEBA-001'
    FROM detalle d
    CROSS JOIN metodo_pago mp
    CROSS JOIN importes i
    RETURNING venta_id
),

-- 9. EMITIR FACTURA
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
        i.subtotal,
        13.00,
        i.iva,
        i.total,
        'EMITIDA'
    FROM venta_nueva vn
    JOIN contexto ctx
        ON TRUE
    CROSS JOIN importes i
    JOIN pago p
        ON p.venta_id = vn.venta_id
    RETURNING venta_id
),

-- 10. REGISTRAR SALIDA DEL PRODUCTO
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
    JOIN factura f
        ON TRUE
    RETURNING sucursal_id, producto_id, cantidad
)

-- 11. ACTUALIZAR EXISTENCIAS
UPDATE core.existencias_productos ep
SET cantidad = ep.cantidad - m.cantidad
FROM movimientos m
WHERE ep.sucursal_id = m.sucursal_id
  AND ep.producto_id = m.producto_id;
