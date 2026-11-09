
-- ==========================================
-- 04 - CAJAS DE PRUEBA
-- Restaurante Origenes SV
-- ==========================================

INSERT INTO core.cajas (
    sucursal_id,
    nombre
)
SELECT
    sucursal_id,
    'Caja principal'
FROM core.sucursales
WHERE nombre IN (
    'Sucursal Central',
    'Sucursal Norte'
)
ON CONFLICT (sucursal_id) DO NOTHING;
