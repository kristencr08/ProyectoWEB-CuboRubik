// VALIDACIONES DEL MODULO DE COMPRAS, PROVEEDORES Y CUENTAS POR PAGAR

const {
  TIPOS_ARTICULO,
  METODOS_PAGO_PROVEEDOR,
  esObjeto,
  esIdValido,
  esNumero,
  esTextoValido
} = require('./comunes');

// 1. PROVEEDOR
const validarProveedor = (datos, { esCreacion = true } = {}) => {
  const errores = [];

  if (!esObjeto(datos)) {
    return { valido: false, errores: ['Los datos del proveedor son obligatorios.'] };
  }

  const { nombre, documento, telefono, correo, direccion, activo } = datos;

  if ((esCreacion || nombre !== undefined) && !esTextoValido(nombre, 2, 150)) {
    errores.push('El nombre debe tener entre 2 y 150 caracteres.');
  }
  if (documento !== undefined && documento !== null &&
      !esTextoValido(documento, 1, 30)) {
    errores.push('El documento no puede superar 30 caracteres.');
  }
  if (telefono !== undefined && telefono !== null &&
      !esTextoValido(telefono, 1, 20)) {
    errores.push('El teléfono no puede superar 20 caracteres.');
  }
  if (correo !== undefined && correo !== null &&
      (!esTextoValido(correo, 3, 150) || !/^\S+@\S+\.\S+$/.test(correo))) {
    errores.push('El correo no tiene un formato válido.');
  }
  if (direccion !== undefined && direccion !== null &&
      typeof direccion !== 'string') {
    errores.push('La dirección debe ser texto.');
  }
  if (activo !== undefined && typeof activo !== 'boolean') {
    errores.push('El campo activo debe ser verdadero o falso.');
  }

  return { valido: errores.length === 0, errores };
};

// 2. COMPRA
const validarCompra = (datos) => {
  const errores = [];

  if (!esObjeto(datos)) {
    return { valido: false, errores: ['Los datos de la compra son obligatorios.'] };
  }

  const {
    proveedorId,
    numeroDocumento,
    diasCredito = 0,
    observaciones,
    detalles
  } = datos;

  if (!esIdValido(proveedorId)) {
    errores.push('El proveedor no es válido.');
  }
  if (!esTextoValido(numeroDocumento, 1, 50)) {
    errores.push('El número de documento es obligatorio (máximo 50 caracteres).');
  }
  if (!Number.isInteger(diasCredito) || diasCredito < 0 || diasCredito > 365) {
    errores.push('Los días de crédito deben ser un entero entre 0 y 365.');
  }
  if (observaciones !== undefined && observaciones !== null &&
      !esTextoValido(observaciones, 0, 500)) {
    errores.push('Las observaciones no pueden superar 500 caracteres.');
  }

  if (!Array.isArray(detalles) || detalles.length === 0) {
    errores.push('La compra debe tener al menos un artículo.');
  } else if (detalles.length > 100) {
    errores.push('La compra no puede tener más de 100 líneas.');
  } else {
    detalles.forEach((linea, indice) => {
      const posicion = indice + 1;

      if (!esObjeto(linea)) {
        errores.push(`Línea ${posicion}: formato no válido.`);
        return;
      }
      if (!TIPOS_ARTICULO.includes(linea.tipo)) {
        errores.push(`Línea ${posicion}: el tipo debe ser INGREDIENTE o PRODUCTO_DIRECTO.`);
      }
      if (!esIdValido(linea.articuloId)) {
        errores.push(`Línea ${posicion}: artículo no válido.`);
      }
      if (!esNumero(linea.cantidad) || Number(linea.cantidad) <= 0) {
        errores.push(`Línea ${posicion}: la cantidad debe ser mayor que 0.`);
      }
      if (!esNumero(linea.costoUnitario) || Number(linea.costoUnitario) < 0) {
        errores.push(`Línea ${posicion}: el costo unitario no puede ser negativo.`);
      }
    });
  }

  return { valido: errores.length === 0, errores };
};

// 3. ANULACION DE COMPRA
const validarAnulacion = (datos) => {
  if (!esObjeto(datos) || !esTextoValido(datos.motivo, 5, 200)) {
    return {
      valido: false,
      errores: ['El motivo de anulación es obligatorio (5 a 200 caracteres).']
    };
  }
  return { valido: true, errores: [] };
};

// 4. PAGO A PROVEEDOR
const validarPago = (datos) => {
  const errores = [];

  if (!esObjeto(datos)) {
    return { valido: false, errores: ['Los datos del pago son obligatorios.'] };
  }

  const { monto, metodoPago, referencia } = datos;

  if (!esNumero(monto) || Number(monto) <= 0) {
    errores.push('El monto debe ser mayor que 0.');
  }
  if (!METODOS_PAGO_PROVEEDOR.includes(metodoPago)) {
    errores.push(
      `El método de pago debe ser uno de: ${METODOS_PAGO_PROVEEDOR.join(', ')}.`
    );
  }
  if (referencia !== undefined && referencia !== null &&
      !esTextoValido(referencia, 0, 100)) {
    errores.push('La referencia no puede superar 100 caracteres.');
  }

  return { valido: errores.length === 0, errores };
};

module.exports = {
  validarProveedor,
  validarCompra,
  validarAnulacion,
  validarPago
};
