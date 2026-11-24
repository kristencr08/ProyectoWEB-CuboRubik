-- ==========================================
-- 13 - MENU COMPLETO, RECETAS, MINIMOS Y CXP
-- Restaurante Origenes SV
-- (idempotente: se puede ejecutar mas de una vez)
-- ==========================================

-- 1. NUEVOS INGREDIENTES
-- Se compran y se controlan en su unidad de compra (kg, L, und),
-- por eso 18 g de cafe se guardan como 0.018 kg.

INSERT INTO core.ingredientes
    (unidad_id, codigo, nombre, descripcion)
SELECT u.unidad_id, i.codigo, i.nombre, i.descripcion
FROM (
    VALUES
    ('ING-005', 'Cafe de especialidad', 'Cafe molido de especialidad', 'kg'),
    ('ING-006', 'Leche entera',          'Leche entera para bebidas',   'L'),
    ('ING-007', 'Vaso 12oz',             'Vaso desechable de 12 oz',    'und'),
    ('ING-008', 'Vaso 16oz',             'Vaso desechable de 16 oz',    'und'),
    ('ING-009', 'Tapadera',              'Tapadera para vaso',          'und'),
    ('ING-010', 'Vineta',                'Vineta adhesiva del pedido',  'und'),
    ('ING-011', 'Chocolate en polvo',    'Chocolate para bebida caliente', 'kg'),
    ('ING-012', 'Azucar',                'Azucar blanca',               'kg'),
    ('ING-013', 'Chicharron',            'Chicharron molido',           'kg'),
    ('ING-014', 'Loroco',                'Loroco para pupusas',         'kg'),
    ('ING-015', 'Yuca',                  'Yuca fresca',                 'kg'),
    ('ING-016', 'Curtido',               'Curtido salvadoreno',         'kg')
) AS i(codigo, nombre, descripcion, unidad)
JOIN core.unidades_medida u ON u.abreviatura = i.unidad
ON CONFLICT (codigo) DO NOTHING;


-- 2. PRODUCTOS ELABORADOS NUEVOS (con los 2 existentes suman 12)

INSERT INTO core.productos
    (categoria_id, codigo, nombre, descripcion, tipo_producto, precio_venta)
SELECT c.categoria_id, p.codigo, p.nombre, p.descripcion, 'ELABORADO', p.precio
FROM (
    VALUES
    ('PUP-003', 'Pupusa revuelta',            'Queso, chicharron y frijol',   1.25, 'Pupusas'),
    ('PUP-004', 'Pupusa de queso con loroco', 'Queso con loroco',             1.25, 'Pupusas'),
    ('PUP-005', 'Pupusa de chicharron',       'Chicharron con queso',         1.25, 'Pupusas'),
    ('CAF-001', 'Espresso',                   'Espresso sencillo',            1.50, 'Bebidas'),
    ('CAF-002', 'Cafe americano 12oz',        'Americano en vaso de 12 oz',   1.75, 'Bebidas'),
    ('CAF-003', 'Latte chico 12oz',           'Latte en vaso de 12 oz',       2.75, 'Bebidas'),
    ('CAF-004', 'Latte grande 16oz',          'Latte en vaso de 16 oz',       3.50, 'Bebidas'),
    ('CAF-005', 'Capuchino 12oz',             'Capuchino en vaso de 12 oz',   3.00, 'Bebidas'),
    ('CAF-006', 'Chocolate caliente 12oz',    'Chocolate caliente con leche', 2.50, 'Bebidas'),
    ('COM-001', 'Yuca frita con chicharron',  'Yuca frita con curtido',       3.00, 'Complementos')
) AS p(codigo, nombre, descripcion, precio, categoria)
JOIN core.categorias c ON c.nombre = p.categoria
ON CONFLICT (codigo) DO NOTHING;


-- 3. RECETAS (cabecera)

INSERT INTO core.recetas
    (producto_id, nombre, descripcion, cantidad_producida, instrucciones)
SELECT
    p.producto_id,
    'Receta ' || p.nombre,
    'Receta estandar de ' || p.nombre,
    1,
    'Preparar segun el estandar de la casa.'
FROM core.productos p
WHERE p.tipo_producto = 'ELABORADO'
  AND p.codigo IN (
      'PUP-003','PUP-004','PUP-005',
      'CAF-001','CAF-002','CAF-003','CAF-004','CAF-005','CAF-006',
      'COM-001'
  )
ON CONFLICT (producto_id) DO NOTHING;


-- 4. RECETAS (detalle). Cantidades en la unidad del ingrediente.
-- Latte grande 16oz = 0.018 kg cafe (18 g) + 0.250 L leche (250 ml)
--                     + 1 vaso 16oz + 1 tapadera + 1 vineta

INSERT INTO core.detalle_recetas (receta_id, ingrediente_id, cantidad)
SELECT r.receta_id, i.ingrediente_id, v.cantidad
FROM (
    VALUES
    ('PUP-003','ING-001',0.100::NUMERIC), ('PUP-003','ING-002',0.030),
    ('PUP-003','ING-013',0.030),          ('PUP-003','ING-003',0.020),
    ('PUP-003','ING-004',0.005),

    ('PUP-004','ING-001',0.100), ('PUP-004','ING-002',0.040),
    ('PUP-004','ING-014',0.015), ('PUP-004','ING-004',0.005),

    ('PUP-005','ING-001',0.100), ('PUP-005','ING-013',0.050),
    ('PUP-005','ING-004',0.005),

    ('CAF-001','ING-005',0.009), ('CAF-001','ING-007',1),
    ('CAF-001','ING-009',1),     ('CAF-001','ING-010',1),

    ('CAF-002','ING-005',0.012), ('CAF-002','ING-007',1),
    ('CAF-002','ING-009',1),     ('CAF-002','ING-010',1),

    ('CAF-003','ING-005',0.014), ('CAF-003','ING-006',0.200),
    ('CAF-003','ING-007',1),     ('CAF-003','ING-009',1),
    ('CAF-003','ING-010',1),

    ('CAF-004','ING-005',0.018), ('CAF-004','ING-006',0.250),
    ('CAF-004','ING-008',1),     ('CAF-004','ING-009',1),
    ('CAF-004','ING-010',1),

    ('CAF-005','ING-005',0.014), ('CAF-005','ING-006',0.150),
    ('CAF-005','ING-007',1),     ('CAF-005','ING-009',1),
    ('CAF-005','ING-010',1),

    ('CAF-006','ING-011',0.025), ('CAF-006','ING-006',0.250),
    ('CAF-006','ING-012',0.010), ('CAF-006','ING-007',1),
    ('CAF-006','ING-009',1),     ('CAF-006','ING-010',1),

    ('COM-001','ING-015',0.250), ('COM-001','ING-013',0.100),
    ('COM-001','ING-004',0.050), ('COM-001','ING-016',0.050)
) AS v(producto_codigo, ingrediente_codigo, cantidad)
JOIN core.productos p ON p.codigo = v.producto_codigo
JOIN core.recetas r ON r.producto_id = p.producto_id
JOIN core.ingredientes i ON i.codigo = v.ingrediente_codigo
ON CONFLICT (receta_id, ingrediente_id) DO NOTHING;


-- 5. ULTIMO COSTO DE LOS INGREDIENTES (solo si aun esta en 0)

UPDATE core.ingredientes i
SET ultimo_costo = c.costo
FROM (
    VALUES
    ('ING-001', 1.50), ('ING-002', 4.00), ('ING-003', 2.20),
    ('ING-004', 3.00), ('ING-005', 18.00), ('ING-006', 1.10),
    ('ING-007', 0.07), ('ING-008', 0.09), ('ING-009', 0.04),
    ('ING-010', 0.02), ('ING-011', 8.00), ('ING-012', 1.20),
    ('ING-013', 6.00), ('ING-014', 5.00), ('ING-015', 0.80),
    ('ING-016', 2.50)
) AS c(codigo, costo)
WHERE i.codigo = c.codigo
  AND i.ultimo_costo = 0;


-- 6. EXISTENCIAS INICIALES DE LOS INGREDIENTES NUEVOS
-- Solo se insertan si la fila no existia (asi se puede repetir el seed)

WITH datos AS (
    SELECT
        s.sucursal_id,
        i.ingrediente_id,
        v.cantidad::NUMERIC(14,3) AS cantidad,
        v.minimo::NUMERIC(14,3) AS minimo
    FROM core.sucursales s
    CROSS JOIN (
        VALUES
        ('ING-005', 5.000, 1.000),   ('ING-006', 30.000, 8.000),
        ('ING-007', 200, 50),        ('ING-008', 200, 50),
        ('ING-009', 400, 100),       ('ING-010', 400, 100),
        ('ING-011', 3.000, 0.500),   ('ING-012', 5.000, 1.000),
        ('ING-013', 5.000, 1.000),   ('ING-014', 2.000, 0.500),
        ('ING-015', 8.000, 2.000),   ('ING-016', 3.000, 0.500)
    ) AS v(codigo, cantidad, minimo)
    JOIN core.ingredientes i ON i.codigo = v.codigo
    WHERE s.nombre IN ('Sucursal Central', 'Sucursal Norte')
),
nuevas AS (
    INSERT INTO core.existencias_ingredientes
        (sucursal_id, ingrediente_id, cantidad, stock_minimo)
    SELECT sucursal_id, ingrediente_id, cantidad, minimo
    FROM datos
    ON CONFLICT (sucursal_id, ingrediente_id) DO NOTHING
    RETURNING sucursal_id, ingrediente_id, cantidad
)
INSERT INTO core.movimientos_inventario
    (sucursal_id, usuario_id, ingrediente_id, tipo, cantidad, descripcion)
SELECT
    n.sucursal_id,
    (SELECT usuario_id FROM core.usuarios
     WHERE correo = 'admin@origenes.test'),
    n.ingrediente_id,
    'ENTRADA',
    n.cantidad,
    'Carga inicial de prueba - menu ampliado'
FROM nuevas n
WHERE n.cantidad > 0;


-- 7. STOCK MINIMO DE LOS ARTICULOS YA EXISTENTES (solo si esta en 0)

UPDATE core.existencias_ingredientes e
SET stock_minimo = m.minimo
FROM (
    VALUES
    ('ING-001', 4.000), ('ING-002', 2.000),
    ('ING-003', 2.000), ('ING-004', 1.000)
) AS m(codigo, minimo)
JOIN core.ingredientes i ON i.codigo = m.codigo
WHERE e.ingrediente_id = i.ingrediente_id
  AND e.stock_minimo = 0;

UPDATE core.existencias_productos e
SET stock_minimo = 15
FROM core.productos p
WHERE e.producto_id = p.producto_id
  AND p.codigo IN ('BEB-001', 'BEB-002')
  AND e.stock_minimo = 0;


-- 8. CUENTAS POR PAGAR DE COMPRAS YA RECIBIDAS
-- (la compra COMP-PRUEBA-001 se recibio en el seed 10,
-- antes de que existiera la tabla de cuentas por pagar)

INSERT INTO core.cuentas_por_pagar (
    compra_id, proveedor_id, sucursal_id,
    monto_total, saldo,
    fecha_emision, fecha_vencimiento, estado
)
SELECT
    c.compra_id, c.proveedor_id, c.sucursal_id,
    c.total, c.total,
    c.fecha_compra::DATE,
    c.fecha_compra::DATE + c.dias_credito,
    CASE WHEN c.total = 0 THEN 'PAGADA' ELSE 'PENDIENTE' END
FROM core.compras c
WHERE c.estado = 'RECIBIDA'
  AND NOT EXISTS (
      SELECT 1 FROM core.cuentas_por_pagar x
      WHERE x.compra_id = c.compra_id
  );
