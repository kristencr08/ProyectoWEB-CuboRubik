
-- ==========================================
-- 01 - DATOS BASE DE PRUEBA
-- Restaurante Origenes SV
-- ==========================================

-- 1. SUCURSALES
INSERT INTO core.sucursales
    (nombre, direccion, telefono)
SELECT
    'Sucursal Central',
    'Direccion de prueba - San Salvador',
    '2222-1000'
WHERE NOT EXISTS (
    SELECT 1 FROM core.sucursales
    WHERE nombre = 'Sucursal Central'
);

INSERT INTO core.sucursales
    (nombre, direccion, telefono)
SELECT
    'Sucursal Norte',
    'Direccion de prueba - Zona Norte',
    '2222-2000'
WHERE NOT EXISTS (
    SELECT 1 FROM core.sucursales
    WHERE nombre = 'Sucursal Norte'
);

-- 2. ROLES
INSERT INTO core.roles (nombre, descripcion)
VALUES
    ('ADMINISTRADOR', 'Acceso administrativo al sistema'),
    ('CAJERO', 'Gestion de ventas y caja'),
    ('COCINERO', 'Preparacion de productos'),
    ('GERENTE', 'Supervision de sucursal')
ON CONFLICT (nombre) DO NOTHING;

-- 3. CATEGORIAS
INSERT INTO core.categorias (nombre, descripcion)
VALUES
    ('Pupusas', 'Pupusas de diferentes especialidades'),
    ('Bebidas', 'Bebidas frias y calientes'),
    ('Postres', 'Postres y dulces'),
    ('Complementos', 'Productos adicionales')
ON CONFLICT (nombre) DO NOTHING;

-- 4. UNIDADES DE MEDIDA
INSERT INTO core.unidades_medida (nombre, abreviatura)
VALUES
    ('Gramo', 'g'),
    ('Kilogramo', 'kg'),
    ('Mililitro', 'ml'),
    ('Litro', 'L'),
    ('Unidad', 'und')
ON CONFLICT DO NOTHING;

-- 5. METODOS DE PAGO
INSERT INTO core.metodos_pago (codigo, nombre)
VALUES
    ('EFECTIVO', 'Efectivo'),
    ('TARJETA', 'Tarjeta'),
    ('BITCOIN', 'Bitcoin'),
    ('CHIVO_WALLET', 'Chivo Wallet')
ON CONFLICT DO NOTHING;

-- 6. CLIENTES
INSERT INTO core.clientes
    (nombre, documento, telefono, correo)
VALUES
    ('Carlos Martinez', 'DOC-PRUEBA-001', '7000-1001', 'carlos@example.com'),
    ('Maria Lopez', 'DOC-PRUEBA-002', '7000-1002', 'maria@example.com'),
    ('Ana Hernandez', 'DOC-PRUEBA-003', '7000-1003', 'ana@example.com')
ON CONFLICT (documento) DO NOTHING;

-- 7. PROVEEDORES
INSERT INTO core.proveedores
    (nombre, documento, telefono, correo, direccion)
SELECT
    'Distribuidora de Alimentos SV',
    'PROV-PRUEBA-001',
    '2200-1001',
    'distribuidora@example.com',
    'Direccion ficticia de prueba'
WHERE NOT EXISTS (
    SELECT 1 FROM core.proveedores
    WHERE documento = 'PROV-PRUEBA-001'
);

INSERT INTO core.proveedores
    (nombre, documento, telefono, correo, direccion)
SELECT
    'Bebidas y Suministros SV',
    'PROV-PRUEBA-002',
    '2200-1002',
    'bebidas@example.com',
    'Direccion ficticia de prueba'
WHERE NOT EXISTS (
    SELECT 1 FROM core.proveedores
    WHERE documento = 'PROV-PRUEBA-002'
);
