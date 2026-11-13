const pool = require('../../DB/db');

const abrirCaja = async ({
  cajaId,
  usuarioId,
  montoInicial
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Comprobar que la caja existe y está activa.
    const caja = await client.query(
      `SELECT caja_id
       FROM core.cajas
       WHERE caja_id = $1
       AND activo = TRUE
       FOR UPDATE`,
      [cajaId]
    );
    if (caja.rowCount === 0) {
      throw new Error('La caja no existe o está inactiva.');
    }

    // Comprobar que no exista un turno abierto.
    const turnoAbierto = await client.query(
      `SELECT turno_id
       FROM core.turnos_caja
       WHERE caja_id = $1
       AND fecha_cierre IS NULL`,
      [cajaId]
    );
    if (turnoAbierto.rowCount > 0) {
      throw new Error('Esta caja ya tiene un turno abierto.');
    }

    // Registrar la apertura.
    const resultado = await client.query(
      `INSERT INTO core.turnos_caja (
        caja_id,
        usuario_apertura,
        monto_inicial
      )
      VALUES ($1, $2, $3)
      RETURNING *`,
      [cajaId, usuarioId, montoInicial]
    );
    await client.query('COMMIT');
    return resultado.rows[0];

  } catch (error) {

    await client.query('ROLLBACK');
    if (error.code === '23505') {
      throw new Error('Ya existe un turno abierto para esta caja.');
    }
    throw error;
  } finally {
    client.release();
  }
};


//REGISTRAR MOVIMIENTO DE CAJA
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

    // Verificar que el turno exista y siga abierto.
    const turno = await client.query(
      `SELECT turno_id
       FROM core.turnos_caja
       WHERE turno_id = $1
       AND fecha_cierre IS NULL
       FOR UPDATE`,
      [turnoId]
    );
    if (turno.rowCount === 0) {
      throw new Error('El turno no existe o ya está cerrado.');
    }

    // Registrar el movimiento.
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
      [
        turnoId,
        usuarioId,
        tipo,
        monto,
        descripcion.trim()
      ]
    );
    await client.query('COMMIT');
    return resultado.rows[0];

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};


//CERRAR CAJA
const cerrarCaja = async ({
  turnoId,
  usuarioCierre,
  montoContado
}) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Buscar el turno y bloquearlo durante el cierre.
    const turno = await client.query(
      `SELECT turno_id, monto_inicial
       FROM core.turnos_caja
       WHERE turno_id = $1
       AND fecha_cierre IS NULL
       FOR UPDATE`,
      [turnoId]
    );
    if (turno.rowCount === 0) {
      throw new Error('El turno no existe o ya fue cerrado.');
    }

    // Calcular los ingresos y egresos.
    const movimientos = await client.query(
      `SELECT
        COALESCE(
          SUM(CASE
            WHEN tipo = 'INGRESO' THEN monto
            ELSE 0
          END), 0
        ) AS ingresos,

        COALESCE(
          SUM(CASE
            WHEN tipo = 'EGRESO' THEN monto
            ELSE 0
          END), 0
        ) AS egresos

       FROM core.movimientos_caja
       WHERE turno_id = $1`,
      [turnoId]
    );

    // Calcular el efectivo esperado.
    const calculo = await client.query(
      `SELECT ROUND(
        $1::NUMERIC + $2::NUMERIC - $3::NUMERIC,
        2
      ) AS efectivo_esperado`,
      [
        turno.rows[0].monto_inicial,
        movimientos.rows[0].ingresos,
        movimientos.rows[0].egresos
      ]
    );

    const efectivoEsperado =
      calculo.rows[0].efectivo_esperado;

    // Guardar el cierre.
    const resultado = await client.query(
      `UPDATE core.turnos_caja
       SET
         usuario_cierre = $1,
         fecha_cierre = CURRENT_TIMESTAMP,
         monto_efectivo_esperado = $2,
         monto_contado = $3
       WHERE turno_id = $4
       RETURNING *`,
      [
        usuarioCierre,
        efectivoEsperado,
        montoContado,
        turnoId
      ]
    );

    // Calcular diferencia entre efectivo real y esperado.
    const diferencia = await client.query(
      `SELECT ROUND(
        $1::NUMERIC - $2::NUMERIC,
        2
      ) AS diferencia`,
      [montoContado, efectivoEsperado]
    );
    await client.query('COMMIT');
    return {
      cierre: resultado.rows[0],
      resumen: {
        ingresos: movimientos.rows[0].ingresos,
        egresos: movimientos.rows[0].egresos,
        efectivoEsperado,
        efectivoContado: montoContado,
        diferencia: diferencia.rows[0].diferencia
      }
    };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};


// EXPORTAR FUNCIONES
module.exports = {
  abrirCaja,
  registrarMovimiento,
  cerrarCaja
};
