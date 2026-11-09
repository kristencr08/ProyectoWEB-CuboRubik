
BEGIN;

DO $$
DECLARE
    v_proveedor_id INTEGER;
    v_sucursal_id INTEGER;
    v_usuario_id INTEGER;
    v_masa_id INTEGER;
    v_queso_id INTEGER;
    v_compra_id INTEGER;
BEGIN
    -- Buscar los registros necesarios
    SELECT proveedor_id INTO v_proveedor_id
    FROM core.proveedores
    WHERE nombre = 'Distribuidora de Alimentos SV'
    LIMIT 1;

    SELECT sucursal_id INTO v_sucursal_id
    FROM core.sucursales
    WHERE nombre = 'Sucursal Central'
    LIMIT 1;

    SELECT usuario_id INTO v_usuario_id
    FROM core.usuarios
    WHERE correo = 'cajero@origenes.test'
    LIMIT 1;

    SELECT ingrediente_id INTO v_masa_id
    FROM core.ingredientes
    WHERE codigo = 'ING-001';

    SELECT ingrediente_id INTO v_queso_id
    FROM core.ingredientes
    WHERE codigo = 'ING-002';

    IF v_proveedor_id IS NULL OR v_sucursal_id IS NULL
       OR v_usuario_id IS NULL OR v_masa_id IS NULL
       OR v_queso_id IS NULL THEN
        RAISE EXCEPTION 'No se encontraron todos los registros necesarios para la compra.';
    END IF;

    -- Crear la compra solo si todavía no existe
    SELECT compra_id INTO v_compra_id
    FROM core.compras
    WHERE numero_documento = 'COMP-PRUEBA-001'
    LIMIT 1;

    IF v_compra_id IS NULL THEN
        INSERT INTO core.compras (
            proveedor_id,
            sucursal_id,
            usuario_id,
            numero_documento,
            subtotal,
            iva,
            total,
            porcentaje_iva,
            estado
        )
        VALUES (
            v_proveedor_id,
            v_sucursal_id,
            v_usuario_id,
            'COMP-PRUEBA-001',
            23.00,
            2.99,
            25.99,
            13.00,
            'PENDIENTE'
        )
        RETURNING compra_id INTO v_compra_id;

        -- Detalle: masa de maíz
        INSERT INTO core.detalle_compras (
            compra_id, ingrediente_id, cantidad,
            costo_unitario, subtotal_linea
        )
        VALUES (
            v_compra_id, v_masa_id, 2.000,
            1.50, 3.00
        );

        -- Detalle: queso
        INSERT INTO core.detalle_compras (
            compra_id, ingrediente_id, cantidad,
            costo_unitario, subtotal_linea
        )
        VALUES (
            v_compra_id, v_queso_id, 5.000,
            4.00, 20.00
        );
    END IF;

    RAISE NOTICE 'Compra de prueba registrada. ID: %', v_compra_id;
END $$;

COMMIT;
