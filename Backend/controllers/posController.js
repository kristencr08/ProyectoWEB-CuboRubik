const pool = require('../../DB/db');
const { descontarStockVenta } =
  require('../services/inventarioService');

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

  const {
    detalles,
    tipoDocumento = 'FACTURA',
    clienteId = null,
    metodoPago = 'EFECTIVO'
  } = req.body || {};

  // 1. VALIDAR EL PEDIDO

  if (!Array.isArray(detalles) || detalles.length === 0) {
    return res.status(400).json({
      ok: false,
      mensaje: 'El pedido debe contener productos'
    });
  }

  if (detalles.length > 100) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Demasiados productos en el pedido'
    });
  }

  const tipo = String(tipoDocumento).toUpperCase();
  const documento = tipo === 'FACTURA'
    ? 'CONSUMIDOR_FINAL'
    : tipo;

  const metodo = String(metodoPago).toUpperCase();

  if (!['CONSUMIDOR_FINAL', 'CCF'].includes(documento)) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Tipo de documento no válido'
    });
  }

  if (![
    'EFECTIVO', 'TARJETA',
    'BITCOIN', 'CHIVO_WALLET'
  ].includes(metodo)) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Método de pago no válido'
    });
  }

  if (documento === 'CCF' && !clienteId) {
    return res.status(400).json({
      ok: false,
      mensaje: 'El CCF requiere un cliente registrado'
    });
  }

  if (clienteId !== null &&
      (!Number.isSafeInteger(Number(clienteId)) ||
       Number(clienteId) <= 0)) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Cliente inválido'
    });
  }

  // Agrupar productos repetidos
  const cantidades = new Map();

  for (const item of detalles) {

    if (!item || typeof item !== 'object') {
      return res.status(400).json({
        ok: false,
        mensaje: 'Detalle de producto inválido'
      });
    }

    const id = Number(item.producto_id);
    const cantidad = Number(item.cantidad);

    if (!Number.isSafeInteger(id) || id <= 0 ||
        !Number.isSafeInteger(cantidad) ||
        cantidad <= 0 || cantidad > 1000) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Producto o cantidad inválidos'
      });
    }

    const acumulado =
      (cantidades.get(id) || 0) + cantidad;

    if (acumulado > 1000) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Cantidad máxima excedida'
      });
    }

    cantidades.set(id, acumulado);
  }

  // 2. INICIAR LA TRANSACCIÓN
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const usuarioId = req.usuario.id;

    // Buscar sucursal y rol del usuario
    const usuario = await client.query(
      `SELECT u.sucursal_id, r.nombre AS rol
       FROM core.usuarios u
       JOIN core.sucursales s
         ON s.sucursal_id = u.sucursal_id
       JOIN core.roles r
         ON r.rol_id = u.rol_id
       WHERE u.usuario_id = $1
         AND u.activo = TRUE
         AND s.activo = TRUE
         AND r.activo = TRUE`,
      [usuarioId]
    );

    if (usuario.rowCount === 0) {
      throw Object.assign(
        new Error('Usuario no autorizado'),
        { status: 403 }
      );
    }

    const sucursalId = usuario.rows[0].sucursal_id;
    const rol = usuario.rows[0].rol.toUpperCase();

    if (!['ADMINISTRADOR', 'GERENTE', 'CAJERO'].includes(rol)) {
      throw Object.assign(
        new Error('No tienes permisos para vender'),
        { status: 403 }
      );
    }

    // 3. COMPROBAR CAJA ABIERTA
    const turno = await client.query(
      `SELECT t.turno_id
       FROM core.turnos_caja t
       JOIN core.cajas c ON c.caja_id = t.caja_id
       WHERE c.sucursal_id = $1
         AND c.activo = TRUE
         AND t.fecha_cierre IS NULL
         AND t.estado = 'ABIERTO'
       ORDER BY t.fecha_apertura DESC
       LIMIT 1
       FOR UPDATE OF t`,
      [sucursalId]
    );

    if (turno.rowCount === 0) {
      throw Object.assign(
        new Error('No hay un turno de caja abierto'),
        { status: 409 }
      );
    }

    const turnoId = turno.rows[0].turno_id;

    // 4. OBTENER PRODUCTOS Y PRECIOS REALES
    const productos = await client.query(
      `SELECT
          producto_id,
          nombre,
          tipo_producto,
          precio_venta
       FROM core.productos
       WHERE producto_id = ANY($1::BIGINT[])
         AND activo = TRUE`,
      [[...cantidades.keys()]]
    );

    if (productos.rowCount !== cantidades.size) {
      throw Object.assign(
        new Error('Hay productos inexistentes o inactivos'),
        { status: 400 }
      );
    }

    const lineas = productos.rows.map(p => {
      const cantidad = cantidades.get(Number(p.producto_id));
      const centavos = Math.round(Number(p.precio_venta) * 100);

      if (!Number.isSafeInteger(centavos) || centavos < 0) {
        throw Object.assign(
          new Error('Precio de producto inválido'),
          { status: 400 }
        );
      }

      return { ...p, cantidad, centavos };
    });

    // 5. CALCULAR SUBTOTAL E IVA
    const subtotalCentavos = lineas.reduce(
      (total, p) => total + p.centavos * p.cantidad,
      0
    );

    if (!Number.isSafeInteger(subtotalCentavos * 13) ||
        subtotalCentavos <= 0) {
      throw Object.assign(
        new Error('Monto de venta inválido'),
        { status: 400 }
      );
    }

    const ivaCentavos =
      Math.round(subtotalCentavos * 0.13);

    const totalCentavos = subtotalCentavos + ivaCentavos;

    const subtotal = (subtotalCentavos / 100).toFixed(2);
    const iva = (ivaCentavos / 100).toFixed(2);
    const total = (totalCentavos / 100).toFixed(2);

    // Buscar método de pago
    const metodoResult = await client.query(
      `SELECT metodo_pago_id
       FROM core.metodos_pago
       WHERE codigo = $1 AND activo = TRUE`,
      [metodo]
    );

    if (metodoResult.rowCount === 0) {
      throw Object.assign(
        new Error('Método de pago no disponible'),
        { status: 400 }
      );
    }

    // Buscar cliente, cuando corresponda
    let cliente = null;

    if (clienteId !== null) {
      const resultado = await client.query(
        `SELECT cliente_id, nombre, documento, telefono, correo
         FROM core.clientes
         WHERE cliente_id = $1 AND activo = TRUE`,
        [clienteId]
      );

      if (resultado.rowCount === 0) {
        throw Object.assign(
          new Error('Cliente no encontrado'),
          { status: 400 }
        );
      }

      cliente = resultado.rows[0];
    }

    // Bloquear la sucursal durante la numeración
    await client.query(
      `SELECT sucursal_id
       FROM core.sucursales
       WHERE sucursal_id = $1 FOR UPDATE`,
      [sucursalId]
    );

    // 6. REGISTRAR LA VENTA
    const ventaResult = await client.query(
      `INSERT INTO core.ventas
       (turno_id, usuario_id, subtotal,
        porcentaje_iva, iva, total, estado)
       VALUES ($1, $2, $3, 13.00, $4, $5, 'PAGADA')
       RETURNING venta_id`,
      [turnoId, usuarioId, subtotal, iva, total]
    );

    const ventaId = ventaResult.rows[0].venta_id;

    // 7. REGISTRAR LOS PRODUCTOS VENDIDOS
    for (const p of lineas) {

      const subtotalLinea =
        ((p.centavos * p.cantidad) / 100).toFixed(2);

      await client.query(
        `INSERT INTO core.detalle_ventas
         (venta_id, producto_id, cantidad,
          precio_unitario, subtotal_linea)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          ventaId,
          p.producto_id,
          p.cantidad,
          p.precio_venta,
          subtotalLinea
        ]
      );
    }

    // 8. DESCONTAR AUTOMÁTICAMENTE EL INVENTARIO
    const movimientos = await descontarStockVenta(
      client,
      {
        sucursalId,
        usuarioId,
        ventaId,
        detalles: lineas
      }
    );

    // 9. REGISTRAR EL PAGO
    await client.query(
      `INSERT INTO core.pagos
       (venta_id, metodo_pago_id, monto, referencia)
       VALUES ($1, $2, $3, $4)`,
      [
        ventaId,
        metodoResult.rows[0].metodo_pago_id,
        total,
        `POS-${ventaId}`
      ]
    );

    // 10. GENERAR CORRELATIVO DE FACTURA
    const serie = documento === 'CCF'
      ? `CCF-${sucursalId}`
      : `CF-${sucursalId}`;

    const correlativoResult = await client.query(
      `SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente
       FROM core.facturas
       WHERE sucursal_id = $1
         AND tipo_documento = $2
         AND serie = $3`,
      [sucursalId, documento, serie]
    );

    const numero = correlativoResult.rows[0].siguiente;

    // 11. REGISTRAR FACTURA
    const facturaResult = await client.query(
      `INSERT INTO core.facturas
       (
         venta_id, sucursal_id, cliente_id,
         tipo_documento, serie, numero,
         cliente_nombre, cliente_documento,
         cliente_telefono, cliente_correo,
         subtotal, porcentaje_iva, iva, total
       )
       VALUES
       ($1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, 13.00, $12, $13)
       RETURNING factura_id`,
      [
        ventaId,
        sucursalId,
        cliente ? cliente.cliente_id : null,
        documento,
        serie,
        numero,
        cliente ? cliente.nombre : 'Consumidor final',
        cliente ? cliente.documento : null,
        cliente ? cliente.telefono : null,
        cliente ? cliente.correo : null,
        subtotal,
        iva,
        total
      ]
    );

    // 12. CONFIRMAR TODO
    await client.query('COMMIT');

    return res.status(201).json({
      ok: true,
      mensaje: 'Venta registrada e inventario actualizado',
      pedido_id: ventaId,
      venta_id: ventaId,
      factura_id: facturaResult.rows[0].factura_id,
      movimientos,
      facturacion: {
        tipoDocumento: documento,
        serie,
        numero,
        subtotal,
        iva,
        total
      }
    });

  } catch (error) {

    // Si ocurre un error, revertir todos los cambios
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }

    console.error('Error al crear pedido:', error);

    return res.status(error.status || 500).json({
      ok: false,
      mensaje: error.status
        ? error.message
        : 'Error al procesar el pedido'
    });

  } finally {

    // Liberar la conexión a PostgreSQL
    if (client) client.release();
  }
};

module.exports = {
  obtenerProductos,
  crearPedido
};