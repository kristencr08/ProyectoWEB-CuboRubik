const jwt = require('jsonwebtoken');

// Middleware que verifica si el usuario inició sesión
const verificarToken = (req, res, next) => {
  const tokenHeader = req.headers['authorization'];

  if (!tokenHeader) {
    return res.status(403).json({
      ok: false,
      mensaje: 'Acceso denegado: Token no proporcionado'
    });
  }

  try {
    // Limpiar el prefijo Bearer si viene en el header
    const tokenLimpio = tokenHeader.startsWith('Bearer') 
      ? tokenHeader.slice(7).trim() 
      : tokenHeader.trim();

    // Verificar y decodificar el token usando jwt
    const decoded = jwt.verify(tokenLimpio, process.env.JWT_SECRET || 'clave_secreta');

    // Guardar los datos del usuario en la request
    req.usuario = decoded;

    // Continuar al controlador de la ruta
    next();

  } catch (error) {
    return res.status(401).json({
      ok: false,
      mensaje: 'El token no es valido o ha expirado'
    });
  }
};

module.exports = { verificarToken };