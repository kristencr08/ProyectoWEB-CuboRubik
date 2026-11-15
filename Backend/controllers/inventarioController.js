
const pool = require('../../DB/db');


const obtenerInventario = async (req, res) => {
        try {
    
        const usuarioId = req.usuario.id;

    
    const sucursalResult = await pool.query(
        `SELECT s.sucursal_id, s.nombre
        FROM core.usuarios u
        JOIN core.sucursales s
        ON s.sucursal_id = u.sucursal_id
        WHERE u.usuario_id = $1
        AND u.activo = TRUE
        AND s.activo = TRUE`,
        [usuarioId]
    );

    if (sucursalResult.rowCount === 0) {
        return res.status(403).json({
        ok: false,
        mensaje: 'Usuario o sucursal no disponible'
        });
    }

    const sucursal = sucursalResult.rows[0];

    
    const resultado = await pool.query(
        `SELECT
            'INGREDIENTE' AS tipo,
            i.ingrediente_id AS articulo_id,
            i.codigo,
            i.nombre,
            COALESCE(e.cantidad, 0) AS stock,
            um.abreviatura AS unidad
        FROM core.ingredientes i
        JOIN core.unidades_medida um
        ON um.unidad_id = i.unidad_id
        LEFT JOIN core.existencias_ingredientes e
            ON e.ingrediente_id = i.ingrediente_id
            AND e.sucursal_id = $1
        WHERE i.activo = TRUE

        UNION ALL

        SELECT
            'PRODUCTO_DIRECTO' AS tipo,
            p.producto_id AS articulo_id,
            p.codigo,
            p.nombre,
            COALESCE(ep.cantidad, 0) AS stock,
            'und' AS unidad
        FROM core.productos p
        LEFT JOIN core.existencias_productos ep
            ON ep.producto_id = p.producto_id
            AND ep.sucursal_id = $1
        WHERE p.activo = TRUE
            AND p.tipo_producto = 'DIRECTO'

        ORDER BY tipo, nombre`,
        [sucursal.sucursal_id]
    );

    return res.status(200).json({
        ok: true,
        sucursal,
        total: resultado.rowCount,
        inventario: resultado.rows
    });

    } catch (error) {
    console.error('Error al consultar inventario:', error);

    return res.status(500).json({
        ok: false,
        mensaje: 'Error al consultar inventario'
    });
    }
};

module.exports = { obtenerInventario };
