
-- =========================================================
-- 19 - MEJORAS DE NOMINA
-- =========================================================

-- =========================================================
-- 1. ASOCIAR PLANILLAS CON SUCURSALES
-- =========================================================

ALTER TABLE core.planillas
ADD COLUMN IF NOT EXISTS sucursal_id BIGINT;

-- Las planillas actuales están vacías.
-- Por eso podemos exigir sucursal obligatoria.

ALTER TABLE core.planillas
ALTER COLUMN sucursal_id SET NOT NULL;

-- Relación con sucursales.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_planilla_sucursal'
          AND conrelid = 'core.planillas'::regclass
    ) THEN
        ALTER TABLE core.planillas
        ADD CONSTRAINT fk_planilla_sucursal
        FOREIGN KEY (sucursal_id)
        REFERENCES core.sucursales(sucursal_id);
    END IF;
END;
$$;

-- Toda planilla debe tener fecha de pago.

ALTER TABLE core.planillas
ALTER COLUMN fecha_pago SET NOT NULL;


-- =========================================================
-- 2. VALIDAR PERIODOS Y FECHAS DE PAGO
-- =========================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_planilla_periodo_quincenal'
          AND conrelid = 'core.planillas'::regclass
    ) THEN

        ALTER TABLE core.planillas
        ADD CONSTRAINT chk_planilla_periodo_quincenal
        CHECK (
            (
                -- Primera quincena:
                -- Dia 1 al 15, pago el dia 16.

                EXTRACT(DAY FROM fecha_inicio) = 1
                AND EXTRACT(DAY FROM fecha_fin) = 15
                AND DATE_TRUNC('month', fecha_inicio) =
                    DATE_TRUNC('month', fecha_fin)
                AND fecha_pago = fecha_inicio + 15
            )
            OR
            (
                -- Segunda quincena:
                -- Dia 16 al ultimo dia del mes.
                -- Pago el primer dia del mes siguiente.

                EXTRACT(DAY FROM fecha_inicio) = 16
                AND fecha_fin =
                    (
                        DATE_TRUNC('month', fecha_inicio)
                        + INTERVAL '1 month - 1 day'
                    )::DATE
                AND fecha_pago =
                    (
                        DATE_TRUNC('month', fecha_inicio)
                        + INTERVAL '1 month'
                    )::DATE
            )
        );

    END IF;
END;
$$;


-- =========================================================
-- 3. EVITAR PLANILLAS DUPLICADAS POR SUCURSAL Y PERIODO
-- =========================================================

CREATE UNIQUE INDEX IF NOT EXISTS
    uq_planilla_sucursal_periodo
ON core.planillas (
    sucursal_id,
    fecha_inicio,
    fecha_fin
);


-- =========================================================
-- 4. SEPARAR LAS DEDUCCIONES LEGALES
-- =========================================================

ALTER TABLE core.detalle_planillas
ADD COLUMN IF NOT EXISTS deduccion_isss
NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE core.detalle_planillas
ADD COLUMN IF NOT EXISTS deduccion_afp
NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE core.detalle_planillas
ADD COLUMN IF NOT EXISTS deduccion_isr
NUMERIC(12,2) NOT NULL DEFAULT 0;


-- =========================================================
-- 5. VALIDAR LAS DEDUCCIONES
-- =========================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_deducciones_legales'
          AND conrelid = 'core.detalle_planillas'::regclass
    ) THEN

        ALTER TABLE core.detalle_planillas
        ADD CONSTRAINT chk_deducciones_legales
        CHECK (
            deducciones =
                deduccion_isss
                + deduccion_afp
                + deduccion_isr
        );

    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_deducciones_legales_no_negativas'
          AND conrelid = 'core.detalle_planillas'::regclass
    ) THEN

        ALTER TABLE core.detalle_planillas
        ADD CONSTRAINT chk_deducciones_legales_no_negativas
        CHECK (
            deduccion_isss >= 0
            AND deduccion_afp >= 0
            AND deduccion_isr >= 0
        );

    END IF;
END;
$$;


-- =========================================================
-- 6. VALIDAR QUE EL EMPLEADO PERTENEZCA A LA SUCURSAL
-- =========================================================

CREATE OR REPLACE FUNCTION core.validar_sucursal_detalle_planilla()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    sucursal_planilla BIGINT;
    sucursal_empleado BIGINT;
BEGIN

    SELECT p.sucursal_id
    INTO sucursal_planilla
    FROM core.planillas p
    WHERE p.planilla_id = NEW.planilla_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'La planilla indicada no existe.';
    END IF;


    SELECT e.sucursal_id
    INTO sucursal_empleado
    FROM core.empleados e
    WHERE e.empleado_id = NEW.empleado_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'El empleado indicado no existe.';
    END IF;


    IF sucursal_planilla <> sucursal_empleado THEN
        RAISE EXCEPTION
            'El empleado no pertenece a la sucursal de esta planilla.';
    END IF;


    RETURN NEW;

END;
$$;


-- Crear o reemplazar el trigger.

DROP TRIGGER IF EXISTS
    trg_validar_sucursal_detalle_planilla
ON core.detalle_planillas;

CREATE TRIGGER trg_validar_sucursal_detalle_planilla
BEFORE INSERT OR UPDATE OF planilla_id, empleado_id
ON core.detalle_planillas
FOR EACH ROW
EXECUTE FUNCTION core.validar_sucursal_detalle_planilla();


-- =========================================================
-- 7. INDICE PARA CONSULTAS DE PLANILLAS POR SUCURSAL
-- =========================================================

CREATE INDEX IF NOT EXISTS
    idx_planillas_sucursal
ON core.planillas(sucursal_id);

