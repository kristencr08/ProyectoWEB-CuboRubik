
-- ==========================================
-- 05 - USUARIOS DE PRUEBA
-- Restaurante Origenes SV
-- ==========================================

INSERT INTO core.usuarios (
    sucursal_id,
    rol_id,
    nombre,
    correo,
    password_hash
)
SELECT
    s.sucursal_id,
    r.rol_id,
    u.nombre,
    u.correo,
    '$2b$12$9tJ4t90uQ/ecvG09yFi/MuKaUeYyNLKgysGUcrB2CYxox8yr/BiH6'
FROM (
    VALUES
        (
            'Administrador Central',
            'admin@origenes.test',
            'ADMINISTRADOR',
            'Sucursal Central'
        ),
        (
            'Cajero Central',
            'cajero@origenes.test',
            'CAJERO',
            'Sucursal Central'
        ),
        (
            'Gerente Norte',
            'gerente@origenes.test',
            'GERENTE',
            'Sucursal Norte'
        ),
        (
            'Cocinero Norte',
            'cocinero@origenes.test',
            'COCINERO',
            'Sucursal Norte'
        )
) AS u(nombre, correo, rol, sucursal)
JOIN core.roles r
    ON r.nombre = u.rol
JOIN core.sucursales s
    ON s.nombre = u.sucursal
WHERE NOT EXISTS (
    SELECT 1
    FROM core.usuarios existente
    WHERE existente.correo = u.correo
);
