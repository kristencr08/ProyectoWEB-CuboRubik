// AUTORIZACION POR ROL
// verificarToken (authMiddleware) solo comprueba que el JWT sea válido.
// Este middleware se ejecuta DESPUÉS y comprueba que el rol del usuario
// (req.usuario.rol = rol_id guardado en el token) esté permitido.
//
// Uso: router.post('/', verificarToken, permitirRoles('ADMINISTRADOR', 'GERENTE'), handler)

const pool = require('../../DB/db');

const permitirRoles = (...rolesPermitidos) => async (req, res, next) => {
  try {
    const resultado = await pool.query(
      `SELECT nombre
       FROM core.roles
       WHERE rol_id = $1
         AND activo = TRUE`,
      [req.usuario.rol]
    );

    if (
      resultado.rowCount === 0 ||
      !rolesPermitidos.includes(resultado.rows[0].nombre)
    ) {
      return res.status(403).json({
        ok: false,
        mensaje: 'No tiene permisos para realizar esta acción'
      });
    }

    req.usuario.rolNombre = resultado.rows[0].nombre;
    return next();

  } catch (error) {
    console.error('Error al validar el rol:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al validar permisos'
    });
  }
};

module.exports = { permitirRoles };
