const esObjetoValido = (datos) =>
  datos !== null &&
  typeof datos === 'object' &&
  !Array.isArray(datos);

const esIdValido = (id) => {
  const valor =
    typeof id === 'string' && /^\d+$/.test(id)
      ? Number(id)
      : id;
  return Number.isSafeInteger(valor) && valor > 0;
};

const esTextoValido = (texto, longitud = 1) =>
  typeof texto === 'string' &&
  texto.trim().length >= longitud;

const esMontoValido = (monto) =>
  typeof monto === 'number' &&
  Number.isFinite(monto) &&
  monto >= 0;

// ==========================================
// VALIDAR REGISTRO DE EMPLEADO
// ==========================================

const validarEmpleado = (datos) => {
  const errores = [];
  if (!esObjetoValido(datos)) {
    return {
      valido: false,
      errores: ['Los datos del empleado son obligatorios.']
    };
  }

  const {
    sucursalId,
    nombre,
    documento,
    telefono,
    correo,
    cargo,
    fechaContratacion,
    salarioBase
  } = datos;
  if (!esIdValido(sucursalId)) {
    errores.push('Debe indicar una sucursal válida.');
  }
  if (!esTextoValido(nombre, 3) || nombre.length > 150) {
    errores.push('El nombre debe contener entre 3 y 150 caracteres.');
  }
  if (!esTextoValido(documento, 3) || documento.length > 30) {
    errores.push('El documento debe contener entre 3 y 30 caracteres.');
  }
  if (
    telefono !== undefined &&
    telefono !== null &&
    (typeof telefono !== 'string' || telefono.length > 20)
  ) {
    errores.push('El teléfono no es válido.');
  }
  if (
    correo !== undefined &&
    correo !== null &&
    (typeof correo !== 'string' || correo.length > 150)
  ) {
    errores.push('El correo no es válido.');
  }
  if (!esTextoValido(cargo, 2) || cargo.length > 100) {
    errores.push('El cargo debe contener entre 2 y 100 caracteres.');
  }
  if (
    typeof fechaContratacion !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fechaContratacion) ||
    Number.isNaN(Date.parse(`${fechaContratacion}T00:00:00`))
  ) {
    errores.push('La fecha de contratación debe tener formato YYYY-MM-DD.');
  }
  if (!esMontoValido(salarioBase)) {
    errores.push('El salario base debe ser un número igual o mayor a cero.');
  }
  return {
    valido: errores.length === 0,
    errores
  };
};

// ==========================================
// VALIDAR CREACIÓN DE PLANILLA
// ==========================================
const validarPlanilla = (datos) => {
  const errores = [];

  if (!esObjetoValido(datos)) {
    return {
      valido: false,
      errores: ['Los datos de la planilla son obligatorios.']
    };
  }

  const { nombre, sucursalId, fechaInicio, fechaFin, observaciones } = datos;
  if (!esTextoValido(nombre, 3) || nombre.length > 100) {
    errores.push('El nombre de la planilla debe contener entre 3 y 100 caracteres.');
  }
  if (!esIdValido(sucursalId)) {
    errores.push('Debe indicar una sucursal válida.');
  }

  const fechaValida = (fecha) =>
    typeof fecha === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(fecha) &&
    !Number.isNaN(Date.parse(`${fecha}T00:00:00`));
  if (!fechaValida(fechaInicio)) {
    errores.push('La fecha de inicio no es válida.');
  }
  if (!fechaValida(fechaFin)) {
    errores.push('La fecha de finalización no es válida.');
  }
  if (
    fechaValida(fechaInicio) &&
    fechaValida(fechaFin) &&
    fechaFin < fechaInicio
  ) {
    errores.push('La fecha final no puede ser anterior a la fecha inicial.');
  }
  if (
    observaciones !== undefined &&
    observaciones !== null &&
    typeof observaciones !== 'string'
  ) {
    errores.push('Las observaciones deben ser texto.');
  }
  return {
    valido: errores.length === 0,
    errores
  };
};

// ==========================================
// VALIDAR BONIFICACIONES
// ==========================================
const validarBonificaciones = (datos) => {
  const errores = [];
  if (!esObjetoValido(datos)) {
    return {
      valido: false,
      errores: ['Los datos de las bonificaciones son obligatorios.']
    };
  }

  const { bonificaciones } = datos;
  if (!esMontoValido(bonificaciones)) {
    errores.push('Las bonificaciones deben ser un número igual o mayor a cero.');
  }
  return {
    valido: errores.length === 0,
    errores
  };
};

module.exports = {
  validarEmpleado,
  validarPlanilla,
  validarBonificaciones,
  esIdValido,
  esMontoValido
};
