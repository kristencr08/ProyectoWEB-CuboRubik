-- ==========================================
-- 06 - INGREDIENTES Y UNIDADES DE MEDIDA
-- Restaurante Origenes SV
-- ==========================================

-- 1. Unidades de medida
CREATE TABLE IF NOT EXISTS core.unidades_medida (
    unidad_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    abreviatura VARCHAR(15) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);


-- 2. Ingredientes
CREATE TABLE IF NOT EXISTS core.ingredientes (
    ingrediente_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    unidad_id BIGINT NOT NULL,

    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ingrediente_unidad
        FOREIGN KEY (unidad_id)
        REFERENCES core.unidades_medida(unidad_id)
);


-- 3. Indice para consultas por nombre
CREATE INDEX IF NOT EXISTS idx_ingredientes_nombre
    ON core.ingredientes(nombre);