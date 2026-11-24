// UTILIDADES NUMERICAS

const { crearError } = require('./errores');

const PORCENTAJE_IVA = 13;

const convertir = (valor, factor, decimales, nombre) => {
  if (
    (typeof valor !== 'number' && typeof valor !== 'string') ||
    (typeof valor === 'string' && valor.trim() === '')
  ) {
    throw crearError(400, `${nombre} no es un número válido`);
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    throw crearError(400, `${nombre} no es un número válido`);
  }

  const entero = Math.round(numero * factor);

  // Rechaza valores con más decimales de los permitidos (ej. 1.005)
  if (Math.abs(numero * factor - entero) > 1e-6) {
    throw crearError(
      400,
      `${nombre} admite como máximo ${decimales} decimales`
    );
  }

  if (!Number.isSafeInteger(entero)) {
    throw crearError(400, `${nombre} está fuera de rango`);
  }

  return entero;
};

// 12.34 -> 1234 centavos
const aCentavos = (valor, nombre = 'El monto') =>
  convertir(valor, 100, 2, nombre);

// 2.5 -> 2500 milésimas
const aMilesimas = (valor, nombre = 'La cantidad') =>
  convertir(valor, 1000, 3, nombre);

// 1234 -> "12.34"
const centavosATexto = (centavos) => (centavos / 100).toFixed(2);

// 2500 -> "2.500"
const milesimasATexto = (milesimas) => (milesimas / 1000).toFixed(3);

// subtotal de una línea = ROUND(cantidad * costo, 2)
// cantidad en milésimas x costo en centavos / 1000, redondeo half-up
// (igual que ROUND de PostgreSQL para números positivos)
const subtotalLinea = (milesimas, centavos) =>
  Math.floor((milesimas * centavos + 500) / 1000);

// iva = ROUND(subtotal * 13 / 100, 2)
const calcularIva = (subtotalCentavos) =>
  Math.floor((subtotalCentavos * PORCENTAJE_IVA + 50) / 100);

module.exports = {
  PORCENTAJE_IVA,
  aCentavos,
  aMilesimas,
  centavosATexto,
  milesimasATexto,
  subtotalLinea,
  calcularIva
};
