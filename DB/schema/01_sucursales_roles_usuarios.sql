
-- ============================================
-- PROYECTO: RESTAURANTE ORIGENES SV
-- TABLA: SUCURSALES
-- ============================================

CREATE TABLE core.sucursales (
    sucursal_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    nombre VARCHAR(100) NOT NULL,

    direccion TEXT NOT NULL,

    telefono VARCHAR(20),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- TABLA: ROLES
-- ============================================

CREATE TABLE core.roles (
    rol_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    nombre VARCHAR(50) NOT NULL UNIQUE,

    descripcion TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE
);


-- ============================================
-- TABLA: USUARIOS
-- ============================================

CREATE TABLE core.usuarios (
    usuario_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    sucursal_id BIGINT NOT NULL,

    rol_id BIGINT NOT NULL,

    nombre VARCHAR(120) NOT NULL,

    correo VARCHAR(150) NOT NULL,

    password_hash TEXT NOT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Relacion con sucursales
    CONSTRAINT fk_usuario_sucursal
        FOREIGN KEY (sucursal_id)
        REFERENCES core.sucursales(sucursal_id),

    -- Relacion con roles
    CONSTRAINT fk_usuario_rol
        FOREIGN KEY (rol_id)
        REFERENCES core.roles(rol_id),

    -- Correo unico
    CONSTRAINT uq_usuario_correo
        UNIQUE (correo)
);
