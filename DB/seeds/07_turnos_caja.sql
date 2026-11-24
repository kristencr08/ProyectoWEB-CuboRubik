-- ==========================================
-- 07 - TURNO DE CAJA DE PRUEBA
-- Restaurante Origenes SV
-- ==========================================

-- Solo se crea un turno si la sucursal tiene un cajero asignable.
INSERT INTO core.turnos_caja (
    caja_id,
    usuario_apertura,
    cajero_id,
    tipo_turno,
    monto_inicial
)
SELECT
    c.caja_id,
    apertura.usuario_id,
    cajero.usuario_id,
    'MATUTINO',
    100.00
FROM core.cajas c
JOIN core.sucursales s
    ON s.sucursal_id = c.sucursal_id
JOIN core.usuarios apertura
    ON apertura.correo = 'admin@origenes.test'
   AND apertura.sucursal_id = s.sucursal_id
JOIN core.usuarios cajero
    ON cajero.correo = 'cajero@origenes.test'
   AND cajero.sucursal_id = s.sucursal_id
WHERE s.nombre = 'Sucursal Central'
  AND NOT EXISTS (
      SELECT 1
      FROM core.turnos_caja t
      WHERE t.caja_id = c.caja_id
        AND t.fecha_cierre IS NULL
  );
