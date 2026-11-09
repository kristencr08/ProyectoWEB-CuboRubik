
-- ==========================================
-- 02 - PRODUCTOS E INGREDIENTES
-- Restaurante Origenes SV
-- ==========================================

-- 1. PRODUCTOS

INSERT INTO core.productos
    (categoria_id, codigo, nombre, descripcion, tipo_producto, precio_venta)
SELECT
    c.categoria_id,
    p.codigo,
    p.nombre,
    p.descripcion,
    p.tipo_producto,
    p.precio_venta
FROM (
    VALUES
    ('PUP-001', 'Pupusa de queso',
     'Pupusa elaborada con masa y queso',
     'ELABORADO', 1.00, 'Pupusas'),

    ('PUP-002', 'Pupusa de frijol con queso',
     'Pupusa elaborada con masa, frijoles y queso',
     'ELABORADO', 1.25, 'Pupusas'),

    ('BEB-001', 'Agua embotellada',
     'Agua en botella',
     'DIRECTO', 0.75, 'Bebidas'),

    ('BEB-002', 'Gaseosa',
     'Bebida gaseosa embotellada',
     'DIRECTO', 1.00, 'Bebidas')
) AS p(codigo, nombre, descripcion, tipo_producto, precio_venta, categoria)
JOIN core.categorias c
    ON c.nombre = p.categoria
ON CONFLICT (codigo) DO NOTHING;


-- 2. INGREDIENTES

INSERT INTO core.ingredientes
    (unidad_id, codigo, nombre, descripcion)
SELECT
    u.unidad_id,
    i.codigo,
    i.nombre,
    i.descripcion
FROM (
    VALUES
    ('ING-001', 'Masa de maiz',
     'Masa utilizada para preparar pupusas', 'kg'),

    ('ING-002', 'Queso',
     'Queso para relleno de pupusas', 'kg'),

    ('ING-003', 'Frijoles molidos',
     'Frijoles utilizados para rellenos', 'kg'),

    ('ING-004', 'Aceite',
     'Aceite utilizado en preparaciones', 'L')
) AS i(codigo, nombre, descripcion, unidad)
JOIN core.unidades_medida u
    ON u.abreviatura = i.unidad
ON CONFLICT (codigo) DO NOTHING;
