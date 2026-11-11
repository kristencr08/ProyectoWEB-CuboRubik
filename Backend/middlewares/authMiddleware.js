const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  let token = req.headers['authorization'];

  if (!token) {
    return res.status(403).json({ ok: false, mensaje: 'Token no proporcionado' });
  }

  if (token.startsWith('Bearer ')) {
    token = token.slice(7).trim();
  }

  token = token.replace(/^["']|["']$/g, '').trim();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'clave_secreta');
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ ok: false, mensaje: 'Token no valido o expirado' });
  }
};

module.exports = { verificarToken };