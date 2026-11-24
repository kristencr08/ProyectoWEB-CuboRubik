
-- ==========================================
-- 03 - RECETAS DE PRUEBA
-- Restaurante Origenes SV
-- ==========================================

-- 1. RECETA: PUPUSA DE QUESO

INSERT INTO core.recetas (
    producto_id,
    nombre,
    descripcion,
    cantidad_producida,
    instrucciones
)
SELECT
    producto_id,
    'Receta pupusa de queso',
    'Preparacion de pupusa rellena de queso',
    1,
    'Preparar la masa, agregar queso y cocinar.'
FROM core.productos
WHERE codigo = 'PUP-001'
  AND tipo_producto = 'ELABORADO'
ON CONFLICT (producto_id) DO NOTHING;


-- 2. RECETA: PUPUSA DE FRIJOL CON QUESO

INSERT INTO core.recetas (
    producto_id,
    nombre,
    descripcion,
    cantidad_producida,
    instrucciones
)
SELECT
    producto_id,
    'Receta pupusa de frijol con queso',
    'Preparacion de pupusa rellena de frijol y queso',
    1,
    'Preparar la masa, agregar el relleno y cocinar.'
FROM core.productos
WHERE codigo = 'PUP-002'
  AND tipo_producto = 'ELABORADO'
ON CONFLICT (producto_id) DO NOTHING;


-- 3. INGREDIENTES DE LA PUPUSA DE QUESO

INSERT INTO core.detalle_recetas (
    receta_id,
    ingrediente_id,
    cantidad
)
SELECT
    r.receta_id,
    i.ingrediente_id,
    v.cantidad
FROM (
    VALUES
        ('PUP-001', 'ING-001', 0.100::NUMERIC),
        ('PUP-001', 'ING-002', 0.040::NUMERIC),
        ('PUP-001', 'ING-004', 0.005::NUMERIC)
) AS v(producto_codigo, ingrediente_codigo, cantidad)
JOIN core.productos p
    ON p.codigo = v.producto_codigo
JOIN core.recetas r
    ON r.producto_id = p.producto_id
JOIN core.ingredientes i
    ON i.codigo = v.ingrediente_codigo
ON CONFLICT (receta_id, ingrediente_id) DO NOTHING;


-- 4. INGREDIENTES DE LA PUPUSA DE FRIJOL CON QUESO

INSERT INTO core.detalle_recetas (
    receta_id,
    ingrediente_id,
    cantidad
)
SELECT
    r.receta_id,
    i.ingrediente_id,
    v.cantidad
FROM (
    VALUES
        ('PUP-002', 'ING-001', 0.100::NUMERIC),
        ('PUP-002', 'ING-002', 0.030::NUMERIC),
        ('PUP-002', 'ING-003', 0.030::NUMERIC),
        ('PUP-002', 'ING-004', 0.005::NUMERIC)
) AS v(producto_codigo, ingrediente_codigo, cantidad)
JOIN core.productos p
    ON p.codigo = v.producto_codigo
JOIN core.recetas r
    ON r.producto_id = p.producto_id
JOIN core.ingredientes i
    ON i.codigo = v.ingrediente_codigo
ON CONFLICT (receta_id, ingrediente_id) DO NOTHING;
