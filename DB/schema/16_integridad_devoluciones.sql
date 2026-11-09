
-- =====================================================
-- ARCHIVO 16: INTEGRIDAD DE DEVOLUCIONES
-- Restaurante Orígenes SV
-- =====================================================

-- Agregar referencia al pago de devolución
ALTER TABLE core.movimientos_caja
ADD COLUMN IF NOT EXISTS devolucion_pago_id BIGINT;

-- Relacionar el movimiento con el pago de devolución
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_movimiento_devolucion_pago'
          AND conrelid = 'core.movimientos_caja'::regclass
    ) THEN
        ALTER TABLE core.movimientos_caja
        ADD CONSTRAINT fk_movimiento_devolucion_pago
        FOREIGN KEY (devolucion_pago_id)
        REFERENCES core.devoluciones_pagos(devolucion_pago_id);
    END IF;
END $$;

-- Evitar movimientos duplicados para un mismo reembolso
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_movimiento_devolucion_pago'
          AND conrelid = 'core.movimientos_caja'::regclass
    ) THEN
        ALTER TABLE core.movimientos_caja
        ADD CONSTRAINT uq_movimiento_devolucion_pago
        UNIQUE (devolucion_pago_id);
    END IF;
END $$;

-- Evitar referencias simultáneas a pagos originales
-- y pagos de devolución
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_referencia_movimiento_caja'
          AND conrelid = 'core.movimientos_caja'::regclass
    ) THEN
        ALTER TABLE core.movimientos_caja
        ADD CONSTRAINT chk_referencia_movimiento_caja
        CHECK (
            pago_id IS NULL
            OR devolucion_pago_id IS NULL
        );
    END IF;
END $$;
