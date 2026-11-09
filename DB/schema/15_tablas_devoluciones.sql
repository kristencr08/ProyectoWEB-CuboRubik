
BEGIN;

-- =====================================================
-- 1. TABLA PRINCIPAL DE DEVOLUCIONES
-- =====================================================

CREATE TABLE IF NOT EXISTS core.devoluciones (
    devolucion_id BIGINT GENERATED ALWAYS AS IDENTITY
        PRIMARY KEY,

    venta_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    turno_id BIGINT NOT NULL,

    tipo_devolucion VARCHAR(20) NOT NULL,
    motivo TEXT NOT NULL,

    subtotal NUMERIC(12,2) NOT NULL,
    iva NUMERIC(12,2) NOT NULL,
    total NUMERIC(12,2) NOT NULL,

    estado VARCHAR(20) NOT NULL DEFAULT 'PROCESADA',

    fecha_devolucion TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_devolucion_venta
        FOREIGN KEY (venta_id)
        REFERENCES core.ventas(venta_id),

    CONSTRAINT fk_devolucion_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES core.usuarios(usuario_id),

    CONSTRAINT fk_devolucion_turno
        FOREIGN KEY (turno_id)
        REFERENCES core.turnos_caja(turno_id),

    CONSTRAINT chk_tipo_devolucion
        CHECK (
            tipo_devolucion IN ('PARCIAL', 'COMPLETA')
        ),

    CONSTRAINT chk_estado_devolucion
        CHECK (
            estado IN ('PROCESADA', 'ANULADA')
        ),

    CONSTRAINT chk_montos_devolucion
        CHECK (
            subtotal >= 0
            AND iva >= 0
            AND total > 0
        ),

    CONSTRAINT chk_total_devolucion
        CHECK (total = subtotal + iva)
);

-- =====================================================
-- 2. DETALLE DE PRODUCTOS DEVUELTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS core.detalle_devoluciones (
    detalle_devolucion_id BIGINT
        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    devolucion_id BIGINT NOT NULL,
    detalle_venta_id BIGINT NOT NULL,

    cantidad NUMERIC(12,3) NOT NULL,
    precio_unitario NUMERIC(12,2) NOT NULL,

    subtotal NUMERIC(12,2) NOT NULL,
    iva NUMERIC(12,2) NOT NULL,
    total NUMERIC(12,2) NOT NULL,

    CONSTRAINT fk_detalle_devolucion
        FOREIGN KEY (devolucion_id)
        REFERENCES core.devoluciones(devolucion_id),

    CONSTRAINT fk_detalle_venta_devolucion
        FOREIGN KEY (detalle_venta_id)
        REFERENCES core.detalle_ventas(detalle_venta_id),

    CONSTRAINT uq_devolucion_detalle_venta
        UNIQUE (devolucion_id, detalle_venta_id),

    CONSTRAINT chk_cantidad_devuelta
        CHECK (cantidad > 0),

    CONSTRAINT chk_precio_devolucion
        CHECK (precio_unitario >= 0),

    CONSTRAINT chk_montos_detalle_devolucion
        CHECK (
            subtotal >= 0
            AND iva >= 0
            AND total > 0
        ),

    CONSTRAINT chk_total_detalle_devolucion
        CHECK (total = subtotal + iva)
);

-- =====================================================
-- 3. DISTRIBUCION DE LOS PAGOS DEVUELTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS core.devoluciones_pagos (
    devolucion_pago_id BIGINT
        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    devolucion_id BIGINT NOT NULL,
    pago_id BIGINT NOT NULL,

    monto NUMERIC(12,2) NOT NULL,

    fecha_devolucion TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_devolucion_pago
        FOREIGN KEY (devolucion_id)
        REFERENCES core.devoluciones(devolucion_id),

    CONSTRAINT fk_pago_original_devolucion
        FOREIGN KEY (pago_id)
        REFERENCES core.pagos(pago_id),

    CONSTRAINT uq_devolucion_pago
        UNIQUE (devolucion_id, pago_id),

    CONSTRAINT chk_monto_devolucion_pago
        CHECK (monto > 0)
);

COMMIT;
