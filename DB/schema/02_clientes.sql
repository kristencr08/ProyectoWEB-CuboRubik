
-- ============================================
-- PROYECTO: RESTAURANTE ORIGENES SV
-- TABLA: CLIENTES
-- ============================================

CREATE TABLE core.clientes (

    -- Identificador unico del cliente
    cliente_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Informacion personal
    nombre VARCHAR(150) NOT NULL,

    documento VARCHAR(30) NOT NULL UNIQUE,

    telefono VARCHAR(20),

    correo VARCHAR(150),

    -- Control del registro
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- Indice para facilitar busquedas por nombre
CREATE INDEX idx_clientes_nombre
ON core.clientes(nombre);
