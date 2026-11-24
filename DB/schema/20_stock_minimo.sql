
-- =====================================================
-- 20 - STOCK MINIMO POR SUCURSAL
-- Restaurante Origenes SV
-- =====================================================

-- -----------------------------------------------------
-- 1. STOCK MINIMO DE INGREDIENTES
-- -----------------------------------------------------

ALTER TABLE core.existencias_ingredientes
ADD COLUMN IF NOT EXISTS stock_minimo NUMERIC(14,3)
NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_stock_minimo_ingrediente'
          AND conrelid = 'core.existencias_ingredientes'::regclass
    ) THEN
        ALTER TABLE core.existencias_ingredientes
        ADD CONSTRAINT chk_stock_minimo_ingrediente
        CHECK (stock_minimo >= 0);
    END IF;
END $$;


-- -----------------------------------------------------
-- 2. STOCK MINIMO DE PRODUCTOS
-- -----------------------------------------------------

ALTER TABLE core.existencias_productos
ADD COLUMN IF NOT EXISTS stock_minimo NUMERIC(14,3)
NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_stock_minimo_producto'
          AND conrelid = 'core.existencias_productos'::regclass
    ) THEN
        ALTER TABLE core.existencias_productos
        ADD CONSTRAINT chk_stock_minimo_producto
        CHECK (stock_minimo >= 0);
    END IF;
END $$;
