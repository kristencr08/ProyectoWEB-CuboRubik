// UTILIDADES DE MANEJO DE ERRORES
// Todos los servicios lanzan errores con la propiedad "status".
// Los controladores los convierten en respuestas HTTP con responderError.

const crearError = (status, mensaje) => {
  const error = new Error(mensaje);
  error.status = status;
  return error;
};

// Errores de PostgreSQL que son culpa del cliente, no del servidor.
const ERRORES_POSTGRES = {
  '23505': [409, 'Ya existe un registro con esos datos'],
  '23503': [400, 'Se hace referencia a un registro que no existe'],
  '23514': [400, 'Los datos no cumplen las reglas del negocio'],
  '22P02': [400, 'Formato de dato no válido'],
  '22003': [400, 'Número fuera de rango permitido']
};

const responderError = (res, error, mensajeGeneral) => {
  if (error && error.status) {
    return res.status(error.status).json({
      ok: false,
      mensaje: error.message
    });
  }

  if (error && ERRORES_POSTGRES[error.code]) {
    const [status, mensaje] = ERRORES_POSTGRES[error.code];
    return res.status(status).json({ ok: false, mensaje });
  }

  console.error(mensajeGeneral, error);

  return res.status(500).json({
    ok: false,
    mensaje: mensajeGeneral
  });
};

module.exports = { crearError, responderError };