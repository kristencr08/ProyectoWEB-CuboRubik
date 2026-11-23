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
    // Cuando falla una validación, el backend responde { ok: false, errores: [...] }
    // sin "mensaje", así que se arma un texto con esa lista.
    const detalle = Array.isArray(data.errores)
      ? data.errores
          .map((e) => (typeof e === 'string' ? e : e.mensaje || JSON.stringify(e)))
          .join('. ')
      : ''
    throw new Error(data.mensaje || detalle || 'Error en la solicitud')
  }
  return data
}

// Convierte { tipo: 'X', desde: '' } en "?tipo=X", ignorando los valores vacíos
function aQuery(filtros = {}) {
  const params = new URLSearchParams()
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor !== '' && valor !== null && valor !== undefined) params.append(clave, valor)
  })
  const texto = params.toString()
  return texto ? `?${texto}` : ''
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

  // Inventario
  inventario: () => request('/inventario'),
  alertasStock: () => request('/inventario/alertas'),
  movimientos: (filtros) => request(`/inventario/movimientos${aQuery(filtros)}`),
  definirStockMinimo: (datos) => request('/inventario/stock-minimo', { method: 'PUT', body: datos }),
  registrarAjuste: (datos) => request('/inventario/ajustes', { method: 'POST', body: datos }),
  unidades: () => request('/inventario/unidades'),
  ingredientes: () => request('/inventario/ingredientes'),
  crearIngrediente: (datos) => request('/inventario/ingredientes', { method: 'POST', body: datos }),
  actualizarIngrediente: (id, datos) =>
    request(`/inventario/ingredientes/${id}`, { method: 'PUT', body: datos }),

    // Proveedores
  proveedores: () => request('/proveedores'),
  crearProveedor: (datos) => request('/proveedores', { method: 'POST', body: datos }),
  actualizarProveedor: (id, datos) =>
    request(`/proveedores/${id}`, { method: 'PUT', body: datos }),

  // Caja
  contextoCaja: () => request('/caja/contexto'),
  abrirCaja: (datos) => request('/caja/abrir', { method: 'POST', body: datos }),
  movimientoCaja: (turnoId, datos) =>
    request(`/caja/${turnoId}/movimientos`, { method: 'POST', body: datos }),
  solicitarCierreCaja: (turnoId, datos) =>
    request(`/caja/${turnoId}/solicitar-cierre`, { method: 'POST', body: datos }),
  autorizarCierreCaja: (turnoId, datos = {}) =>
    request(`/caja/${turnoId}/autorizar-cierre`, { method: 'POST', body: datos }),

  // RRHH y nómina
  empleados: (sucursalId) => request(`/nomina/empleados/sucursal/${sucursalId}`),
  crearEmpleado: (datos) => request('/nomina/empleados', { method: 'POST', body: datos }),
  planillas: (sucursalId) => request(`/nomina/planillas/sucursal/${sucursalId}`),
  crearPlanilla: (datos) => request('/nomina/planillas', { method: 'POST', body: datos }),
  generarDetallePlanilla: (planillaId, datos = {}) =>
    request(`/nomina/planillas/${planillaId}/detalles`, { method: 'POST', body: datos }),
  obtenerPlanilla: (planillaId) => request(`/nomina/planillas/${planillaId}`),
  procesarPlanilla: (planillaId) =>
    request(`/nomina/planillas/${planillaId}/procesar`, { method: 'POST' }),
  pagarPlanilla: (planillaId) =>
    request(`/nomina/planillas/${planillaId}/pagar`, { method: 'PATCH' }),
}