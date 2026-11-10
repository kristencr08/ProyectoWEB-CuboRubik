-- ============================================
-- PROYECTO: RESTAURANTE ORIGENES SV
-- TABLA: CAJAS
-- ============================================

CREATE TABLE IF NOT EXISTS core.cajas (

    caja_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    sucursal_id BIGINT NOT NULL UNIQUE,

    nombre VARCHAR(80) NOT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_caja_sucursal
        FOREIGN KEY (sucursal_id)
        REFERENCES core.sucursales(sucursal_id)
);


-- ============================================
-- TABLA: TURNOS DE CAJA
-- ============================================

CREATE TABLE IF NOT EXISTS core.turnos_caja (

    turno_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    caja_id BIGINT NOT NULL,

    usuario_apertura BIGINT NOT NULL,

    usuario_cierre BIGINT,

    fecha_apertura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    fecha_cierre TIMESTAMP,

    monto_inicial NUMERIC(12,2) NOT NULL,

    monto_efectivo_esperado NUMERIC(12,2),

    monto_contado NUMERIC(12,2),

    -- Relacion con cajas
    CONSTRAINT fk_turno_caja
        FOREIGN KEY (caja_id)
        REFERENCES core.cajas(caja_id),

    -- Usuario que abre el turno
    CONSTRAINT fk_turno_usuario_apertura
        FOREIGN KEY (usuario_apertura)
        REFERENCES core.usuarios(usuario_id),

    -- Usuario que cierra el turno
    CONSTRAINT fk_turno_usuario_cierre
        FOREIGN KEY (usuario_cierre)
        REFERENCES core.usuarios(usuario_id),

    -- Validacion del monto inicial
    CONSTRAINT chk_monto_inicial
        CHECK (monto_inicial >= 0),

    -- Validacion de fechas
    CONSTRAINT chk_fecha_turno
        CHECK (
            fecha_cierre IS NULL
            OR fecha_cierre >= fecha_apertura
        ),

    -- Validacion del cierre
    CONSTRAINT chk_montos_cierre
        CHECK (
            (fecha_cierre IS NULL
                AND monto_efectivo_esperado IS NULL
                AND monto_contado IS NULL)
            OR
            (fecha_cierre IS NOT NULL
                AND monto_efectivo_esperado >= 0
                AND monto_contado >= 0)
        )
);


-- Impedir dos turnos abiertos en la misma caja
CREATE UNIQUE INDEX IF NOT EXISTS uq_turno_abierto_por_caja
ON core.turnos_caja(caja_id)
WHERE fecha_cierre IS NULL;


-- ============================================
-- TABLA: MOVIMIENTOS DE CAJA
-- ============================================

CREATE TABLE IF NOT EXISTS core.movimientos_caja (

    movimiento_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    turno_id BIGINT NOT NULL,

    usuario_id BIGINT NOT NULL,

    tipo VARCHAR(20) NOT NULL,

    monto NUMERIC(12,2) NOT NULL,

    descripcion TEXT NOT NULL,

    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Relacion con el turno
    CONSTRAINT fk_movimiento_turno
        FOREIGN KEY (turno_id)
        REFERENCES core.turnos_caja(turno_id),

    -- Usuario responsable
    CONSTRAINT fk_movimiento_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES core.usuarios(usuario_id),

    -- Tipos permitidos
    CONSTRAINT chk_tipo_movimiento
        CHECK (tipo IN ('INGRESO', 'EGRESO')),

    -- El monto debe ser positivo
    CONSTRAINT chk_monto_movimiento
        CHECK (monto > 0)
);


-- Indice para consultar movimientos por turno
CREATE INDEX IF NOT EXISTS idx_movimientos_turno
ON core.movimientos_caja(turno_id);