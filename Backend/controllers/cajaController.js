const {
  abrirCaja,
  registrarMovimiento,
  solicitarCierreCaja,
  autorizarCierreCaja
} = require('../services/cajaService');
const {
  validarAperturaCaja,
  validarMovimientoCaja,
  validarSolicitudCierre,
  validarAutorizacionCierre
} = require('../validators/cajaValidation');



// 1. ABRIR CAJA Y ASIGNAR CAJERO
const aperturaCaja = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const datos = {
      cajaId: req.body.cajaId,
      cajeroId: req.body.cajeroId,
      turno: req.body.turno,
      montoInicial: req.body.montoInicial
    };

    // Validar los datos de apertura.
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
      cajeroId: datos.cajeroId,
      tipoTurno: datos.turno,
      montoInicial: datos.montoInicial
    });
    return res.status(201).json({
      ok: true,
      mensaje: 'Caja abierta y cajero asignado correctamente.',
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



// 2. REGISTRAR MOVIMIENTO DE CAJA
const movimientoCaja = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const datos = {
      tipo: req.body.tipo,
      monto: req.body.monto,
      descripcion: req.body.descripcion
    };

    // Validar el movimiento.
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



// 3. SOLICITAR CIERRE DE CAJA
const solicitudCierreCaja = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const datos = {
      efectivoContado: req.body.efectivoContado,
      tarjetaContada: req.body.tarjetaContada,
      bitcoinContado: req.body.bitcoinContado,
      chivoWalletContado: req.body.chivoWalletContado
    };

    // Validar los cuatro montos declarados.
    const validacion = validarSolicitudCierre(datos);
    if (!validacion.valido) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Los datos de la solicitud de cierre no son válidos.',
        errores: validacion.errores
      });
    }

    // Registrar la solicitud del cajero.
    const resultado = await solicitarCierreCaja({
      turnoId: req.params.turnoId,
      usuarioId,
      efectivoContado: datos.efectivoContado,
      tarjetaContada: datos.tarjetaContada,
      bitcoinContado: datos.bitcoinContado,
      chivoWalletContado: datos.chivoWalletContado
    });
    return res.status(200).json({
      ok: true,
      mensaje: 'Solicitud de cierre registrada. Pendiente de autorización.',
      solicitud: resultado
    });

  } catch (error) {
    console.error('Error al solicitar cierre:', error.message);
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
};



// 4. AUTORIZAR CIERRE DE CAJA
const autorizacionCierreCaja = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    // Validar los datos de autorización.
    const validacion = validarAutorizacionCierre(req.body);
    if (!validacion.valido) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Los datos de autorización no son válidos.',
        errores: validacion.errores
      });
    }

    // El servicio comprueba el rol, la sucursal
    // y que el autorizador no sea quien solicitó el cierre.
    const resultado = await autorizarCierreCaja({
      turnoId: req.params.turnoId,
      usuarioAutorizacion: usuarioId
    });
    return res.status(200).json({
      ok: true,
      mensaje: 'Cierre de caja autorizado correctamente.',
      cierre: resultado.cierre,
      resumen: resultado.resumen
    });
  } catch (error) {
    console.error('Error al autorizar cierre:', error.message);
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
};



// EXPORTAR CONTROLADORES
module.exports = {
  aperturaCaja,
  movimientoCaja,
  solicitudCierreCaja,
  autorizacionCierreCaja
};
