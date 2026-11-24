const pool = require('../../DB/db');
const { obtenerSucursalUsuario } = require('./contextoService');


// UTILIDADES
const revertirTransaccion = async (client) => {
  await client.query('ROLLBACK').catch(() => {});
};

const validarUsuarioActivo = async (client, usuarioId, sucursalId, rolesPermitidos) => {
  const resultado = await client.query(
    `SELECT u.usuario_id, u.sucursal_id, r.nombre AS rol
     FROM core.usuarios u
     INNER JOIN core.roles r ON r.rol_id = u.rol_id
     WHERE u.usuario_id = $1
       AND u.sucursal_id = $2
       AND u.activo = TRUE
       AND r.activo = TRUE
       AND UPPER(r.nombre) = ANY($3::TEXT[])
     FOR SHARE OF u`,
    [usuarioId, sucursalId, rolesPermitidos]
  );
  return resultado.rows[0] || null;
};

const obtenerContextoCaja = async (usuarioId) => {
  const sucursal = await obtenerSucursalUsuario(pool, usuarioId);
  const [cajas, cajeros, turnos] = await Promise.all([
    pool.query(
      `SELECT caja_id, nombre
       FROM core.cajas
       WHERE sucursal_id = $1
         AND activo = TRUE
       LIMIT 1`,
      [sucursal.sucursal_id]
    ),
    pool.query(
      `SELECT u.usuario_id, u.nombre
       FROM core.usuarios u
       JOIN core.roles r
         ON r.rol_id = u.rol_id
       WHERE u.sucursal_id = $1
         AND u.activo = TRUE
         AND r.activo = TRUE
         AND r.nombre = 'CAJERO'
       ORDER BY u.nombre`,
      [sucursal.sucursal_id]
    ),
    pool.query(
      `SELECT
         t.turno_id,
         t.estado,
         t.tipo_turno,
         t.efectivo_contado,
         t.tarjeta_contada,
         t.bitcoin_contado,
         t.chivo_wallet_contado,
         COALESCE(cajero.nombre, apertura.nombre) AS cajero
       FROM core.turnos_caja t
       JOIN core.cajas c
         ON c.caja_id = t.caja_id
       LEFT JOIN core.usuarios cajero
         ON cajero.usuario_id = t.cajero_id
       JOIN core.usuarios apertura
         ON apertura.usuario_id = t.usuario_apertura
       WHERE c.sucursal_id = $1
         AND c.activo = TRUE
         AND t.estado IN ('ABIERTO', 'PENDIENTE_CIERRE')
       ORDER BY t.fecha_apertura DESC`,
      [sucursal.sucursal_id]
    )
  ]);

  return {
    sucursal: {
      id: Number(sucursal.sucursal_id),
      nombre: sucursal.nombre
    },
    caja: cajas.rows[0] || null,
    cajeros: cajeros.rows,
    turnos: turnos.rows
  };
};



// 1. ABRIR CAJA Y ASIGNAR CAJERO
    const abrirCaja = async ({
      cajaId,
      usuarioId,
      cajeroId,
      tipoTurno,
      montoInicial
    }) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Bloquear y comprobar la caja.
        const caja = await client.query(
          `SELECT caja_id, sucursal_id
          FROM core.cajas
          WHERE caja_id = $1
            AND activo = TRUE
          FOR UPDATE`,
          [cajaId]
        );
        if (caja.rowCount === 0) {
          throw new Error('La caja no existe o está inactiva.');
        }
        const sucursalId = caja.rows[0].sucursal_id;

        // El usuario que abre debe ser administrador o gerente.
        const administrador = await validarUsuarioActivo(
          client,
          usuarioId,
          sucursalId,
          ['ADMINISTRADOR', 'GERENTE']
        );
        if (!administrador) {
          throw new Error(
            'No tienes permisos para abrir cajas en esta sucursal.'
          );
        }

        // El cajero debe estar activo y pertenecer a la misma sucursal.
        const cajero = await validarUsuarioActivo(
          client,
          cajeroId,
          sucursalId,
          ['CAJERO']
        );
        if (!cajero) {
          throw new Error(
            'El cajero no existe, está inactivo o no pertenece a esta sucursal.'
          );
        }

        // Comprobar que no exista un turno sin cierre autorizado.
        const turnoAbierto = await client.query(
          `SELECT turno_id, estado
          FROM core.turnos_caja
          WHERE caja_id = $1
            AND fecha_cierre IS NULL
          FOR UPDATE`,
          [cajaId]
        );
        if (turnoAbierto.rowCount > 0) {
          throw new Error(
            'Esta caja ya tiene un turno abierto o pendiente de autorización.'
          );
        }

        // Registrar la apertura y asignación.
        const resultado = await client.query(
          `INSERT INTO core.turnos_caja (
            caja_id,
            usuario_apertura,
            cajero_id,
            tipo_turno,
            monto_inicial,
            estado
          )
          VALUES ($1, $2, $3, $4, $5, 'ABIERTO')
          RETURNING *`,
          [cajaId, usuarioId, cajeroId, tipoTurno, montoInicial]
        );
        await client.query('COMMIT');
        return resultado.rows[0];
      } catch (error) {
        await revertirTransaccion(client);
        if (error.code === '23505') {
          throw new Error('Ya existe un turno activo para esta caja.');
        }
        throw error;
      } finally {
        client.release();
      }
    };



// 2. REGISTRAR MOVIMIENTO DE CAJA
    const registrarMovimiento = async ({
      turnoId,
      usuarioId,
      tipo,
      monto,
      descripcion
    }) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Bloquear el turno y comprobar que siga abierto.
        const turno = await client.query(
          `SELECT turno_id, cajero_id, estado
          FROM core.turnos_caja
          WHERE turno_id = $1
          FOR UPDATE`,
          [turnoId]
        );
        if (turno.rowCount === 0) {
          throw new Error('El turno indicado no existe.');
        }

        const datosTurno = turno.rows[0];
        if (datosTurno.estado !== 'ABIERTO') {
          throw new Error(
            'Solo se permiten movimientos en turnos abiertos.'
          );
        }
        // Solo el cajero asignado puede registrar movimientos.
        if (String(datosTurno.cajero_id) !== String(usuarioId)) {
          throw new Error(
            'No puedes registrar movimientos en un turno asignado a otro cajero.'
          );
        }

        const resultado = await client.query(
          `INSERT INTO core.movimientos_caja (
            turno_id,
            usuario_id,
            tipo,
            monto,
            descripcion
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *`,
          [turnoId, usuarioId, tipo, monto, descripcion.trim()]
        );
        await client.query('COMMIT');
        return resultado.rows[0];
      } catch (error) {
        await revertirTransaccion(client);
        throw error;
      } finally {
        client.release();
      }
    };



// 3. SOLICITAR CIERRE DE CAJA
    const solicitarCierreCaja = async ({
      turnoId,
      usuarioId,
      efectivoContado,
      tarjetaContada,
      bitcoinContado,
      chivoWalletContado
    }) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const turno = await client.query(
          `SELECT turno_id, cajero_id, estado
          FROM core.turnos_caja
          WHERE turno_id = $1
          FOR UPDATE`,
          [turnoId]
        );
        if (turno.rowCount === 0) {
          throw new Error('El turno indicado no existe.');
        }

        const datosTurno = turno.rows[0];
        if (datosTurno.estado !== 'ABIERTO') {
          throw new Error(
            'El turno no está abierto o ya tiene una solicitud de cierre.'
          );
        }
        // Solo el cajero asignado puede solicitar el cierre.
        if (String(datosTurno.cajero_id) !== String(usuarioId)) {
          throw new Error(
            'Solo el cajero asignado puede solicitar el cierre.'
          );
        }

        const resultado = await client.query(
          `UPDATE core.turnos_caja
          SET
            estado = 'PENDIENTE_CIERRE',
            usuario_solicita_cierre = $1,
            fecha_solicitud_cierre = CURRENT_TIMESTAMP,
            efectivo_contado = $2,
            tarjeta_contada = $3,
            bitcoin_contado = $4,
            chivo_wallet_contado = $5
          WHERE turno_id = $6
          RETURNING *`,
          [
            usuarioId,
            efectivoContado,
            tarjetaContada,
            bitcoinContado,
            chivoWalletContado,
            turnoId
          ]
        );
        await client.query('COMMIT');
        return resultado.rows[0];
      } catch (error) {
        await revertirTransaccion(client);
        throw error;
      } finally {
        client.release();
      }
    };



// 4. AUTORIZAR CIERRE DE CAJA
const autorizarCierreCaja = async ({
  turnoId,
  usuarioAutorizacion
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Bloquear el turno pendiente.
    const turno = await client.query(
      `SELECT
         t.turno_id,
         t.caja_id,
         t.cajero_id,
         t.usuario_solicita_cierre,
         t.monto_inicial,
         t.efectivo_contado,
         t.tarjeta_contada,
         t.bitcoin_contado,
         t.chivo_wallet_contado,
         t.estado,
         c.sucursal_id
       FROM core.turnos_caja t
       INNER JOIN core.cajas c
         ON c.caja_id = t.caja_id
       WHERE t.turno_id = $1
       FOR UPDATE OF t`,
      [turnoId]
    );
    if (turno.rowCount === 0) {
      throw new Error('El turno indicado no existe.');
    }

    const datosTurno = turno.rows[0];
    if (datosTurno.estado !== 'PENDIENTE_CIERRE') {
      throw new Error(
        'El turno no tiene una solicitud de cierre pendiente.'
      );
    }

    // El administrador o gerente debe pertenecer a la sucursal.
    const autorizador = await validarUsuarioActivo(
      client,
      usuarioAutorizacion,
      datosTurno.sucursal_id,
      ['ADMINISTRADOR', 'GERENTE']
    );
    if (!autorizador) {
      throw new Error(
        'No tienes permisos para autorizar cierres en esta sucursal.'
      );
    }
    // El cajero no puede autorizar su propia solicitud.
    if (
      String(datosTurno.usuario_solicita_cierre) ===
      String(usuarioAutorizacion)
    ) {
      throw new Error(
        'No puedes autorizar tu propia solicitud de cierre.'
      );
    }


    // CALCULAR EFECTIVO ESPERADO---------------------------
    const movimientos = await client.query(
      `SELECT
         COALESCE(
           SUM(CASE WHEN tipo = 'INGRESO' THEN monto ELSE 0 END),
           0
         ) AS ingresos,
         COALESCE(
           SUM(CASE WHEN tipo = 'EGRESO' THEN monto ELSE 0 END),
           0
         ) AS egresos
       FROM core.movimientos_caja
       WHERE turno_id = $1`,
      [turnoId]
    );
    const ingresos = Number(movimientos.rows[0].ingresos);
    const egresos = Number(movimientos.rows[0].egresos);
    const efectivoEsperado = Number(
      (
        Number(datosTurno.monto_inicial) +
        ingresos -
        egresos
      ).toFixed(2)
    );


    // CALCULAR PAGOS ELECTRÓNICOS NETOS---------------------------
    const pagos = await client.query(
      `SELECT
         mp.codigo,
         COALESCE(
           SUM(
             p.monto - COALESCE(dev.total_devuelto, 0)
           ),
           0
         ) AS monto_esperado
       FROM core.ventas v
       INNER JOIN core.pagos p
         ON p.venta_id = v.venta_id
       INNER JOIN core.metodos_pago mp
         ON mp.metodo_pago_id = p.metodo_pago_id
       LEFT JOIN LATERAL (
         SELECT SUM(dp.monto) AS total_devuelto
         FROM core.devoluciones_pagos dp
         INNER JOIN core.devoluciones d
           ON d.devolucion_id = dp.devolucion_id
         WHERE dp.pago_id = p.pago_id
           AND d.estado = 'PROCESADA'
       ) dev ON TRUE
       WHERE v.turno_id = $1
         AND v.estado = 'PAGADA'
         AND mp.codigo IN ('TARJETA', 'BITCOIN', 'CHIVO_WALLET')
       GROUP BY mp.codigo`,
      [turnoId]
    );

    const montosEsperados = {
      TARJETA: 0,
      BITCOIN: 0,
      CHIVO_WALLET: 0
    };
    for (const pago of pagos.rows) {
      montosEsperados[pago.codigo] =
        Number(Number(pago.monto_esperado).toFixed(2));
    }
    const tarjetaEsperada = montosEsperados.TARJETA;
    const bitcoinEsperado = montosEsperados.BITCOIN;
    const chivoWalletEsperado = montosEsperados.CHIVO_WALLET;

    
    // CALCULAR DIFERENCIAS---------------------------
    const diferencias = {
      efectivo: Number(
        (Number(datosTurno.efectivo_contado) - efectivoEsperado).toFixed(2)
      ),
      tarjeta: Number(
        (Number(datosTurno.tarjeta_contada) - tarjetaEsperada).toFixed(2)
      ),
      bitcoin: Number(
        (Number(datosTurno.bitcoin_contado) - bitcoinEsperado).toFixed(2)
      ),
      chivoWallet: Number(
        (Number(datosTurno.chivo_wallet_contado) - chivoWalletEsperado).toFixed(2)
      )
    };

    
    // AUTORIZAR Y CERRAR DEFINITIVAMENTE---------------------------
    const resultado = await client.query(
      `UPDATE core.turnos_caja
       SET
         estado = 'CERRADO',
         usuario_cierre = $1,
         fecha_cierre = CURRENT_TIMESTAMP,
         monto_efectivo_esperado = $2,
         monto_contado = efectivo_contado,
         tarjeta_esperada = $3,
         bitcoin_esperado = $4,
         chivo_wallet_esperado = $5
       WHERE turno_id = $6
       RETURNING *`,
      [
        usuarioAutorizacion,
        efectivoEsperado,
        tarjetaEsperada,
        bitcoinEsperado,
        chivoWalletEsperado,
        turnoId
      ]
    );
    await client.query('COMMIT');
    return {
      cierre: resultado.rows[0],
      resumen: {
        ingresosEfectivo: ingresos,
        egresosEfectivo: egresos,
        efectivoEsperado,
        efectivoContado: Number(datosTurno.efectivo_contado),
        tarjetaEsperada,
        tarjetaContada: Number(datosTurno.tarjeta_contada),
        bitcoinEsperado,
        bitcoinContado: Number(datosTurno.bitcoin_contado),
        chivoWalletEsperado,
        chivoWalletContado: Number(datosTurno.chivo_wallet_contado),
        diferencias
      }
    };
  } catch (error) {
    await revertirTransaccion(client);
    throw error;
  } finally {
    client.release();
  }
};


// EXPORTAR FUNCIONES
module.exports = {
  obtenerContextoCaja,
  abrirCaja,
  registrarMovimiento,
  solicitarCierreCaja,
  autorizarCierreCaja
};
