
-- ==========================================
-- 07 - TURNOS DE CAJA DE PRUEBA
-- Restaurante Origenes SV
-- ==========================================

-- 1. TURNO DE SUCURSAL CENTRAL

INSERT INTO core.turnos_caja (
    caja_id,
    usuario_apertura,
    monto_inicial
)
SELECT
    c.caja_id,
    u.usuario_id,
    100.00
FROM core.cajas c
JOIN core.sucursales s
    ON s.sucursal_id = c.sucursal_id
JOIN core.usuarios u
    ON u.correo = 'cajero@origenes.test'
WHERE s.nombre = 'Sucursal Central'
  AND u.sucursal_id = s.sucursal_id
  AND NOT EXISTS (
      SELECT 1
      FROM core.turnos_caja t
      WHERE t.caja_id = c.caja_id
        AND t.fecha_cierre IS NULL
  );


-- 2. TURNO DE SUCURSAL NORTE

INSERT INTO core.turnos_caja (
    caja_id,
    usuario_apertura,
    monto_inicial
)
SELECT
    c.caja_id,
    u.usuario_id,
    100.00
FROM core.cajas c
JOIN core.sucursales s
    ON s.sucursal_id = c.sucursal_id
JOIN core.usuarios u
    ON u.correo = 'gerente@origenes.test'
WHERE s.nombre = 'Sucursal Norte'
  AND u.sucursal_id = s.sucursal_id
  AND NOT EXISTS (
      SELECT 1
      FROM core.turnos_caja t
      WHERE t.caja_id = c.caja_id
        AND t.fecha_cierre IS NULL
  );
