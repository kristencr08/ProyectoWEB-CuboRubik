// SERVICIO DE CUENTAS POR PAGAR
// Cada compra recibida genera una cuenta con saldo = total de la compra.
// Los pagos (abonos) reducen el saldo; al llegar a 0 la cuenta queda PAGADA.

const pool = require('../../DB/db');
const { crearError } = require('../utils/errores');
const { aCentavos, centavosATexto } = require('../utils/numeros');

// ---------------------------------------------------------
// 1. LISTAR CUENTAS
// ---------------------------------------------------------
const listarCuentas = async (
  sucursalId, { estado, proveedorId, soloVencidas, limite }
) => {
  const condiciones = ['cx.sucursal_id = $1'];
  const valores = [sucursalId];

  if (estado) {
    valores.push(estado);
    condiciones.push(`cx.estado = $${valores.length}`);
  }

  if (proveedorId) {
    valores.push(proveedorId);
    condiciones.push(`cx.proveedor_id = $${valores.length}`);
  }

  if (soloVencidas) {
    condiciones.push('cx.saldo > 0 AND cx.fecha_vencimiento < CURRENT_DATE');
  }

  valores.push(limite);

  const resultado = await pool.query(
    `SELECT cx.cxp_id, cx.compra_id, c.numero_documento,
            p.nombre AS proveedor,
            cx.monto_total, cx.saldo,
            cx.fecha_emision, cx.fecha_vencimiento, cx.estado,
            (cx.saldo > 0 AND cx.fecha_vencimiento < CURRENT_DATE) AS vencida,
            (cx.fecha_vencimiento - CURRENT_DATE) AS dias_para_vencer
     FROM core.cuentas_por_pagar cx
     JOIN core.compras c ON c.compra_id = cx.compra_id
     JOIN core.proveedores p ON p.proveedor_id = cx.proveedor_id
     WHERE ${condiciones.join(' AND ')}
     ORDER BY cx.fecha_vencimiento, cx.cxp_id
     LIMIT $${valores.length}`,
    valores
  );

  return resultado.rows;
};

// ---------------------------------------------------------
// 2. RESUMEN (totales para el panel)
// ---------------------------------------------------------
const obtenerResumen = async (sucursalId) => {
  const totales = await pool.query(
    `SELECT
        COALESCE(SUM(saldo), 0) AS total_pendiente,
        COALESCE(SUM(saldo) FILTER (
            WHERE fecha_vencimiento < CURRENT_DATE), 0) AS total_vencido,
        COALESCE(SUM(saldo) FILTER (
            WHERE fecha_vencimiento BETWEEN CURRENT_DATE
                  AND CURRENT_DATE + 7), 0) AS por_vencer_7_dias,
        COUNT(*) AS cuentas_abiertas
     FROM core.cuentas_por_pagar
     WHERE sucursal_id = $1
       AND saldo > 0`,
    [sucursalId]
  );

  const porProveedor = await pool.query(
    `SELECT p.proveedor_id, p.nombre AS proveedor,
            SUM(cx.saldo) AS saldo, COUNT(*) AS cuentas
     FROM core.cuentas_por_pagar cx
     JOIN core.proveedores p ON p.proveedor_id = cx.proveedor_id
     WHERE cx.sucursal_id = $1
       AND cx.saldo > 0
     GROUP BY p.proveedor_id, p.nombre
     ORDER BY saldo DESC`,
    [sucursalId]
  );

  return { ...totales.rows[0], por_proveedor: porProveedor.rows };
};

// ---------------------------------------------------------
// 3. DETALLE DE UNA CUENTA (con sus pagos)
// ---------------------------------------------------------
const obtenerCuenta = async (cxpId, sucursalId) => {
  const cuenta = await pool.query(
    `SELECT cx.cxp_id, cx.compra_id, c.numero_documento,
            p.nombre AS proveedor, cx.monto_total, cx.saldo,
            cx.fecha_emision, cx.fecha_vencimiento, cx.estado,
            (cx.saldo > 0 AND cx.fecha_vencimiento < CURRENT_DATE) AS vencida
     FROM core.cuentas_por_pagar cx
     JOIN core.compras c ON c.compra_id = cx.compra_id
     JOIN core.proveedores p ON p.proveedor_id = cx.proveedor_id
     WHERE cx.cxp_id = $1
       AND cx.sucursal_id = $2`,
    [cxpId, sucursalId]
  );

  if (cuenta.rowCount === 0) {
    throw crearError(404, 'Cuenta por pagar no encontrada');
  }

  const pagos = await pool.query(
    `SELECT pg.pago_id, pg.fecha, pg.monto, pg.metodo_pago,
            pg.referencia, u.nombre AS usuario
     FROM core.pagos_proveedores pg
     JOIN core.usuarios u ON u.usuario_id = pg.usuario_id
     WHERE pg.cxp_id = $1
     ORDER BY pg.fecha, pg.pago_id`,
    [cxpId]
  );

  return { ...cuenta.rows[0], pagos: pagos.rows };
};

// ---------------------------------------------------------
// 4. REGISTRAR PAGO (abono total o parcial)
// ---------------------------------------------------------
const registrarPago = async ({
  cxpId, sucursalId, usuarioId, monto, metodoPago, referencia = null
}) => {
  const montoCentavos = aCentavos(monto, 'El monto');

  if (montoCentavos <= 0) {
    throw crearError(400, 'El monto debe ser mayor que 0');
  }

  const montoTexto = centavosATexto(montoCentavos);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Bloquea la cuenta: dos pagos simultáneos no pueden dejar saldo negativo
    const resultado = await client.query(
      `SELECT sucursal_id, saldo, estado
       FROM core.cuentas_por_pagar
       WHERE cxp_id = $1
       FOR UPDATE`,
      [cxpId]
    );

    if (resultado.rowCount === 0) {
      throw crearError(404, 'Cuenta por pagar no encontrada');
    }

    const cuenta = resultado.rows[0];

    if (String(cuenta.sucursal_id) !== String(sucursalId)) {
      throw crearError(403, 'La cuenta pertenece a otra sucursal');
    }

    if (cuenta.estado === 'PAGADA') {
      throw crearError(409, 'La cuenta ya está pagada');
    }

    const saldoCentavos = Math.round(Number(cuenta.saldo) * 100);

    if (montoCentavos > saldoCentavos) {
      throw crearError(
        409,
        `El monto excede el saldo pendiente ($${centavosATexto(saldoCentavos)})`
      );
    }

    const pago = await client.query(
      `INSERT INTO core.pagos_proveedores
          (cxp_id, usuario_id, monto, metodo_pago, referencia)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING pago_id, monto, metodo_pago, referencia, fecha`,
      [cxpId, usuarioId, montoTexto, metodoPago, referencia]
    );

    // En un UPDATE, "saldo" dentro de SET y CASE es siempre el valor ANTERIOR
    const actualizada = await client.query(
      `UPDATE core.cuentas_por_pagar
       SET saldo = saldo - $2::NUMERIC,
           estado = CASE
               WHEN saldo - $2::NUMERIC = 0 THEN 'PAGADA'
               ELSE 'PARCIAL'
           END
       WHERE cxp_id = $1
       RETURNING cxp_id, monto_total, saldo, estado`,
      [cxpId, montoTexto]
    );

    await client.query('COMMIT');

    return { pago: pago.rows[0], cuenta: actualizada.rows[0] };

  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  listarCuentas,
  obtenerResumen,
  obtenerCuenta,
  registrarPago
};
