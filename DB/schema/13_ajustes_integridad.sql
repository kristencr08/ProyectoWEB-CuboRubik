
-- ==========================================
-- 13 - AJUSTES DE INTEGRIDAD
-- Restaurante Origenes SV
-- ==========================================

-- Reforzar las condiciones de cierre de turnos
ALTER TABLE core.turnos_caja
    DROP CONSTRAINT IF EXISTS chk_montos_cierre;

ALTER TABLE core.turnos_caja
    ADD CONSTRAINT chk_montos_cierre CHECK (
        (
            fecha_cierre IS NULL
            AND usuario_cierre IS NULL
            AND monto_efectivo_esperado IS NULL
            AND monto_contado IS NULL
        )
        OR
        (
            fecha_cierre IS NOT NULL
            AND usuario_cierre IS NOT NULL
            AND monto_efectivo_esperado IS NOT NULL
            AND monto_contado IS NOT NULL
            AND monto_efectivo_esperado >= 0
            AND monto_contado >= 0
        )
    );
