
-- ==========================================
-- 11 - FACTURACION
-- Restaurante Origenes SV
-- ==========================================

CREATE TABLE core.facturas (
    factura_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    venta_id BIGINT NOT NULL UNIQUE,
    sucursal_id BIGINT NOT NULL,
    cliente_id BIGINT,

    tipo_documento VARCHAR(30) NOT NULL,

    serie VARCHAR(30) NOT NULL,
    numero BIGINT NOT NULL,

    fecha_emision TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    cliente_nombre VARCHAR(150) NOT NULL,
    cliente_documento VARCHAR(30),
    cliente_telefono VARCHAR(20),
    cliente_correo VARCHAR(150),

    subtotal NUMERIC(12,2) NOT NULL,
    porcentaje_iva NUMERIC(5,2) NOT NULL DEFAULT 13.00,
    iva NUMERIC(12,2) NOT NULL,
    total NUMERIC(12,2) NOT NULL,

    estado VARCHAR(20) NOT NULL DEFAULT 'EMITIDA',

    CONSTRAINT fk_factura_venta
        FOREIGN KEY (venta_id)
        REFERENCES core.ventas(venta_id),

    CONSTRAINT fk_factura_sucursal
        FOREIGN KEY (sucursal_id)
        REFERENCES core.sucursales(sucursal_id),

    CONSTRAINT fk_factura_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES core.clientes(cliente_id),

    CONSTRAINT chk_tipo_documento
        CHECK (
            tipo_documento IN (
                'CONSUMIDOR_FINAL',
                'CCF'
            )
        ),

    CONSTRAINT chk_factura_cliente_ccf
        CHECK (
            tipo_documento <> 'CCF'
            OR cliente_id IS NOT NULL
        ),

    CONSTRAINT chk_factura_numero
        CHECK (numero > 0),

    CONSTRAINT chk_factura_montos
        CHECK (
            subtotal >= 0
            AND porcentaje_iva >= 0
            AND iva >= 0
            AND total >= 0
        ),

    CONSTRAINT chk_factura_iva
        CHECK (
            iva = ROUND(subtotal * porcentaje_iva / 100, 2)
        ),

    CONSTRAINT chk_factura_total
        CHECK (total = subtotal + iva),

    CONSTRAINT chk_estado_factura
        CHECK (
            estado IN ('EMITIDA', 'ANULADA')
        ),

    CONSTRAINT uq_factura_correlativo
        UNIQUE (sucursal_id, tipo_documento, serie, numero)
);

CREATE INDEX idx_facturas_fecha
    ON core.facturas(fecha_emision);

CREATE INDEX idx_facturas_cliente
    ON core.facturas(cliente_id);

CREATE INDEX idx_facturas_sucursal
    ON core.facturas(sucursal_id);
