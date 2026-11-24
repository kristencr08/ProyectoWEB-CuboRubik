
-- ==========================================
-- 08 - EXISTENCIAS INICIALES
-- Restaurante Origenes SV
-- ==========================================

-- 1. CREAR EXISTENCIAS DE INGREDIENTES

INSERT INTO core.existencias_ingredientes (
    sucursal_id,
    ingrediente_id,
    cantidad
)
SELECT
    s.sucursal_id,
    i.ingrediente_id,
    0
FROM core.sucursales s
CROSS JOIN core.ingredientes i
WHERE s.nombre IN ('Sucursal Central', 'Sucursal Norte')
ON CONFLICT (sucursal_id, ingrediente_id) DO NOTHING;


-- 2. CREAR EXISTENCIAS DE PRODUCTOS DIRECTOS

INSERT INTO core.existencias_productos (
    sucursal_id,
    producto_id,
    cantidad
)
SELECT
    s.sucursal_id,
    p.producto_id,
    0
FROM core.sucursales s
CROSS JOIN core.productos p
WHERE s.nombre IN ('Sucursal Central', 'Sucursal Norte')
  AND p.tipo_producto = 'DIRECTO'
ON CONFLICT (sucursal_id, producto_id) DO NOTHING;


-- 3. REGISTRAR ENTRADAS DE INGREDIENTES

WITH datos AS (
    SELECT
        s.sucursal_id,
        i.ingrediente_id,
        CASE i.codigo
            WHEN 'ING-001' THEN 20.000
            WHEN 'ING-002' THEN 10.000
            WHEN 'ING-003' THEN 8.000
            WHEN 'ING-004' THEN 5.000
        END::NUMERIC(14,3) AS cantidad,
        u.usuario_id,
        s.nombre AS sucursal
    FROM core.sucursales s
    CROSS JOIN core.ingredientes i
    JOIN core.usuarios u
        ON u.correo = CASE s.nombre
            WHEN 'Sucursal Central' THEN 'cajero@origenes.test'
            WHEN 'Sucursal Norte' THEN 'gerente@origenes.test'
        END
        AND u.sucursal_id = s.sucursal_id
    WHERE s.nombre IN ('Sucursal Central', 'Sucursal Norte')
      AND i.codigo IN ('ING-001', 'ING-002', 'ING-003', 'ING-004')
),
nuevos AS (
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
        d.sucursal_id,
        d.usuario_id,
        d.ingrediente_id,
        NULL,
        'ENTRADA',
        d.cantidad,
        'Carga inicial de prueba - ' || d.sucursal
    FROM datos d
    WHERE NOT EXISTS (
        SELECT 1
        FROM core.movimientos_inventario m
        WHERE m.sucursal_id = d.sucursal_id
          AND m.ingrediente_id = d.ingrediente_id
          AND m.producto_id IS NULL
          AND m.tipo = 'ENTRADA'
          AND m.descripcion = 'Carga inicial de prueba - ' || d.sucursal
    )
    RETURNING sucursal_id, ingrediente_id, cantidad
)
UPDATE core.existencias_ingredientes e
SET cantidad = e.cantidad + n.total,
    fecha_actualizacion = CURRENT_TIMESTAMP
FROM (
    SELECT
        sucursal_id,
        ingrediente_id,
        SUM(cantidad) AS total
    FROM nuevos
    GROUP BY sucursal_id, ingrediente_id
) n
WHERE e.sucursal_id = n.sucursal_id
  AND e.ingrediente_id = n.ingrediente_id;


-- 4. REGISTRAR ENTRADAS DE PRODUCTOS DIRECTOS

WITH datos AS (
    SELECT
        s.sucursal_id,
        p.producto_id,
        CASE p.codigo
            WHEN 'BEB-001' THEN 50.000
            WHEN 'BEB-002' THEN 40.000
        END::NUMERIC(14,3) AS cantidad,
        u.usuario_id,
        s.nombre AS sucursal
    FROM core.sucursales s
    CROSS JOIN core.productos p
    JOIN core.usuarios u
        ON u.correo = CASE s.nombre
            WHEN 'Sucursal Central' THEN 'cajero@origenes.test'
            WHEN 'Sucursal Norte' THEN 'gerente@origenes.test'
        END
        AND u.sucursal_id = s.sucursal_id
    WHERE s.nombre IN ('Sucursal Central', 'Sucursal Norte')
      AND p.codigo IN ('BEB-001', 'BEB-002')
      AND p.tipo_producto = 'DIRECTO'
),
nuevos AS (
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
        d.sucursal_id,
        d.usuario_id,
        NULL,
        d.producto_id,
        'ENTRADA',
        d.cantidad,
        'Carga inicial de prueba - ' || d.sucursal
    FROM datos d
    WHERE NOT EXISTS (
        SELECT 1
        FROM core.movimientos_inventario m
        WHERE m.sucursal_id = d.sucursal_id
          AND m.producto_id = d.producto_id
          AND m.ingrediente_id IS NULL
          AND m.tipo = 'ENTRADA'
          AND m.descripcion = 'Carga inicial de prueba - ' || d.sucursal
    )
    RETURNING sucursal_id, producto_id, cantidad
)
UPDATE core.existencias_productos e
SET cantidad = e.cantidad + n.total,
    fecha_actualizacion = CURRENT_TIMESTAMP
FROM (
    SELECT
        sucursal_id,
        producto_id,
        SUM(cantidad) AS total
    FROM nuevos
    GROUP BY sucursal_id, producto_id
) n
WHERE e.sucursal_id = n.sucursal_id
  AND e.producto_id = n.producto_id;
