
-- ============================================================
-- ARCHIVO 17: FUNCIONES TRANSACCIONALES DE DEVOLUCIONES
-- Proyecto: Restaurante Orígenes SV
--
-- Permite procesar devoluciones parciales y completas.
-- Solo ADMINISTRADOR y GERENTE pueden autorizarlas.
-- Los reembolsos se distribuyen proporcionalmente
-- entre los saldos de los pagos originales.
-- Solo los reembolsos en efectivo generan EGRESOS.
-- No se modifica el inventario.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION core.procesar_devolucion(
    p_venta_id BIGINT,
    p_usuario_id BIGINT,
    p_turno_id BIGINT,
    p_motivo TEXT,
    p_detalles JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_sucursal_usuario BIGINT;
    v_sucursal_venta BIGINT;
    v_sucursal_turno BIGINT;

    v_estado_venta VARCHAR(20);
    v_porcentaje_iva NUMERIC(5,2);

    v_item JSONB;
    v_linea JSONB;
    v_lineas JSONB := '[]'::JSONB;

    v_detalle_venta_id BIGINT;
    v_cantidad NUMERIC(12,3);
    v_cantidad_original NUMERIC(12,3);
    v_cantidad_devuelta NUMERIC(12,3);
    v_precio NUMERIC(12,2);

    v_subtotal_linea NUMERIC(12,2);
    v_iva_linea NUMERIC(12,2);

    v_subtotal NUMERIC(12,2) := 0;
    v_iva NUMERIC(12,2) := 0;
    v_total NUMERIC(12,2);

    v_total_devuelto NUMERIC(12,2);
    v_total_pagado NUMERIC(12,2);
    v_disponible NUMERIC(12,2);

    v_es_completa BOOLEAN;

    v_devolucion_id BIGINT;
    v_devolucion_pago_id BIGINT;

    v_pago RECORD;
    v_saldo_pago NUMERIC(12,2);
    v_asignado NUMERIC(12,2);
    v_pendiente NUMERIC(12,2);

BEGIN

    -- --------------------------------------------------------
    -- 1. VALIDAR DATOS GENERALES
    -- --------------------------------------------------------

    IF p_motivo IS NULL OR BTRIM(p_motivo) = '' THEN
        RAISE EXCEPTION 'Debe indicar el motivo de la devolución.';
    END IF;

    IF p_detalles IS NULL
       OR jsonb_typeof(p_detalles) <> 'array'
       OR jsonb_array_length(p_detalles) = 0 THEN
        RAISE EXCEPTION 'Debe proporcionar al menos un producto para devolver.';
    END IF;

    -- Evitar productos repetidos en una misma solicitud.
    IF (
        SELECT COUNT(*)
        FROM jsonb_array_elements(p_detalles)
    ) <> (
        SELECT COUNT(DISTINCT (value->>'detalle_venta_id')::BIGINT)
        FROM jsonb_array_elements(p_detalles)
    ) THEN
        RAISE EXCEPTION 'No repita el mismo detalle de venta. Agrupe sus cantidades.';
    END IF;


       -- --------------------------------------------------------
    -- 2. VALIDAR USUARIO Y PERMISOS
    -- --------------------------------------------------------

    SELECT u.sucursal_id
    INTO v_sucursal_usuario
    FROM core.usuarios u
    WHERE u.usuario_id = p_usuario_id
      AND u.activo = TRUE
      AND EXISTS (
          SELECT 1
          FROM core.roles r
          WHERE r.rol_id = u.rol_id
            AND UPPER(r.nombre) IN ('ADMINISTRADOR', 'GERENTE')
            AND r.activo = TRUE
      )
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Usuario inexistente, inactivo o sin permisos para devolver.';
    END IF;


    -- --------------------------------------------------------
    -- 3. BLOQUEAR Y VALIDAR LA VENTA
    -- --------------------------------------------------------

    SELECT
        v.estado,
        v.porcentaje_iva,
        c.sucursal_id
    INTO
        v_estado_venta,
        v_porcentaje_iva,
        v_sucursal_venta
    FROM core.ventas v
    JOIN core.turnos_caja t
        ON t.turno_id = v.turno_id
    JOIN core.cajas c
        ON c.caja_id = t.caja_id
    WHERE v.venta_id = p_venta_id
    FOR UPDATE OF v;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La venta indicada no existe.';
    END IF;

    IF v_estado_venta <> 'PAGADA' THEN
        RAISE EXCEPTION 'Solo se permiten devoluciones de ventas PAGADAS.';
    END IF;


    -- --------------------------------------------------------
    -- 4. VALIDAR TURNO Y SUCURSAL
    -- --------------------------------------------------------

    SELECT c.sucursal_id
    INTO v_sucursal_turno
    FROM core.turnos_caja t
    JOIN core.cajas c
        ON c.caja_id = t.caja_id
    WHERE t.turno_id = p_turno_id
      AND t.fecha_cierre IS NULL
    FOR UPDATE OF t;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El turno indicado no existe o está cerrado.';
    END IF;

    IF v_sucursal_turno <> v_sucursal_venta THEN
        RAISE EXCEPTION 'El turno debe pertenecer a la sucursal de la venta original.';
    END IF;

    IF v_sucursal_usuario <> v_sucursal_venta THEN
        RAISE EXCEPTION 'El usuario solo puede procesar devoluciones en su sucursal.';
    END IF;


    -- --------------------------------------------------------
    -- 5. BLOQUEAR LOS PAGOS ORIGINALES
    -- --------------------------------------------------------

    PERFORM 1
    FROM core.pagos
    WHERE venta_id = p_venta_id
    ORDER BY pago_id
    FOR UPDATE;

    SELECT COALESCE(SUM(monto), 0)
    INTO v_total_pagado
    FROM core.pagos
    WHERE venta_id = p_venta_id;

    IF v_total_pagado <= 0 THEN
        RAISE EXCEPTION 'La venta no tiene pagos registrados.';
    END IF;


    -- --------------------------------------------------------
    -- 6. VALIDAR Y CALCULAR LOS PRODUCTOS
    -- --------------------------------------------------------

    FOR v_item IN
        SELECT value
        FROM jsonb_array_elements(p_detalles)
    LOOP

        v_detalle_venta_id :=
            (v_item->>'detalle_venta_id')::BIGINT;

        v_cantidad :=
            (v_item->>'cantidad')::NUMERIC;

        IF v_cantidad IS NULL OR v_cantidad <= 0 THEN
            RAISE EXCEPTION 'Todas las cantidades deben ser mayores que cero.';
        END IF;

        -- Bloquear el detalle original para proteger su cantidad.
        SELECT cantidad, precio_unitario
        INTO v_cantidad_original, v_precio
        FROM core.detalle_ventas
        WHERE detalle_venta_id = v_detalle_venta_id
          AND venta_id = p_venta_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION
                'El detalle % no pertenece a la venta indicada.',
                v_detalle_venta_id;
        END IF;

        -- Calcular cuánto se ha devuelto anteriormente.
        SELECT COALESCE(SUM(dd.cantidad), 0)
        INTO v_cantidad_devuelta
        FROM core.detalle_devoluciones dd
        JOIN core.devoluciones d
            ON d.devolucion_id = dd.devolucion_id
        WHERE dd.detalle_venta_id = v_detalle_venta_id
          AND d.estado = 'PROCESADA';

        IF v_cantidad_devuelta + v_cantidad > v_cantidad_original THEN
            RAISE EXCEPTION
                'La cantidad solicitada supera la cantidad disponible del detalle %.',
                v_detalle_venta_id;
        END IF;

        -- Calcular importes.
        v_subtotal_linea := ROUND(v_cantidad * v_precio, 2);

        v_iva_linea := ROUND(
            v_subtotal_linea * v_porcentaje_iva / 100,
            2
        );

        v_subtotal := v_subtotal + v_subtotal_linea;
        v_iva := v_iva + v_iva_linea;

        -- Guardar temporalmente los datos calculados.
        v_lineas := v_lineas || jsonb_build_array(
            jsonb_build_object(
                'detalle_venta_id', v_detalle_venta_id,
                'cantidad', v_cantidad,
                'precio_unitario', v_precio,
                'subtotal', v_subtotal_linea,
                'iva', v_iva_linea,
                'total', v_subtotal_linea + v_iva_linea
            )
        );

    END LOOP;


    -- --------------------------------------------------------
    -- 7. VALIDAR QUE NO SE DEVUELVA MÁS DINERO DEL DISPONIBLE
    -- --------------------------------------------------------

    v_total := v_subtotal + v_iva;

    SELECT COALESCE(SUM(d.total), 0)
    INTO v_total_devuelto
    FROM core.devoluciones d
    WHERE d.venta_id = p_venta_id
      AND d.estado = 'PROCESADA';

    IF v_total + v_total_devuelto >
       (SELECT total FROM core.ventas WHERE venta_id = p_venta_id) THEN
        RAISE EXCEPTION 'La devolución supera el total de la venta.';
    END IF;

    -- Calcular el saldo disponible de los pagos originales.
    SELECT COALESCE(SUM(
        p.monto - COALESCE((
            SELECT SUM(dp.monto)
            FROM core.devoluciones_pagos dp
            JOIN core.devoluciones d
                ON d.devolucion_id = dp.devolucion_id
            WHERE dp.pago_id = p.pago_id
              AND d.estado = 'PROCESADA'
        ), 0)
    ), 0)
    INTO v_disponible
    FROM core.pagos p
    WHERE p.venta_id = p_venta_id;

    IF v_total > v_disponible THEN
        RAISE EXCEPTION 'El importe supera el saldo disponible de los pagos originales.';
    END IF;


    -- --------------------------------------------------------
    -- 8. DETERMINAR SI ES DEVOLUCIÓN PARCIAL O COMPLETA
    -- --------------------------------------------------------

    SELECT NOT EXISTS (
        SELECT 1
        FROM core.detalle_ventas dv
        WHERE dv.venta_id = p_venta_id
          AND dv.cantidad >
              COALESCE((
                  SELECT SUM(dd.cantidad)
                  FROM core.detalle_devoluciones dd
                  JOIN core.devoluciones d
                      ON d.devolucion_id = dd.devolucion_id
                  WHERE dd.detalle_venta_id = dv.detalle_venta_id
                    AND d.estado = 'PROCESADA'
              ), 0)
              +
              COALESCE((
                  SELECT SUM((elemento->>'cantidad')::NUMERIC)
                  FROM jsonb_array_elements(p_detalles) elemento
                  WHERE (elemento->>'detalle_venta_id')::BIGINT =
                        dv.detalle_venta_id
              ), 0)
    )
    INTO v_es_completa;


    -- --------------------------------------------------------
    -- 9. CREAR CABECERA DE DEVOLUCIÓN
    -- --------------------------------------------------------

    INSERT INTO core.devoluciones (
        venta_id,
        usuario_id,
        turno_id,
        tipo_devolucion,
        motivo,
        subtotal,
        iva,
        total,
        estado
    )
    VALUES (
        p_venta_id,
        p_usuario_id,
        p_turno_id,
        CASE
            WHEN v_es_completa THEN 'COMPLETA'
            ELSE 'PARCIAL'
        END,
        p_motivo,
        v_subtotal,
        v_iva,
        v_total,
        'PROCESADA'
    )
    RETURNING devolucion_id INTO v_devolucion_id;


    -- --------------------------------------------------------
    -- 10. INSERTAR DETALLES DE LA DEVOLUCIÓN
    -- --------------------------------------------------------

    FOR v_linea IN
        SELECT value
        FROM jsonb_array_elements(v_lineas)
    LOOP

        INSERT INTO core.detalle_devoluciones (
            devolucion_id,
            detalle_venta_id,
            cantidad,
            precio_unitario,
            subtotal,
            iva,
            total
        )
        VALUES (
            v_devolucion_id,
            (v_linea->>'detalle_venta_id')::BIGINT,
            (v_linea->>'cantidad')::NUMERIC,
            (v_linea->>'precio_unitario')::NUMERIC,
            (v_linea->>'subtotal')::NUMERIC,
            (v_linea->>'iva')::NUMERIC,
            (v_linea->>'total')::NUMERIC
        );

    END LOOP;


    -- --------------------------------------------------------
    -- 11. DISTRIBUIR EL REEMBOLSO ENTRE PAGOS ORIGINALES
    -- --------------------------------------------------------

    v_pendiente := v_total;

    FOR v_pago IN
        SELECT
            p.pago_id,
            p.monto,
            mp.codigo,
            p.monto - COALESCE(SUM(
                CASE
                    WHEN d.estado = 'PROCESADA' THEN dp.monto
                    ELSE 0
                END
            ), 0) AS saldo
        FROM core.pagos p
        JOIN core.metodos_pago mp
            ON mp.metodo_pago_id = p.metodo_pago_id
        LEFT JOIN core.devoluciones_pagos dp
            ON dp.pago_id = p.pago_id
        LEFT JOIN core.devoluciones d
            ON d.devolucion_id = dp.devolucion_id
        WHERE p.venta_id = p_venta_id
        GROUP BY
            p.pago_id,
            p.monto,
            mp.codigo
        HAVING p.monto - COALESCE(SUM(
            CASE
                WHEN d.estado = 'PROCESADA' THEN dp.monto
                ELSE 0
            END
        ), 0) > 0
        ORDER BY p.pago_id
    LOOP

        v_saldo_pago := v_pago.saldo;

        -- Distribución proporcional con ajuste de redondeo.
        IF v_saldo_pago >= v_disponible THEN
            v_asignado := v_pendiente;
        ELSE
            v_asignado := ROUND(
                v_pendiente * v_saldo_pago / v_disponible,
                2
            );
        END IF;

        v_asignado := LEAST(v_asignado, v_saldo_pago, v_pendiente);

        IF v_asignado > 0 THEN

            INSERT INTO core.devoluciones_pagos (
                devolucion_id,
                pago_id,
                monto
            )
            VALUES (
                v_devolucion_id,
                v_pago.pago_id,
                v_asignado
            )
            RETURNING devolucion_pago_id
            INTO v_devolucion_pago_id;

            -- Solo el efectivo genera un EGRESO de caja.
            IF v_pago.codigo = 'EFECTIVO' THEN

                INSERT INTO core.movimientos_caja (
                    turno_id,
                    usuario_id,
                    tipo,
                    monto,
                    descripcion,
                    devolucion_pago_id
                )
                VALUES (
                    p_turno_id,
                    p_usuario_id,
                    'EGRESO',
                    v_asignado,
                    'Devolución de venta ' || p_venta_id ||
                    ' - Devolución ' || v_devolucion_id,
                    v_devolucion_pago_id
                );

            END IF;

            v_pendiente := v_pendiente - v_asignado;

        END IF;

        v_disponible := v_disponible - v_saldo_pago;

    END LOOP;


    -- --------------------------------------------------------
    -- 12. COMPROBAR QUE TODO EL IMPORTE FUE DISTRIBUIDO
    -- --------------------------------------------------------

    IF v_pendiente <> 0 THEN
        RAISE EXCEPTION
            'No fue posible distribuir el importe completo del reembolso.';
    END IF;


    -- Devolver el identificador de la devolución procesada.
    RETURN v_devolucion_id;

END;
$$;

COMMIT;
