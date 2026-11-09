
-- ==========================================
-- 09 - PROVEEDORES Y COMPRAS
-- Restaurante Origenes SV
-- ==========================================

-- 1. Proveedores
CREATE TABLE core.proveedores (
    proveedor_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    nombre VARCHAR(150) NOT NULL,
    documento VARCHAR(30),
    telefono VARCHAR(20),
    correo VARCHAR(150),
    direccion TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_proveedores_nombre
    ON core.proveedores(nombre);

-- 2. Compras
CREATE TABLE core.compras (
    compra_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    proveedor_id BIGINT NOT NULL,
    sucursal_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,

    numero_documento VARCHAR(50),

    fecha_compra TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    subtotal NUMERIC(12,2) NOT NULL,
    porcentaje_iva NUMERIC(5,2) NOT NULL DEFAULT 13.00,
    iva NUMERIC(12,2) NOT NULL,
    total NUMERIC(12,2) NOT NULL,

    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',

    observaciones TEXT,

    CONSTRAINT fk_compra_proveedor
        FOREIGN KEY (proveedor_id)
        REFERENCES core.proveedores(proveedor_id),

    CONSTRAINT fk_compra_sucursal
        FOREIGN KEY (sucursal_id)
        REFERENCES core.sucursales(sucursal_id),

    CONSTRAINT fk_compra_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES core.usuarios(usuario_id),

    CONSTRAINT chk_compra_montos CHECK (
        subtotal >= 0
        AND iva >= 0
        AND total >= 0
        AND porcentaje_iva >= 0
    ),

    CONSTRAINT chk_compra_iva CHECK (
        iva = ROUND(subtotal * porcentaje_iva / 100, 2)
    ),

    CONSTRAINT chk_compra_total CHECK (
        total = subtotal + iva
    ),

    CONSTRAINT chk_estado_compra CHECK (
        estado IN ('PENDIENTE', 'RECIBIDA', 'ANULADA')
    )
);

CREATE INDEX idx_compras_fecha
    ON core.compras(fecha_compra);

CREATE INDEX idx_compras_proveedor
    ON core.compras(proveedor_id);

CREATE INDEX idx_compras_sucursal
    ON core.compras(sucursal_id);

-- 3. Detalle de compras
CREATE TABLE core.detalle_compras (
    detalle_compra_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    compra_id BIGINT NOT NULL,

    ingrediente_id BIGINT,
    producto_id BIGINT,

    cantidad NUMERIC(14,3) NOT NULL,
    costo_unitario NUMERIC(12,2) NOT NULL,
    subtotal_linea NUMERIC(14,2) NOT NULL,

    CONSTRAINT fk_detalle_compra
        FOREIGN KEY (compra_id)
        REFERENCES core.compras(compra_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_detalle_compra_ingrediente
        FOREIGN KEY (ingrediente_id)
        REFERENCES core.ingredientes(ingrediente_id),

    CONSTRAINT fk_detalle_compra_producto
        FOREIGN KEY (producto_id)
        REFERENCES core.productos(producto_id),

    CONSTRAINT chk_detalle_compra_articulo CHECK (
        (ingrediente_id IS NOT NULL AND producto_id IS NULL)
        OR
        (ingrediente_id IS NULL AND producto_id IS NOT NULL)
    ),

    CONSTRAINT chk_detalle_compra_cantidad
        CHECK (cantidad > 0),

    CONSTRAINT chk_detalle_compra_costo
        CHECK (costo_unitario >= 0),

    CONSTRAINT chk_detalle_compra_subtotal
        CHECK (
            subtotal_linea = ROUND(cantidad * costo_unitario, 2)
        )
);

CREATE INDEX idx_detalle_compras_compra
    ON core.detalle_compras(compra_id);

CREATE INDEX idx_detalle_compras_ingrediente
    ON core.detalle_compras(ingrediente_id);

CREATE INDEX idx_detalle_compras_producto
    ON core.detalle_compras(producto_id);
