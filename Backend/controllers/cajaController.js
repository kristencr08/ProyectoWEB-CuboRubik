const pool = require('../../DB/db');

const {
  abrirCaja,
  registrarMovimiento,
  cerrarCaja
} = require('../services/cajaService');

const {
  validarAperturaCaja,
  validarMovimientoCaja,
  validarCierreCaja
} = require('../validators/cajaValidation');


// ABRIR CAJA
const aperturaCaja = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const datos = {
      cajaId: req.body.cajaId,
      turno: req.body.turno,
      montoInicial: req.body.montoInicial
    };

    // Validar los datos recibidos.
    const validacion = validarAperturaCaja(datos);
    if (!validacion.valido) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Los datos de apertura no son válidos.',
        errores: validacion.errores
      });
    }

    // Ejecutar la apertura.
    const resultado = await abrirCaja({
      cajaId: datos.cajaId,
      usuarioId,
      montoInicial: datos.montoInicial
    });
    return res.status(201).json({
      ok: true,
      mensaje: 'Caja abierta correctamente.',
      turno: resultado
    });

  } catch (error) {
    console.error('Error al abrir caja:', error.message);
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
};


// REGISTRAR MOVIMIENTO

const movimientoCaja = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const datos = {
      tipo: req.body.tipo,
      monto: req.body.monto,
      descripcion: req.body.descripcion
    };

    // Validar los datos del movimiento.
    const validacion = validarMovimientoCaja(datos);
    if (!validacion.valido) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Los datos del movimiento no son válidos.',
        errores: validacion.errores
      });
    }

    // Ejecutar el movimiento.
    const resultado = await registrarMovimiento({
      turnoId: req.params.turnoId,
      usuarioId,
      tipo: datos.tipo,
      monto: datos.monto,
      descripcion: datos.descripcion
    });
    return res.status(201).json({
      ok: true,
      mensaje: 'Movimiento registrado correctamente.',
      movimiento: resultado
    });

  } catch (error) {
    console.error('Error al registrar movimiento:', error.message);
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
};


// VERIFICAR PERMISOS
const verificarPermisoCierre = async (usuarioId) => {
  const resultado = await pool.query(
    `SELECT r.nombre AS rol
     FROM core.usuarios u
     INNER JOIN core.roles r
       ON u.rol_id = r.rol_id
     WHERE u.usuario_id = $1
       AND u.activo = TRUE
       AND r.activo = TRUE`,
    [usuarioId]
  );

  if (resultado.rowCount === 0) {
    return false;
  }
  const rol = resultado.rows[0].rol.toUpperCase();
  return ['GERENTE', 'ADMINISTRADOR'].includes(rol);
};



// CERRAR CAJA
const cierreCaja = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    // Comprobar que el usuario tenga permisos.
    const autorizado = await verificarPermisoCierre(usuarioId);
    if (!autorizado) {
      return res.status(403).json({
        ok: false,
        mensaje: 'No tienes permisos para cerrar cajas.'
      });
    }
    const datos = {
      efectivoContado: req.body.efectivoContado,
      tarjetaContada: req.body.tarjetaContada,
      bitcoinContado: req.body.bitcoinContado,
      chivoWalletContado: req.body.chivoWalletContado
    };

    // Validar los montos declarados.
    const validacion = validarCierreCaja(datos);
    if (!validacion.valido) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Los datos del cierre no son válidos.',
        errores: validacion.errores
      });
    }

    // Ejecutar el cierre.
    const resultado = await cerrarCaja({
      turnoId: req.params.turnoId,
      usuarioCierre: usuarioId,
      montoContado: datos.efectivoContado
    });
    return res.status(200).json({
      ok: true,
      mensaje: 'Caja cerrada correctamente.',
      cierre: resultado.cierre,
      resumen: resultado.resumen
    });

  } catch (error) {
    console.error('Error al cerrar caja:', error.message);
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
};


//EXPORTAR CONTROLADORES
module.exports = {
  aperturaCaja,
  movimientoCaja,
  cierreCaja
};
