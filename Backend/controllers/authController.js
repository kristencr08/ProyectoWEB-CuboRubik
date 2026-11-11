const pool = require('../../DB/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const login = async (req, res) => {
  const { usuario, clave } = req.body;

  try {
    const result = await pool.query('SELECT * FROM core.usuarios WHERE usuario = $1', [usuario]);
    if (result.rows.length === 0) {
      return res.status(401).json({ ok: false, mensaje: 'Usuario no encontrado' });
    }

    const usuarioDb = result.rows[0];

    const claveValida = await bcrypt.compare(clave, usuarioDb.password_hash);
    if (!claveValida) {
      return res.status(401).json({ ok: false, mensaje: 'Credenciales invalidas' });
    }

    const token = jwt.sign(
      { id: usuarioDb.usuario_id, rol: usuarioDb.rol_id },
      process.env.JWT_SECRET || 'clave_secreta',
      { expiresIn: '8h' }
    );

    return res.json({
      ok: true,
      token,
      usuario: { id: usuarioDb.usuario_id, nombre: usuarioDb.nombre }
    });
  } catch (error) {
    return res.status(500).json({ ok: false, mensaje: 'Error en el servidor' });
  }
};

module.exports = { login };