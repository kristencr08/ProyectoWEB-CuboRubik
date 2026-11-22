const pool = require('../../DB/db');

const TIPOS = { FACTURA: 'CONSUMIDOR_FINAL', CONSUMIDOR_FINAL: 'CONSUMIDOR_FINAL', CCF: 'CCF' };

// Rol y sucursal del usuario que hace la consulta.
const obtenerContexto = async (usuarioId) => {
  const r = await pool.query(
    `SELECT u.sucursal_id, r.nombre AS rol
     FROM core.usuarios u
     JOIN core.roles r ON r.rol_id = u.rol_id
     WHERE u.usuario_id = $1 AND u.activo = TRUE`,
    [usuarioId]
  );
  return r.rowCount ? r.rows[0] : null;
};

// GET /api/facturas
const listarFacturas = async (req, res) => {
  try {
    const ctx = await obtenerContexto(req.usuario.id);
    if (!ctx) return res.status(403).json({ ok: false, mensaje: 'Usuario no disponible' });

    const where = [];
    const params = [];

    if (ctx.rol !== 'ADMINISTRADOR') {
      params.push(ctx.sucursal_id);
      where.push(`f.sucursal_id = $${params.length}`);
    }

    if (req.query.tipo) {
      const tipo = TIPOS[String(req.query.tipo).toUpperCase()];
      if (!tipo) return res.status(400).json({ ok: false, mensaje: 'Tipo de documento no válido' });
      params.push(tipo);
      where.push(`f.tipo_documento = $${params.length}`);
    }

    const resultado = await pool.query(
      `SELECT f.factura_id, f.tipo_documento, f.serie, f.numero, f.fecha_emision,
              f.cliente_nombre, f.cliente_documento,
              f.subtotal, f.iva, f.total, f.estado,
              s.nombre AS sucursal
       FROM core.facturas f
       JOIN core.sucursales s ON s.sucursal_id = f.sucursal_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY f.fecha_emision DESC, f.factura_id DESC
       LIMIT 200`,
      params
    );

    return res.json({ ok: true, facturas: resultado.rows });
  } catch (error) {
    console.error('Error al listar facturas:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error al cargar las facturas' });
  }
};

// GET /api/facturas/:id  (encabezado + productos + pagos)
const obtenerFactura = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, mensaje: 'Factura inválida' });
  }

  try {
    const ctx = await obtenerContexto(req.usuario.id);
    if (!ctx) return res.status(403).json({ ok: false, mensaje: 'Usuario no disponible' });

    const params = [id];
    let filtroSucursal = '';
    if (ctx.rol !== 'ADMINISTRADOR') {
      params.push(ctx.sucursal_id);
      filtroSucursal = 'AND f.sucursal_id = $2';
    }

    const cabecera = await pool.query(
      `SELECT f.factura_id, f.venta_id, f.tipo_documento, f.serie, f.numero, f.fecha_emision,
              f.cliente_nombre, f.cliente_documento, f.cliente_telefono, f.cliente_correo,
              f.subtotal, f.porcentaje_iva, f.iva, f.total, f.estado,
              s.nombre AS sucursal
       FROM core.facturas f
       JOIN core.sucursales s ON s.sucursal_id = f.sucursal_id
       WHERE f.factura_id = $1 ${filtroSucursal}`,
      params
    );

    if (cabecera.rowCount === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Factura no encontrada' });
    }

    const factura = cabecera.rows[0];

    const detalles = await pool.query(
      `SELECT p.nombre AS producto, d.cantidad, d.precio_unitario, d.subtotal_linea
       FROM core.detalle_ventas d
       JOIN core.productos p ON p.producto_id = d.producto_id
       WHERE d.venta_id = $1
       ORDER BY d.detalle_venta_id`,
      [factura.venta_id]
    );

    const pagos = await pool.query(
      `SELECT m.nombre AS metodo, pg.monto
       FROM core.pagos pg
       JOIN core.metodos_pago m ON m.metodo_pago_id = pg.metodo_pago_id
       WHERE pg.venta_id = $1`,
      [factura.venta_id]
    );

    return res.json({
      ok: true,
      factura,
      detalles: detalles.rows,
      pagos: pagos.rows
    });
  } catch (error) {
    console.error('Error al obtener la factura:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error al cargar la factura' });
  }
};

module.exports = { listarFacturas, obtenerFactura };
