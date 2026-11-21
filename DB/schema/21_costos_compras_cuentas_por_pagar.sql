-- ==========================================
-- 21 - ULTIMO COSTO, CONDICIONES DE COMPRA
--      Y CUENTAS POR PAGAR
-- Restaurante Origenes SV
-- ==========================================

-- 1. ULTIMO COSTO DE COMPRA
-- (se actualiza al recibir una compra; sirve para el costo de las recetas)

ALTER TABLE core.ingredientes
    ADD COLUMN IF NOT EXISTS ultimo_costo NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE core.productos
    ADD COLUMN IF NOT EXISTS ultimo_costo NUMERIC(12,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_ingrediente_ultimo_costo'
          AND conrelid = 'core.ingredientes'::regclass
    ) THEN
        ALTER TABLE core.ingredientes
        ADD CONSTRAINT chk_ingrediente_ultimo_costo
        CHECK (ultimo_costo >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_producto_ultimo_costo'
          AND conrelid = 'core.productos'::regclass
    ) THEN
        ALTER TABLE core.productos
        ADD CONSTRAINT chk_producto_ultimo_costo
        CHECK (ultimo_costo >= 0);
    END IF;
END $$;


-- 2. CONDICIONES DE PAGO EN COMPRAS (dias_credito = 0 es contado)

ALTER TABLE core.compras
    ADD COLUMN IF NOT EXISTS dias_credito INTEGER NOT NULL DEFAULT 0;

ALTER TABLE core.compras
    ADD COLUMN IF NOT EXISTS fecha_recepcion TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_compra_dias_credito'
          AND conrelid = 'core.compras'::regclass
    ) THEN
        ALTER TABLE core.compras
        ADD CONSTRAINT chk_compra_dias_credito
        CHECK (dias_credito BETWEEN 0 AND 365);
    END IF;
END $$;


-- 3. CUENTAS POR PAGAR (una por compra recibida)

CREATE TABLE IF NOT EXISTS core.cuentas_por_pagar (
    cxp_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    compra_id BIGINT NOT NULL UNIQUE,
    proveedor_id BIGINT NOT NULL,
    sucursal_id BIGINT NOT NULL,

    monto_total NUMERIC(12,2) NOT NULL,
    saldo NUMERIC(12,2) NOT NULL,

    fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE NOT NULL,

    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',

    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cxp_compra
        FOREIGN KEY (compra_id) REFERENCES core.compras(compra_id),

    CONSTRAINT fk_cxp_proveedor
        FOREIGN KEY (proveedor_id) REFERENCES core.proveedores(proveedor_id),

    CONSTRAINT fk_cxp_sucursal
        FOREIGN KEY (sucursal_id) REFERENCES core.sucursales(sucursal_id),

    CONSTRAINT chk_cxp_montos CHECK (
        monto_total >= 0 AND saldo >= 0 AND saldo <= monto_total
    ),

    CONSTRAINT chk_cxp_fechas CHECK (
        fecha_vencimiento >= fecha_emision
    ),

    CONSTRAINT chk_cxp_estado CHECK (
        estado IN ('PENDIENTE', 'PARCIAL', 'PAGADA')
    ),

    CONSTRAINT chk_cxp_estado_saldo CHECK (
        (estado = 'PAGADA'    AND saldo = 0)
        OR (estado = 'PARCIAL'   AND saldo > 0 AND saldo < monto_total)
        OR (estado = 'PENDIENTE' AND saldo = monto_total)
    )
);

CREATE INDEX IF NOT EXISTS idx_cxp_sucursal_estado
    ON core.cuentas_por_pagar(sucursal_id, estado);

CREATE INDEX IF NOT EXISTS idx_cxp_vencimiento
    ON core.cuentas_por_pagar(fecha_vencimiento);

CREATE INDEX IF NOT EXISTS idx_cxp_proveedor
    ON core.cuentas_por_pagar(proveedor_id);


-- 4. PAGOS A PROVEEDORES (abonos a una cuenta)

CREATE TABLE IF NOT EXISTS core.pagos_proveedores (
    pago_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    cxp_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,

    monto NUMERIC(12,2) NOT NULL,
    metodo_pago VARCHAR(20) NOT NULL,
    referencia VARCHAR(100),

    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pago_proveedor_cxp
        FOREIGN KEY (cxp_id) REFERENCES core.cuentas_por_pagar(cxp_id),

    CONSTRAINT fk_pago_proveedor_usuario
        FOREIGN KEY (usuario_id) REFERENCES core.usuarios(usuario_id),

    CONSTRAINT chk_pago_proveedor_monto CHECK (monto > 0),

    CONSTRAINT chk_pago_proveedor_metodo CHECK (
        metodo_pago IN (
            'EFECTIVO', 'TRANSFERENCIA', 'CHEQUE',
            'TARJETA', 'BITCOIN', 'CHIVO_WALLET'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_pagos_proveedores_cxp
    ON core.pagos_proveedores(cxp_id);


-- 5. VISTA DE ALERTAS DE STOCK MINIMO
-- (usa el stock_minimo del esquema 20)

CREATE OR REPLACE VIEW core.v_alertas_stock AS
SELECT
    e.sucursal_id,
    'INGREDIENTE'::VARCHAR(20) AS tipo,
    i.ingrediente_id AS articulo_id,
    i.codigo,
    i.nombre,
    e.cantidad AS stock,
    e.stock_minimo,
    um.abreviatura AS unidad
FROM core.existencias_ingredientes e
JOIN core.ingredientes i ON i.ingrediente_id = e.ingrediente_id
JOIN core.unidades_medida um ON um.unidad_id = i.unidad_id
WHERE i.activo = TRUE
  AND e.stock_minimo > 0
  AND e.cantidad <= e.stock_minimo

UNION ALL

SELECT
    e.sucursal_id,
    'PRODUCTO_DIRECTO'::VARCHAR(20) AS tipo,
    p.producto_id AS articulo_id,
    p.codigo,
    p.nombre,
    e.cantidad AS stock,
    e.stock_minimo,
    'und'::VARCHAR(15) AS unidad
FROM core.existencias_productos e
JOIN core.productos p ON p.producto_id = e.producto_id
WHERE p.activo = TRUE
  AND p.tipo_producto = 'DIRECTO'
  AND e.stock_minimo > 0
  AND e.cantidad <= e.stock_minimo;