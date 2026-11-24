
-- =====================================================
-- 10_recibir_compra_prueba.sql
-- Recepción de compra y actualización de inventario
-- Restaurante Orígenes SV
-- =====================================================

WITH compra_recibida AS (
    UPDATE core.compras c
    SET estado = 'RECIBIDA'
    WHERE c.numero_documento = 'COMP-PRUEBA-001'
      AND c.estado = 'PENDIENTE'
      AND EXISTS (
          SELECT 1
          FROM core.proveedores p
          WHERE p.proveedor_id = c.proveedor_id
            AND p.nombre = 'Distribuidora de Alimentos SV'
      )
    RETURNING c.compra_id, c.sucursal_id, c.usuario_id
),
movimientos AS (
    INSERT INTO core.movimientos_inventario (
        sucursal_id,
        usuario_id,
        ingrediente_id,
        producto_id,
        tipo,
        cantidad,
        descripcion
    )
    SELECT
        cr.sucursal_id,
        cr.usuario_id,
        dc.ingrediente_id,
        NULL,
        'ENTRADA',
        dc.cantidad,
        'Recepción compra COMP-PRUEBA-001'
    FROM compra_recibida cr
    JOIN core.detalle_compras dc
        ON dc.compra_id = cr.compra_id
    WHERE dc.ingrediente_id IS NOT NULL
    RETURNING sucursal_id, ingrediente_id, cantidad
)
INSERT INTO core.existencias_ingredientes (
    sucursal_id,
    ingrediente_id,
    cantidad
)
SELECT
    sucursal_id,
    ingrediente_id,
    SUM(cantidad)
FROM movimientos
GROUP BY sucursal_id, ingrediente_id
ON CONFLICT (sucursal_id, ingrediente_id)
DO UPDATE SET
    cantidad = core.existencias_ingredientes.cantidad
               + EXCLUDED.cantidad;
