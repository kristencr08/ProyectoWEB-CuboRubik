
-- ============================================
-- PROYECTO: RESTAURANTE ORIGENES SV
-- TABLA: VENTAS
-- ============================================

CREATE TABLE core.ventas (

    venta_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    turno_id BIGINT NOT NULL,

    usuario_id BIGINT NOT NULL,

    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    subtotal NUMERIC(12,2) NOT NULL,

    porcentaje_iva NUMERIC(5,2) NOT NULL DEFAULT 13.00,

    iva NUMERIC(12,2) NOT NULL,

    total NUMERIC(12,2) NOT NULL,

    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',

    -- Relacion con turno
    CONSTRAINT fk_venta_turno
        FOREIGN KEY (turno_id)
        REFERENCES core.turnos_caja(turno_id),

    -- Relacion con usuario
    CONSTRAINT fk_venta_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES core.usuarios(usuario_id),

    -- Validacion de importes
    CONSTRAINT chk_venta_montos
        CHECK (
            subtotal >= 0
            AND iva >= 0
            AND total >= 0
            AND porcentaje_iva >= 0
        ),

    -- Validacion del impuesto
    CONSTRAINT chk_venta_iva
        CHECK (
            iva = ROUND(subtotal * porcentaje_iva / 100, 2)
        ),

    -- Validacion del total
    CONSTRAINT chk_venta_total
        CHECK (total = subtotal + iva),

    -- Estados permitidos
    CONSTRAINT chk_estado_venta
        CHECK (
            estado IN ('PENDIENTE', 'PAGADA', 'ANULADA')
        )
);

-- Indices para consultas
CREATE INDEX idx_ventas_fecha
ON core.ventas(fecha);

CREATE INDEX idx_ventas_turno
ON core.ventas(turno_id);

CREATE INDEX idx_ventas_usuario
ON core.ventas(usuario_id);
