// MENU Y PERMISOS: es el unico archivo donde se define que secciones existen,
// como se agrupan y que roles las pueden ver.
// Es solo para mostrar/ocultar el menu: la seguridad real la aplica el backend.
// Para agregar una pantalla nueva: se añade una seccion aqui y su <Route> en App.jsx.
const TODOS_VENTA = ['ADMINISTRADOR', 'GERENTE', 'CAJERO']
const GESTION = ['ADMINISTRADOR', 'GERENTE']

export const GRUPOS = [
  {
    titulo: 'Operación',
    secciones: [
      { to: '/pos', label: 'Punto de venta', icono: 'bi-cart3', roles: TODOS_VENTA },
      { to: '/facturas', label: 'Facturas', icono: 'bi-receipt', roles: TODOS_VENTA },
      { to: '/caja', label: 'Caja y turnos', icono: 'bi-cash-stack', roles: TODOS_VENTA },
    ],
  },
  {
    titulo: 'Producción',
    secciones: [
      { to: '/inventario', label: 'Inventario', icono: 'bi-box-seam', roles: [...GESTION, 'COCINERO'] },
      { to: '/recetas', label: 'Recetas', icono: 'bi-journal-text', roles: [...GESTION, 'COCINERO'] },
    ],
  },
  {
    titulo: 'Compras',
    secciones: [
      { to: '/compras', label: 'Compras', icono: 'bi-bag', roles: GESTION },
      { to: '/proveedores', label: 'Proveedores', icono: 'bi-truck', roles: GESTION },
      { to: '/cuentas-por-pagar', label: 'Cuentas por pagar', icono: 'bi-wallet2', roles: GESTION },
    ],
  },
  {
    titulo: 'Gestión',
    secciones: [
      { to: '/rrhh', label: 'Equipo y nómina', icono: 'bi-people', roles: GESTION },
    ],
  },
]

// Lista plana de todas las secciones (la usan ProtectedRoute y rutaInicial)
export const SECCIONES = GRUPOS.flatMap((g) => g.secciones)

export const puedeVer = (rol, ruta) => {
  const seccion = SECCIONES.find((s) => s.to === ruta)
  return !!seccion && seccion.roles.includes(rol)
}

// Primera pantalla despues de iniciar sesion (la primera que el rol puede ver)
export const rutaInicial = (rol) => {
  const primera = SECCIONES.find((s) => s.roles.includes(rol))
  return primera ? primera.to : '/login'
}
