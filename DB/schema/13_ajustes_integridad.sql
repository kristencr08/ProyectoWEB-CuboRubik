-- ==========================================
-- 13 - AJUSTES DE INTEGRIDAD
-- Restaurante Origenes SV
-- ==========================================


-- ==========================================
-- 1. REFORZAR LAS CONDICIONES DE CIERRE
-- DE TURNOS DE CAJA
-- ==========================================

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


-- ==========================================
-- 2. RESTRICCIÓN DE UNICIDAD EN COMPRAS
-- ==========================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_compra_proveedor_documento'
          AND conrelid = 'core.compras'::regclass
    ) THEN

        ALTER TABLE core.compras
        ADD CONSTRAINT uq_compra_proveedor_documento
        UNIQUE (proveedor_id, numero_documento);

    END IF;
END $$;