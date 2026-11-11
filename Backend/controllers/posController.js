const pool = require('../../DB/db');

const obtenerProductos = async (req, res) => {
  try {
    const query = `
      SELECT p.*, c.nombre AS categoria
      FROM core.productos p
      LEFT JOIN core.categorias c ON p.categoria_id = c.categoria_id
      WHERE p.activo = true;
    `;
    const result = await pool.query(query);
    return res.status(200).json({ ok: true, productos: result.rows });
  } catch (error) {
    return res.status(500).json({ ok: false, mensaje: 'Error al cargar los productos' });
  }
};

const crearPedido = async (req, res) => {
  try {
    const { tipoPedido, tipoDocumento, mesa_id, detalles } = req.body;
    const usuario_id = req.usuario ? req.usuario.id : 1;

    let subtotalSinIva = 0;
    if (Array.isArray(detalles)) {
      subtotalSinIva = detalles.reduce((acc, item) => acc + (item.cantidad * item.precio_unitario), 0);
    }

    const iva13 = parseFloat((subtotalSinIva * 0.13).toFixed(2));
    const totalConIva = parseFloat((subtotalSinIva + iva13).toFixed(2));

    const docTipo = (tipoDocumento || 'FACTURA').toUpperCase();
    const correlativo = `${docTipo.substring(0, 3)}-${Date.now().toString().slice(-6)}`;

    return res.status(201).json({
      ok: true,
      mensaje: 'Pedido y facturacion procesados correctamente',
      pedido_id: Date.now(),
      usuario_id: usuario_id,
      tipoPedido: tipoPedido || 'comedor',
      facturacion: {
        tipoDocumento: docTipo,
        correlativo: correlativo,
        subtotal: parseFloat(subtotalSinIva.toFixed(2)),
        iva: iva13,
        total: totalConIva
      }
    });
  } catch (error) {
    return res.status(500).json({ ok: false, mensaje: 'Error al procesar el pedido' });
  }
};

module.exports = {
  obtenerProductos,
  crearPedido
};