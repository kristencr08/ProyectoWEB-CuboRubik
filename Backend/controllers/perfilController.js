const pool = require('../../DB/db');

const obtenerPerfil = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT u.usuario_id, u.nombre, u.correo,
              r.nombre AS rol,
              s.sucursal_id, s.nombre AS sucursal
       FROM core.usuarios u
       JOIN core.roles r ON r.rol_id = u.rol_id
       JOIN core.sucursales s ON s.sucursal_id = u.sucursal_id
       WHERE u.usuario_id = $1
         AND u.activo = TRUE`,
      [req.usuario.id]
    );

    if (resultado.rowCount === 0) {
      return res.status(403).json({ ok: false, mensaje: 'Usuario no disponible' });
    }

    const u = resultado.rows[0];
    return res.json({
      ok: true,
      usuario: {
        id: Number(u.usuario_id),
        nombre: u.nombre,
        correo: u.correo,
        rol: u.rol,
        sucursal: { id: Number(u.sucursal_id), nombre: u.sucursal }
      }
    });
  } catch (error) {
    console.error('Error al obtener el perfil:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error al obtener el perfil' });
  }
};

// GET /api/perfil/turno-actual
// Indica si la sucursal del usuario tiene un turno de caja abierto.
const obtenerTurnoActual = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT t.turno_id, t.tipo_turno
       FROM core.turnos_caja t
       JOIN core.cajas c ON c.caja_id = t.caja_id
       JOIN core.usuarios u ON u.sucursal_id = c.sucursal_id
       WHERE u.usuario_id = $1
         AND c.activo = TRUE
         AND t.fecha_cierre IS NULL
         AND t.estado = 'ABIERTO'
       ORDER BY t.fecha_apertura DESC
       LIMIT 1`,
      [req.usuario.id]
    );

    if (resultado.rowCount === 0) {
      return res.json({ ok: true, abierto: false, turno_id: null });
    }

    return res.json({
      ok: true,
      abierto: true,
      turno_id: Number(resultado.rows[0].turno_id),
      tipo_turno: resultado.rows[0].tipo_turno
    });
  } catch (error) {
    console.error('Error al consultar el turno actual:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error al consultar el turno de caja' });
  }
};

module.exports = { obtenerPerfil, obtenerTurnoActual };
