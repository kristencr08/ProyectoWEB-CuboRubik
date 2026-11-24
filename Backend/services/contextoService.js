
const { crearError } = require('../utils/errores');

// "db" puede ser el pool o un client de una transacción.
const obtenerSucursalUsuario = async (db, usuarioId) => {
  const resultado = await db.query(
    `SELECT s.sucursal_id, s.nombre
     FROM core.usuarios u
     JOIN core.sucursales s
       ON s.sucursal_id = u.sucursal_id
     WHERE u.usuario_id = $1
       AND u.activo = TRUE
       AND s.activo = TRUE`,
    [usuarioId]
  );

  if (resultado.rowCount === 0) {
    throw crearError(403, 'Usuario o sucursal no disponible');
  }

  return resultado.rows[0];
};

module.exports = { obtenerSucursalUsuario };
