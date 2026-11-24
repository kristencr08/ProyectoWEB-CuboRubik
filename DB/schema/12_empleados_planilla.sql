-- ==========================================
-- 12 - EMPLEADOS Y PLANILLA
-- Restaurante Origenes SV
-- ==========================================

-- 1. Empleados
CREATE TABLE IF NOT EXISTS core.empleados (
    empleado_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    sucursal_id BIGINT NOT NULL,
    usuario_id BIGINT UNIQUE,

    nombre VARCHAR(150) NOT NULL,
    documento VARCHAR(30) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    correo VARCHAR(150),

    cargo VARCHAR(100) NOT NULL,
    fecha_contratacion DATE NOT NULL,

    salario_base NUMERIC(12,2) NOT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_empleado_sucursal
        FOREIGN KEY (sucursal_id)
        REFERENCES core.sucursales(sucursal_id),

    CONSTRAINT fk_empleado_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES core.usuarios(usuario_id),

    CONSTRAINT chk_empleado_salario
        CHECK (salario_base >= 0)
);


CREATE INDEX IF NOT EXISTS idx_empleados_sucursal
    ON core.empleados(sucursal_id);

CREATE INDEX IF NOT EXISTS idx_empleados_nombre
    ON core.empleados(nombre);


-- 2. Planillas
CREATE TABLE IF NOT EXISTS core.planillas (
    planilla_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    nombre VARCHAR(100) NOT NULL,

    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,

    fecha_pago DATE,

    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',

    observaciones TEXT,

    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_periodo_planilla
        CHECK (fecha_fin >= fecha_inicio),

    CONSTRAINT chk_estado_planilla
        CHECK (
            estado IN ('PENDIENTE', 'PROCESADA', 'PAGADA')
        )
);


-- 3. Detalle de planillas
CREATE TABLE IF NOT EXISTS core.detalle_planillas (
    detalle_planilla_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    planilla_id BIGINT NOT NULL,
    empleado_id BIGINT NOT NULL,

    salario_base NUMERIC(12,2) NOT NULL,
    bonificaciones NUMERIC(12,2) NOT NULL DEFAULT 0,
    deducciones NUMERIC(12,2) NOT NULL DEFAULT 0,

    salario_neto NUMERIC(12,2) NOT NULL,

    CONSTRAINT fk_detalle_planilla
        FOREIGN KEY (planilla_id)
        REFERENCES core.planillas(planilla_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_detalle_empleado
        FOREIGN KEY (empleado_id)
        REFERENCES core.empleados(empleado_id),

    CONSTRAINT uq_planilla_empleado
        UNIQUE (planilla_id, empleado_id),

    CONSTRAINT chk_salario_base
        CHECK (salario_base >= 0),

    CONSTRAINT chk_bonificaciones
        CHECK (bonificaciones >= 0),

    CONSTRAINT chk_deducciones
        CHECK (deducciones >= 0),

    CONSTRAINT chk_salario_neto
        CHECK (
            salario_neto =
            salario_base + bonificaciones - deducciones
            AND salario_neto >= 0
        )
);


CREATE INDEX IF NOT EXISTS idx_detalle_planilla_empleado
    ON core.detalle_planillas(empleado_id);