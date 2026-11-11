const pool = require('../../DB/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  try {
    const { usuario, clave } = req.body;

    if (!usuario || !clave) {
      return res.status(400).json({ ok: false, mensaje: 'Usuario y contraseña requeridos' });
    }

    // Consulta SQL buscando por nombre o correo 
    const query = 'SELECT * FROM core.usuarios WHERE nombre = $1 OR correo = $1';
    const result = await pool.query(query, [usuario]);

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Usuario no registrado' });
    }

    const usuarioDb = result.rows[0];

    // Validar contraseña con bcrypt sobre password_hash
    const claveValida = await bcrypt.compare(clave, usuarioDb.password_hash);
    if (!claveValida) {
      return res.status(401).json({ ok: false, mensaje: 'Credenciales no validas' });
    }

    // Generar Token JWT
    const token = jwt.sign(
      { 
        id: usuarioDb.usuario_id, 
        rol: usuarioDb.rol_id, 
        sucursal: usuarioDb.sucursal_id 
      },
      process.env.JWT_SECRET || 'clave_secreta',
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      ok: true,
      mensaje: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: usuarioDb.usuario_id,
        nombre: usuarioDb.nombre,
        correo: usuarioDb.correo,
        rol_id: usuarioDb.rol_id
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error al autenticar al usuario' });
  }
};

module.exports = { login };