-- ============================================================
-- 18 - GESTIÓN DE TURNOS Y CIERRE AUTORIZADO DE CAJA
-- Restaurante Orígenes SV
-- ============================================================

-- ------------------------------------------------------------
-- 1. ASIGNACIÓN DEL CAJERO Y TIPO DE TURNO
-- ------------------------------------------------------------
ALTER TABLE core.turnos_caja
    ADD COLUMN IF NOT EXISTS cajero_id BIGINT,
    ADD COLUMN IF NOT EXISTS tipo_turno VARCHAR(20);

-- ------------------------------------------------------------
-- 2. ESTADO DEL TURNO
-- ------------------------------------------------------------
ALTER TABLE core.turnos_caja
    ADD COLUMN IF NOT EXISTS estado VARCHAR(25);

-- Los turnos antiguos se clasifican según su fecha de cierre.
UPDATE core.turnos_caja
SET estado = CASE
    WHEN fecha_cierre IS NULL THEN 'ABIERTO'
    ELSE 'CERRADO'
END
WHERE estado IS NULL;

ALTER TABLE core.turnos_caja
    ALTER COLUMN estado SET DEFAULT 'ABIERTO',
    ALTER COLUMN estado SET NOT NULL;

-- ------------------------------------------------------------
-- 3. SOLICITUD DE CIERRE
-- ------------------------------------------------------------
ALTER TABLE core.turnos_caja
    ADD COLUMN IF NOT EXISTS usuario_solicita_cierre BIGINT,
    ADD COLUMN IF NOT EXISTS fecha_solicitud_cierre TIMESTAMP;

-- ------------------------------------------------------------
-- 4. MONTOS DECLARADOS POR EL CAJERO
-- ------------------------------------------------------------
ALTER TABLE core.turnos_caja
    ADD COLUMN IF NOT EXISTS efectivo_contado NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS tarjeta_contada NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS bitcoin_contado NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS chivo_wallet_contado NUMERIC(12,2);

-- ------------------------------------------------------------
-- 5. MONTOS ESPERADOS DE PAGOS NO EFECTIVO
-- ------------------------------------------------------------
ALTER TABLE core.turnos_caja
    ADD COLUMN IF NOT EXISTS tarjeta_esperada NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS bitcoin_esperado NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS chivo_wallet_esperado NUMERIC(12,2);

-- ------------------------------------------------------------
-- 6. CLAVES FORÁNEAS
-- ------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_turno_cajero'
          AND conrelid = 'core.turnos_caja'::regclass
    ) THEN
        ALTER TABLE core.turnos_caja
            ADD CONSTRAINT fk_turno_cajero
            FOREIGN KEY (cajero_id)
            REFERENCES core.usuarios(usuario_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_turno_solicitante'
          AND conrelid = 'core.turnos_caja'::regclass
    ) THEN
        ALTER TABLE core.turnos_caja
            ADD CONSTRAINT fk_turno_solicitante
            FOREIGN KEY (usuario_solicita_cierre)
            REFERENCES core.usuarios(usuario_id);
    END IF;
END $$;

-- ------------------------------------------------------------
-- 7. RESTRICCIONES DE TIPO Y ESTADO
-- ------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_tipo_turno'
          AND conrelid = 'core.turnos_caja'::regclass
    ) THEN
        ALTER TABLE core.turnos_caja
            ADD CONSTRAINT chk_tipo_turno
            CHECK (
                tipo_turno IS NULL
                OR tipo_turno IN ('MATUTINO', 'VESPERTINO')
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_estado_turno'
          AND conrelid = 'core.turnos_caja'::regclass
    ) THEN
        ALTER TABLE core.turnos_caja
            ADD CONSTRAINT chk_estado_turno
            CHECK (
                estado IN (
                    'ABIERTO',
                    'PENDIENTE_CIERRE',
                    'CERRADO'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_conteos_turno'
          AND conrelid = 'core.turnos_caja'::regclass
    ) THEN
        ALTER TABLE core.turnos_caja
            ADD CONSTRAINT chk_conteos_turno
            CHECK (
                (efectivo_contado IS NULL OR efectivo_contado >= 0)
                AND (tarjeta_contada IS NULL OR tarjeta_contada >= 0)
                AND (bitcoin_contado IS NULL OR bitcoin_contado >= 0)
                AND (chivo_wallet_contado IS NULL OR chivo_wallet_contado >= 0)
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_esperados_no_efectivo'
          AND conrelid = 'core.turnos_caja'::regclass
    ) THEN
        ALTER TABLE core.turnos_caja
            ADD CONSTRAINT chk_esperados_no_efectivo
            CHECK (
                (tarjeta_esperada IS NULL OR tarjeta_esperada >= 0)
                AND (bitcoin_esperado IS NULL OR bitcoin_esperado >= 0)
                AND (chivo_wallet_esperado IS NULL OR chivo_wallet_esperado >= 0)
            );
    END IF;
END $$;

-- ------------------------------------------------------------
-- 8. CONSISTENCIA DEL ESTADO DEL TURNO
-- ------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_flujo_estado_turno'
          AND conrelid = 'core.turnos_caja'::regclass
    ) THEN
        ALTER TABLE core.turnos_caja
            ADD CONSTRAINT chk_flujo_estado_turno
            CHECK (
                (
                    estado = 'ABIERTO'
                    AND fecha_cierre IS NULL
                    AND fecha_solicitud_cierre IS NULL
                    AND usuario_solicita_cierre IS NULL
                )
                OR
                (
                    estado = 'PENDIENTE_CIERRE'
                    AND fecha_cierre IS NULL
                    AND fecha_solicitud_cierre IS NOT NULL
                    AND usuario_solicita_cierre IS NOT NULL
                    AND efectivo_contado IS NOT NULL
                    AND tarjeta_contada IS NOT NULL
                    AND bitcoin_contado IS NOT NULL
                    AND chivo_wallet_contado IS NOT NULL
                )
                OR
                (
                    estado = 'CERRADO'
                    AND fecha_cierre IS NOT NULL
                    AND usuario_cierre IS NOT NULL
                )
            );
    END IF;
END $$;

-- ------------------------------------------------------------
-- 9. ÍNDICE PARA CONSULTAR TURNOS POR CAJERO
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_turnos_cajero_estado
    ON core.turnos_caja(cajero_id, estado);
