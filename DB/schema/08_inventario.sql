
-- ==========================================
-- 08 - INVENTARIO
-- Restaurante Origenes SV
-- ==========================================

-- 1. Existencias de ingredientes por sucursal
CREATE TABLE core.existencias_ingredientes (
    existencia_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    sucursal_id BIGINT NOT NULL,
    ingrediente_id BIGINT NOT NULL,

    cantidad NUMERIC(14,3) NOT NULL DEFAULT 0,

    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_existencia_ingrediente_sucursal
        FOREIGN KEY (sucursal_id)
        REFERENCES core.sucursales(sucursal_id),

    CONSTRAINT fk_existencia_ingrediente
        FOREIGN KEY (ingrediente_id)
        REFERENCES core.ingredientes(ingrediente_id),

    CONSTRAINT uq_existencia_ingrediente
        UNIQUE (sucursal_id, ingrediente_id),

    CONSTRAINT chk_existencia_ingrediente
        CHECK (cantidad >= 0)
);

-- 2. Existencias de productos directos por sucursal
CREATE TABLE core.existencias_productos (
    existencia_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    sucursal_id BIGINT NOT NULL,
    producto_id BIGINT NOT NULL,

    cantidad NUMERIC(14,3) NOT NULL DEFAULT 0,

    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_existencia_producto_sucursal
        FOREIGN KEY (sucursal_id)
        REFERENCES core.sucursales(sucursal_id),

    CONSTRAINT fk_existencia_producto
        FOREIGN KEY (producto_id)
        REFERENCES core.productos(producto_id),

    CONSTRAINT uq_existencia_producto
        UNIQUE (sucursal_id, producto_id),

    CONSTRAINT chk_existencia_producto
        CHECK (cantidad >= 0)
);

-- 3. Movimientos de inventario
CREATE TABLE core.movimientos_inventario (
    movimiento_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    sucursal_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,

    ingrediente_id BIGINT,
    producto_id BIGINT,

    tipo VARCHAR(20) NOT NULL,
    cantidad NUMERIC(14,3) NOT NULL,

    descripcion TEXT NOT NULL,

    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_movimiento_inventario_sucursal
        FOREIGN KEY (sucursal_id)
        REFERENCES core.sucursales(sucursal_id),

    CONSTRAINT fk_movimiento_inventario_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES core.usuarios(usuario_id),

    CONSTRAINT fk_movimiento_inventario_ingrediente
        FOREIGN KEY (ingrediente_id)
        REFERENCES core.ingredientes(ingrediente_id),

    CONSTRAINT fk_movimiento_inventario_producto
        FOREIGN KEY (producto_id)
        REFERENCES core.productos(producto_id),

    CONSTRAINT chk_movimiento_tipo
        CHECK (tipo IN ('ENTRADA', 'SALIDA', 'AJUSTE')),

    CONSTRAINT chk_movimiento_cantidad
        CHECK (cantidad > 0),

    CONSTRAINT chk_movimiento_articulo
        CHECK (
            (ingrediente_id IS NOT NULL AND producto_id IS NULL)
            OR
            (ingrediente_id IS NULL AND producto_id IS NOT NULL)
        )
);

-- 4. Indices
CREATE INDEX idx_existencias_ingrediente_sucursal
    ON core.existencias_ingredientes(sucursal_id);

CREATE INDEX idx_existencias_producto_sucursal
    ON core.existencias_productos(sucursal_id);

CREATE INDEX idx_movimientos_inventario_fecha
    ON core.movimientos_inventario(fecha);

CREATE INDEX idx_movimientos_inventario_sucursal
    ON core.movimientos_inventario(sucursal_id);
