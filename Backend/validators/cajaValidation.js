const turnos_validos = ["MATUTINO", "VESPERTINO"];
const tipo_movimiento_validos = ["INGRESO", "EGRESO"];

// Métodos de pago utilizados en el restaurante.
const METODOS_PAGO_VALIDOS = [
  "EFECTIVO",
  "TARJETA",
  "BITCOIN",
  "CHIVO_WALLET"
];

// Validar identificadores positivos.
const esIdValido = (id) => {
  const valor = typeof id === "string" && /^\d+$/.test(id)
    ? Number(id)
    : id;
  return Number.isSafeInteger(valor) && valor > 0;
};

// Validar montos numéricos iguales o mayores a cero.
const esMontoValido = (monto) => {
  return (
    typeof monto === "number" &&
    Number.isFinite(monto) &&
    monto >= 0
  );
};

// Comprobar que los datos recibidos sean un objeto.
const esObjetoValido = (datos) => {
  return (
    datos !== null &&
    typeof datos === "object" &&
    !Array.isArray(datos)
  );
};


// 1. VALIDAR APERTURA DE CAJA
const validarAperturaCaja = (datos) => {
  const errores = [];
  if (!esObjetoValido(datos)) {
    return {
      valido: false,
      errores: ["Los datos de apertura son obligatorios."]
    };
  }

  const { cajaId, turno, montoInicial } = datos;
  if (!esIdValido(cajaId)) {
    errores.push("El identificador de la caja no es válido.");
  }
  if (!turnos_validos.includes(turno)) {
    errores.push("El turno debe ser MATUTINO o VESPERTINO.");
  }
  if (!esMontoValido(montoInicial)) {
    errores.push("El monto inicial debe ser un número igual o mayor a cero.");
  }
  return {
    valido: errores.length === 0,
    errores
  };
};


// 2. VALIDAR MOVIMIENTOS DE CAJA
const validarMovimientoCaja = (datos) => {
  const errores = [];
  if (!esObjetoValido(datos)) {
    return {
      valido: false,
      errores: ["Los datos del movimiento son obligatorios."]
    };
  }

  const { tipo, monto, descripcion } = datos;
  if (!tipo_movimiento_validos.includes(tipo)) {
    errores.push("El tipo debe ser INGRESO o EGRESO.");
  }
  if (!esMontoValido(monto) || monto === 0) {
    errores.push("El monto debe ser un número mayor a cero.");
  }
  if (
    typeof descripcion !== "string" ||
    descripcion.trim().length < 3
  ) {
    errores.push("La descripción debe contener al menos 3 caracteres.");
  }
  return {
    valido: errores.length === 0,
    errores
  };
};


// 3. VALIDAR CIERRE DE CAJA
const validarCierreCaja = (datos) => {
  const errores = [];
  if (!esObjetoValido(datos)) {
    return {
      valido: false,
      errores: ["Los datos del cierre son obligatorios."]
    };
  }
  const {
    efectivoContado,
    tarjetaContada,
    bitcoinContado,
    chivoWalletContado
  } = datos;
  if (!esMontoValido(efectivoContado)) {
    errores.push("El efectivo contado no es válido.");
  }
  if (!esMontoValido(tarjetaContada)) {
    errores.push("El monto de tarjetas no es válido.");
  }
  if (!esMontoValido(bitcoinContado)) {
    errores.push("El monto de Bitcoin no es válido.");
  }
  if (!esMontoValido(chivoWalletContado)) {
    errores.push("El monto de Chivo Wallet no es válido.");
  }
  return {
    valido: errores.length === 0,
    errores
  };
};


// EXPORTAR FUNCIONES
module.exports = {
  validarAperturaCaja,
  validarMovimientoCaja,
  validarCierreCaja,
  esIdValido,
  esMontoValido
};
