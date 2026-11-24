
-- =====================================================
-- 11_venta_prueba.sql
-- Venta de prueba de dos pupusas de queso
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

-- 2. PRODUCTO QUE SE VA A VENDER
producto AS (
    SELECT producto_id
    FROM core.productos
    WHERE codigo = 'PUP-001'
      AND tipo_producto = 'ELABORADO'
),

-- 3. MÉTODO DE PAGO
metodo_pago AS (
    SELECT metodo_pago_id
    FROM core.metodos_pago
    WHERE codigo = 'EFECTIVO'
),

-- 4. CALCULAR CONSUMO DE INGREDIENTES
consumos AS (
    SELECT
        dr.ingrediente_id,
        SUM(dr.cantidad * 2) AS cantidad
    FROM core.recetas r
    JOIN core.detalle_recetas dr
        ON dr.receta_id = r.receta_id
    JOIN producto p
        ON p.producto_id = r.producto_id
    GROUP BY dr.ingrediente_id
),

-- 5. VALIDAR EXISTENCIAS Y RECETA
stock_disponible AS (
    SELECT
        EXISTS (
            SELECT 1
            FROM consumos
        )
        AND NOT EXISTS (
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
        2.00,
        13.00,
        0.26,
        2.26,
        'PAGADA'
    FROM contexto ctx
    CROSS JOIN producto p
    CROSS JOIN metodo_pago mp
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
        p.producto_id,
        2,
        1.00,
        2.00
    FROM venta_nueva vn
    CROSS JOIN producto p
    RETURNING venta_id
),

-- 8. REGISTRAR EL PAGO EN EFECTIVO
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
        2.26,
        'PAGO-PRUEBA-001'
    FROM detalle d
    CROSS JOIN metodo_pago mp
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
    JOIN contexto ctx
        ON TRUE
    JOIN pago p
        ON p.venta_id = vn.venta_id
    RETURNING venta_id
),

-- 10. REGISTRAR SALIDA DE INGREDIENTES
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
    JOIN factura f
        ON TRUE
    RETURNING sucursal_id, ingrediente_id, cantidad
)

-- 11. ACTUALIZAR EXISTENCIAS
UPDATE core.existencias_ingredientes ei
SET cantidad = ei.cantidad - m.cantidad
FROM movimientos m
WHERE ei.sucursal_id = m.sucursal_id
  AND ei.ingrediente_id = m.ingrediente_id;
