import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { puedeVer, rutaInicial } from '../utils/permisos'

// Exige sesion y, además, que el rol tenga acceso a la seccion.
export default function ProtectedRoute() {
  const { user } = useAuth()
  const { pathname } = useLocation()

  if (!user) return <Navigate to="/login" replace />

  const seccion = '/' + pathname.split('/')[1]
  if (!puedeVer(user.rol, seccion)) {
    return <Navigate to={rutaInicial(user.rol)} replace />
  }
  return <Outlet />
}
