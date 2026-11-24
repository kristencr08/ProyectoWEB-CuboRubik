// UTILIDADES PARA LEER PARAMETROS DE RUTA Y QUERY STRING

const { crearError } = require('./errores');
const { esIdValido } = require('../validators/comunes');

// :id de la URL -> número, o error 400
const leerIdRuta = (valor, nombre = 'identificador') => {
  if (!esIdValido(valor)) {
    throw crearError(400, `El ${nombre} no es válido`);
  }
  return Number(valor);
};

// ?limite=50 -> entre 1 y "maximo"
const leerLimite = (valor, porDefecto = 50, maximo = 200) => {
  if (valor === undefined) return porDefecto;

  const numero = Number(valor);

  if (!Number.isInteger(numero) || numero < 1) {
    throw crearError(400, 'El límite debe ser un entero mayor que 0');
  }

  return Math.min(numero, maximo);
};

// ?desde=2026-11-01 -> "2026-11-01" validado como fecha real
const leerFecha = (valor, nombre) => {
  if (valor === undefined) return undefined;

  const texto = String(valor);
  const fecha = new Date(`${texto}T00:00:00Z`);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(texto) ||
    Number.isNaN(fecha.getTime()) ||
    fecha.toISOString().slice(0, 10) !== texto
  ) {
    throw crearError(400, `${nombre} debe tener formato AAAA-MM-DD`);
  }

  return texto;
};

// ?estado=PENDIENTE -> debe estar en la lista permitida
const leerOpcion = (valor, permitidas, nombre) => {
  if (valor === undefined) return undefined;

  const texto = String(valor).toUpperCase();

  if (!permitidas.includes(texto)) {
    throw crearError(400, `${nombre} debe ser uno de: ${permitidas.join(', ')}`);
  }

  return texto;
};

module.exports = { leerIdRuta, leerLimite, leerFecha, leerOpcion };