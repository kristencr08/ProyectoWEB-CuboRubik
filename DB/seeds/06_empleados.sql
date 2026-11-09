
-- ==========================================
-- 06 - EMPLEADOS DE PRUEBA
-- Restaurante Origenes SV
-- ==========================================

INSERT INTO core.empleados (
    sucursal_id,
    usuario_id,
    nombre,
    documento,
    telefono,
    correo,
    cargo,
    fecha_contratacion,
    salario_base
)
SELECT
    s.sucursal_id,
    u.usuario_id,
    e.nombre,
    e.documento,
    e.telefono,
    u.correo,
    e.cargo,
    DATE '2026-01-01',
    e.salario
FROM (
    VALUES
        (
            'admin@origenes.test',
            'Administrador Central',
            'EMP-001',
            '7000-2001',
            'Administrador',
            900.00::NUMERIC
        ),
        (
            'cajero@origenes.test',
            'Cajero Central',
            'EMP-002',
            '7000-2002',
            'Cajero',
            450.00::NUMERIC
        ),
        (
            'gerente@origenes.test',
            'Gerente Norte',
            'EMP-003',
            '7000-2003',
            'Gerente',
            800.00::NUMERIC
        ),
        (
            'cocinero@origenes.test',
            'Cocinero Norte',
            'EMP-004',
            '7000-2004',
            'Cocinero',
            450.00::NUMERIC
        )
) AS e(correo, nombre, documento, telefono, cargo, salario)
JOIN core.usuarios u
    ON u.correo = e.correo
JOIN core.sucursales s
    ON s.sucursal_id = u.sucursal_id
WHERE NOT EXISTS (
    SELECT 1
    FROM core.empleados existente
    WHERE existente.documento = e.documento
);
