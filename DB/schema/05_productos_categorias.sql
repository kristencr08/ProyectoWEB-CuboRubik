
-- ==========================================
-- 05 - CATEGORIAS Y PRODUCTOS
-- Restaurante Origenes SV
-- ==========================================

-- 1. Tabla de categorias
CREATE TABLE core.categorias (
    categoria_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de productos
CREATE TABLE core.productos (
    producto_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    categoria_id BIGINT NOT NULL,

    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,

    tipo_producto VARCHAR(20) NOT NULL,

    precio_venta NUMERIC(12,2) NOT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_producto_categoria
        FOREIGN KEY (categoria_id)
        REFERENCES core.categorias(categoria_id),

    CONSTRAINT chk_tipo_producto
        CHECK (tipo_producto IN ('ELABORADO', 'DIRECTO')),

    CONSTRAINT chk_precio_producto
        CHECK (precio_venta >= 0)
);

-- 3. Indices para consultas frecuentes
CREATE INDEX idx_productos_categoria
    ON core.productos(categoria_id);

CREATE INDEX idx_productos_nombre
    ON core.productos(nombre);

CREATE INDEX idx_productos_tipo
    ON core.productos(tipo_producto);
