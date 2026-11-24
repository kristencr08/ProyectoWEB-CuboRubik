// CLIENTES (necesarios para emitir Comprobantes de Crédito Fiscal)
// Archivo nuevo (módulo Front/POS).
const pool = require('../../DB/db');

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// DUI = 9 dígitos (01234567-8) | NIT = 14 dígitos (0614-010190-101-3).
// Se guarda siempre con guiones para que el mismo documento no se registre dos veces
// escrito de formas distintas (con y sin guiones).
const normalizarDocumento = (valor) => {
  const texto = String(valor || '').trim();
  if (!/^[\d\s-]+$/.test(texto)) return null; // solo números, espacios y guiones
  const d = texto.replace(/\D/g, '');
  if (d.length === 9) return `${d.slice(0, 8)}-${d.slice(8)}`;
  if (d.length === 14) return `${d.slice(0, 4)}-${d.slice(4, 10)}-${d.slice(10, 13)}-${d.slice(13)}`;
  return null;
};

// Teléfono: 8 dígitos (se acepta el prefijo +503) -> 7777-8888
const normalizarTelefono = (valor) => {
  const texto = String(valor || '').trim();
  if (!/^[\d\s+-]+$/.test(texto)) return null;
  let d = texto.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('503')) d = d.slice(3);
  return d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4)}` : null;
};

// GET /api/clientes
// Lista los clientes activos; "q" filtra por nombre o documento.
const listarClientes = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const params = [];
    let filtro = '';

    if (q) {
      params.push(`%${q}%`);
      filtro = 'AND (nombre ILIKE $1 OR documento ILIKE $1)';
    }

    const resultado = await pool.query(
      `SELECT cliente_id, nombre, documento, telefono, correo
       FROM core.clientes
       WHERE activo = TRUE ${filtro}
       ORDER BY nombre
       LIMIT 500`,
      params
    );

    return res.json({ ok: true, clientes: resultado.rows });
  } catch (error) {
    console.error('Error al listar clientes:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error al cargar los clientes' });
  }
};

// POST /api/clientes
// Registra un cliente nuevo. Nombre y documento son obligatorios;
// teléfono y correo son opcionales (pero si vienen, deben ser válidos).
const crearCliente = async (req, res) => {
  const { nombre, documento, telefono, correo } = req.body || {};

  const nombreLimpio = String(nombre || '').replace(/\s+/g, ' ').trim();
  if (!nombreLimpio) {
    return res.status(400).json({ ok: false, mensaje: 'El nombre es obligatorio' });
  }
  if (nombreLimpio.length > 150) {
    return res.status(400).json({ ok: false, mensaje: 'El nombre es demasiado largo (máximo 150 caracteres)' });
  }

  if (!String(documento || '').trim()) {
    return res.status(400).json({ ok: false, mensaje: 'El documento es obligatorio' });
  }
  const documentoNormalizado = normalizarDocumento(documento);
  if (!documentoNormalizado) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Documento no válido: debe ser un DUI (9 dígitos) o un NIT (14 dígitos), solo números'
    });
  }

  let telefonoNormalizado = null;
  if (telefono && String(telefono).trim()) {
    telefonoNormalizado = normalizarTelefono(telefono);
    if (!telefonoNormalizado) {
      return res.status(400).json({ ok: false, mensaje: 'Teléfono no válido: debe tener 8 dígitos' });
    }
  }

  let correoLimpio = null;
  if (correo && String(correo).trim()) {
    correoLimpio = String(correo).trim();
    if (correoLimpio.length > 150 || !REGEX_CORREO.test(correoLimpio)) {
      return res.status(400).json({ ok: false, mensaje: 'El correo no es válido' });
    }
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO core.clientes (nombre, documento, telefono, correo)
       VALUES ($1, $2, $3, $4)
       RETURNING cliente_id, nombre, documento, telefono, correo`,
      [nombreLimpio, documentoNormalizado, telefonoNormalizado, correoLimpio]
    );

    return res.status(201).json({ ok: true, cliente: resultado.rows[0] });
  } catch (error) {
    // 23505 = violación de UNIQUE (documento repetido)
    if (error.code === '23505') {
      return res.status(409).json({ ok: false, mensaje: 'Ya existe un cliente con ese documento' });
    }
    console.error('Error al crear cliente:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error al registrar el cliente' });
  }
};

module.exports = { listarClientes, crearCliente };
