-- ==========================================
-- 10 - DETALLE DE VENTAS Y PAGOS
-- Restaurante Origenes SV
-- ==========================================

-- 1. Detalle de ventas
CREATE TABLE IF NOT EXISTS core.detalle_ventas (
    detalle_venta_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    venta_id BIGINT NOT NULL,
    producto_id BIGINT NOT NULL,

    cantidad NUMERIC(14,3) NOT NULL,
    precio_unitario NUMERIC(12,2) NOT NULL,
    subtotal_linea NUMERIC(14,2) NOT NULL,

    CONSTRAINT fk_detalle_venta
        FOREIGN KEY (venta_id)
        REFERENCES core.ventas(venta_id),

    CONSTRAINT fk_detalle_venta_producto
        FOREIGN KEY (producto_id)
        REFERENCES core.productos(producto_id),

    CONSTRAINT chk_detalle_venta_cantidad
        CHECK (cantidad > 0),

    CONSTRAINT chk_detalle_venta_precio
        CHECK (precio_unitario >= 0),

    CONSTRAINT chk_detalle_venta_subtotal
        CHECK (
            subtotal_linea = ROUND(cantidad * precio_unitario, 2)
        )
);


CREATE INDEX IF NOT EXISTS idx_detalle_ventas_venta
    ON core.detalle_ventas(venta_id);

CREATE INDEX IF NOT EXISTS idx_detalle_ventas_producto
    ON core.detalle_ventas(producto_id);


-- 2. Catalogo de metodos de pago
CREATE TABLE IF NOT EXISTS core.metodos_pago (
    metodo_pago_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(60) NOT NULL UNIQUE,

    activo BOOLEAN NOT NULL DEFAULT TRUE
);


-- 3. Metodos de pago iniciales
INSERT INTO core.metodos_pago (codigo, nombre)
VALUES
    ('EFECTIVO', 'Efectivo'),
    ('TARJETA', 'Tarjeta'),
    ('BITCOIN', 'Bitcoin'),
    ('CHIVO_WALLET', 'Chivo Wallet')
ON CONFLICT DO NOTHING;


-- 4. Pagos de ventas
CREATE TABLE IF NOT EXISTS core.pagos (
    pago_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    venta_id BIGINT NOT NULL,
    metodo_pago_id BIGINT NOT NULL,

    monto NUMERIC(12,2) NOT NULL,

    referencia VARCHAR(100),

    fecha_pago TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pago_venta
        FOREIGN KEY (venta_id)
        REFERENCES core.ventas(venta_id),

    CONSTRAINT fk_pago_metodo
        FOREIGN KEY (metodo_pago_id)
        REFERENCES core.metodos_pago(metodo_pago_id),

    CONSTRAINT chk_pago_monto
        CHECK (monto > 0)
);


CREATE INDEX IF NOT EXISTS idx_pagos_venta
    ON core.pagos(venta_id);

CREATE INDEX IF NOT EXISTS idx_pagos_metodo
    ON core.pagos(metodo_pago_id);