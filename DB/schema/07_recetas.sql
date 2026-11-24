-- ==========================================
-- 07 - RECETAS Y DETALLE DE RECETAS
-- Restaurante Origenes SV
-- ==========================================

-- 1. Recetas
CREATE TABLE IF NOT EXISTS core.recetas (
    receta_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    producto_id BIGINT NOT NULL UNIQUE,

    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,

    cantidad_producida NUMERIC(12,3) NOT NULL DEFAULT 1,

    instrucciones TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_receta_producto
        FOREIGN KEY (producto_id)
        REFERENCES core.productos(producto_id),

    CONSTRAINT chk_cantidad_producida
        CHECK (cantidad_producida > 0)
);


-- 2. Detalle de recetas
CREATE TABLE IF NOT EXISTS core.detalle_recetas (
    detalle_receta_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    receta_id BIGINT NOT NULL,
    ingrediente_id BIGINT NOT NULL,

    cantidad NUMERIC(12,3) NOT NULL,

    CONSTRAINT fk_detalle_receta
        FOREIGN KEY (receta_id)
        REFERENCES core.recetas(receta_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_detalle_ingrediente
        FOREIGN KEY (ingrediente_id)
        REFERENCES core.ingredientes(ingrediente_id),

    CONSTRAINT uq_receta_ingrediente
        UNIQUE (receta_id, ingrediente_id),

    CONSTRAINT chk_cantidad_ingrediente
        CHECK (cantidad > 0)
);


-- 3. Indices

CREATE INDEX IF NOT EXISTS idx_detalle_recetas_receta
    ON core.detalle_recetas(receta_id);

CREATE INDEX IF NOT EXISTS idx_detalle_recetas_ingrediente
    ON core.detalle_recetas(ingrediente_id);