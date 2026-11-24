// VALIDACIONES DEL MODULO DE INVENTARIO Y RECETAS

const {
  TIPOS_ARTICULO,
  esObjeto,
  esIdValido,
  esNumero,
  esTextoValido
} = require('./comunes');

// 1. AJUSTE MANUAL DE STOCK
const validarAjusteStock = (datos) => {
  const errores = [];

  if (!esObjeto(datos)) {
    return { valido: false, errores: ['Los datos del ajuste son obligatorios.'] };
  }

  const { tipo, articuloId, nuevaCantidad, motivo } = datos;

  if (!TIPOS_ARTICULO.includes(tipo)) {
    errores.push('El tipo debe ser INGREDIENTE o PRODUCTO_DIRECTO.');
  }
  if (!esIdValido(articuloId)) {
    errores.push('El artículo no es válido.');
  }
  if (!esNumero(nuevaCantidad) || Number(nuevaCantidad) < 0) {
    errores.push('La nueva cantidad debe ser un número mayor o igual a 0.');
  }
  if (!esTextoValido(motivo, 5, 200)) {
    errores.push('El motivo es obligatorio (5 a 200 caracteres).');
  }

  return { valido: errores.length === 0, errores };
};

// 2. STOCK MINIMO
const validarStockMinimo = (datos) => {
  const errores = [];

  if (!esObjeto(datos)) {
    return { valido: false, errores: ['Los datos del stock mínimo son obligatorios.'] };
  }

  const { tipo, articuloId, stockMinimo } = datos;

  if (!TIPOS_ARTICULO.includes(tipo)) {
    errores.push('El tipo debe ser INGREDIENTE o PRODUCTO_DIRECTO.');
  }
  if (!esIdValido(articuloId)) {
    errores.push('El artículo no es válido.');
  }
  if (!esNumero(stockMinimo) || Number(stockMinimo) < 0) {
    errores.push('El stock mínimo debe ser un número mayor o igual a 0.');
  }

  return { valido: errores.length === 0, errores };
};

// 3. INGREDIENTE (crear / actualizar)
const validarIngrediente = (datos, { esCreacion = true } = {}) => {
  const errores = [];

  if (!esObjeto(datos)) {
    return { valido: false, errores: ['Los datos del ingrediente son obligatorios.'] };
  }

  const { codigo, nombre, unidadId, descripcion, activo } = datos;

  if (esCreacion) {
    if (typeof codigo !== 'string' || !/^[A-Za-z0-9-]{2,30}$/.test(codigo)) {
      errores.push('El código debe tener 2 a 30 caracteres (letras, números o guion).');
    }
    if (!esIdValido(unidadId)) {
      errores.push('La unidad de medida no es válida.');
    }
  }

  if (
    (esCreacion || nombre !== undefined) &&
    !esTextoValido(nombre, 2, 150)
  ) {
    errores.push('El nombre debe tener entre 2 y 150 caracteres.');
  }
  if (descripcion !== undefined && descripcion !== null &&
      !esTextoValido(descripcion, 0, 500)) {
    errores.push('La descripción no puede superar 500 caracteres.');
  }
  if (activo !== undefined && typeof activo !== 'boolean') {
    errores.push('El campo activo debe ser verdadero o falso.');
  }

  return { valido: errores.length === 0, errores };
};

// 4. RECETA
const validarReceta = (datos) => {
  const errores = [];

  if (!esObjeto(datos)) {
    return { valido: false, errores: ['Los datos de la receta son obligatorios.'] };
  }

  const { nombre, cantidadProducida, instrucciones, ingredientes } = datos;

  if (nombre !== undefined && !esTextoValido(nombre, 2, 150)) {
    errores.push('El nombre de la receta debe tener entre 2 y 150 caracteres.');
  }
  if (
    cantidadProducida !== undefined &&
    (!esNumero(cantidadProducida) || Number(cantidadProducida) <= 0)
  ) {
    errores.push('La cantidad producida debe ser mayor que 0.');
  }
  if (instrucciones !== undefined && instrucciones !== null &&
      typeof instrucciones !== 'string') {
    errores.push('Las instrucciones deben ser texto.');
  }

  if (!Array.isArray(ingredientes) || ingredientes.length === 0) {
    errores.push('La receta debe tener al menos un ingrediente.');
  } else if (ingredientes.length > 50) {
    errores.push('La receta no puede tener más de 50 ingredientes.');
  } else {
    const vistos = new Set();

    ingredientes.forEach((linea, indice) => {
      const posicion = indice + 1;

      if (!esObjeto(linea) || !esIdValido(linea.ingredienteId)) {
        errores.push(`Ingrediente ${posicion}: identificador no válido.`);
        return;
      }
      if (!esNumero(linea.cantidad) || Number(linea.cantidad) <= 0) {
        errores.push(`Ingrediente ${posicion}: la cantidad debe ser mayor que 0.`);
      }
      if (vistos.has(String(linea.ingredienteId))) {
        errores.push(`Ingrediente ${posicion}: está repetido en la receta.`);
      }
      vistos.add(String(linea.ingredienteId));
    });
  }

  return { valido: errores.length === 0, errores };
};

module.exports = {
  validarAjusteStock,
  validarStockMinimo,
  validarIngrediente,
  validarReceta
};
