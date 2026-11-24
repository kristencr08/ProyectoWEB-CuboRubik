// VALIDACIONES COMUNES DE LOS MODULOS DE INVENTARIO, COMPRAS Y CXP

const TIPOS_ARTICULO = ['INGREDIENTE', 'PRODUCTO_DIRECTO'];

const METODOS_PAGO_PROVEEDOR = [
  'EFECTIVO',
  'TRANSFERENCIA',
  'CHEQUE',
  'TARJETA',
  'BITCOIN',
  'CHIVO_WALLET'
];

const esObjeto = (datos) =>
  datos !== null && typeof datos === 'object' && !Array.isArray(datos);

const esIdValido = (id) => {
  const valor =
    typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : id;
  return Number.isSafeInteger(valor) && valor > 0;
};

// Acepta number o string numérica. La precisión (decimales) la verifica
// utils/numeros.js al convertir a centavos / milésimas.
const esNumero = (valor) =>
  (typeof valor === 'number' && Number.isFinite(valor)) ||
  (typeof valor === 'string' &&
    valor.trim() !== '' &&
    Number.isFinite(Number(valor)));

const esTextoValido = (valor, min, max) =>
  typeof valor === 'string' &&
  valor.trim().length >= min &&
  valor.trim().length <= max;

module.exports = {
  TIPOS_ARTICULO,
  METODOS_PAGO_PROVEEDOR,
  esObjeto,
  esIdValido,
  esNumero,
  esTextoValido
};
