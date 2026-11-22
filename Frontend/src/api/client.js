const BASE_URL = import.meta.env.VITE_API_URL || '/api'

async function request(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token')

  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await res.json().catch(() => ({}))

  if (res.status === 401 && path !== '/auth/login') {
    // Token vencido o inválido: se cierra la sesión
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  if (!res.ok || data.ok === false) {
    throw new Error(data.mensaje || 'Error en la solicitud')
  }
  return data
}

export const api = {
  // Auth y perfil
  login: (usuario, clave) => request('/auth/login', { method: 'POST', body: { usuario, clave } }),
  perfil: () => request('/perfil'),
  turnoActual: () => request('/perfil/turno-actual'),

  // POS
  productos: () => request('/pos/productos'),
  crearPedido: (pedido) => request('/pos/pedido', { method: 'POST', body: pedido }),

  // Clientes
  clientes: () => request('/clientes'),
  crearCliente: (cliente) => request('/clientes', { method: 'POST', body: cliente }),

  // Facturas
  facturas: (tipo) => request(`/facturas${tipo ? `?tipo=${tipo}` : ''}`),
  factura: (id) => request(`/facturas/${id}`),
}
