
BEGIN;

-- =====================================================
-- 1. RELACIONAR MOVIMIENTOS DE CAJA CON LOS PAGOS
-- =====================================================

ALTER TABLE core.movimientos_caja
ADD COLUMN IF NOT EXISTS pago_id BIGINT;

-- =====================================================
-- 2. EVITAR MOVIMIENTOS DUPLICADOS
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_movimientos_caja_pago'
          AND conrelid = 'core.movimientos_caja'::regclass
    ) THEN
        ALTER TABLE core.movimientos_caja
        ADD CONSTRAINT uq_movimientos_caja_pago
        UNIQUE (pago_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_movimientos_caja_pago'
          AND conrelid = 'core.movimientos_caja'::regclass
    ) THEN
        ALTER TABLE core.movimientos_caja
        ADD CONSTRAINT fk_movimientos_caja_pago
        FOREIGN KEY (pago_id)
        REFERENCES core.pagos(pago_id);
    END IF;
END $$;

-- =====================================================
-- 3. FUNCIÓN PARA REGISTRAR INGRESOS EN EFECTIVO
-- =====================================================

CREATE OR REPLACE FUNCTION core.registrar_ingreso_efectivo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_turno_id BIGINT;
    v_usuario_id BIGINT;
    v_codigo VARCHAR(30);
BEGIN
    SELECT codigo
    INTO v_codigo
    FROM core.metodos_pago
    WHERE metodo_pago_id = NEW.metodo_pago_id;

    -- Solo los pagos en efectivo generan ingresos.
    IF v_codigo = 'EFECTIVO' THEN

        SELECT turno_id, usuario_id
        INTO v_turno_id, v_usuario_id
        FROM core.ventas
        WHERE venta_id = NEW.venta_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION
                'No se encontró la venta asociada al pago %',
                NEW.pago_id;
        END IF;

        INSERT INTO core.movimientos_caja (
            turno_id,
            usuario_id,
            tipo,
            monto,
            descripcion,
            pago_id
        )
        VALUES (
            v_turno_id,
            v_usuario_id,
            'INGRESO',
            NEW.monto,
            'Ingreso por pago en efectivo #' || NEW.pago_id,
            NEW.pago_id
        )
        ON CONFLICT (pago_id) DO NOTHING;

    END IF;

    RETURN NEW;
END;
$$;

-- =====================================================
-- 4. CREAR TRIGGER AUTOMÁTICO
-- =====================================================

DROP TRIGGER IF EXISTS trg_registrar_ingreso_efectivo
ON core.pagos;

CREATE TRIGGER trg_registrar_ingreso_efectivo
AFTER INSERT ON core.pagos
FOR EACH ROW
EXECUTE FUNCTION core.registrar_ingreso_efectivo();

-- =====================================================
-- 5. RECUPERAR PAGOS EN EFECTIVO ANTERIORES
-- =====================================================

INSERT INTO core.movimientos_caja (
    turno_id,
    usuario_id,
    tipo,
    monto,
    descripcion,
    pago_id
)
SELECT
    v.turno_id,
    v.usuario_id,
    'INGRESO',
    p.monto,
    'Ingreso por pago en efectivo #' || p.pago_id,
    p.pago_id
FROM core.pagos p
JOIN core.ventas v
    ON v.venta_id = p.venta_id
JOIN core.metodos_pago mp
    ON mp.metodo_pago_id = p.metodo_pago_id
WHERE mp.codigo = 'EFECTIVO'
ON CONFLICT (pago_id) DO NOTHING;

COMMIT;
