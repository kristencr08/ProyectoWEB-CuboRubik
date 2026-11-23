import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import POS from './pages/POS'
import Facturas from './pages/Facturas'
import Placeholder from './pages/Placeholder'
import { useAuth } from './context/AuthContext'
import { rutaInicial } from './utils/permisos'
import Inventario from './pages/Inventario'
import Proveedores from './pages/Proveedores'
import Caja from './pages/Caja'
import RRHH from './pages/RRHH'

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/*Todo lo que esta aqui dentro exige sesion y un rol con acceso*/}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          {/*Pantallas listas*/}
          <Route path="/pos" element={<POS />} />
          <Route path="/facturas" element={<Facturas />} />

          {/*Pantallas de otros modulos
              Para conectar la tuya: importa tu componente arriba y reemplaza el <Placeholder />
              de tu ruta por <TuPantalla />. No hace falta tocar nada más. */}
          <Route path="/caja" element={<Caja />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/recetas" element={<Placeholder titulo="Recetas y menú" />} />
          <Route path="/compras" element={<Placeholder titulo="Compras" />} />
          <Route path="/proveedores" element={<Proveedores />} />
          <Route path="/cuentas-por-pagar" element={<Placeholder titulo="Cuentas por pagar" />} />
          <Route path="/rrhh" element={<RRHH />} />
        </Route>
      </Route>

      <Route
        path="*"
        element={<Navigate to={user ? rutaInicial(user.rol) : '/login'} replace />}
      />
    </Routes>
  )
}
