import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Badge, Button } from 'reactstrap'
import { useAuth } from '../context/AuthContext'
import { GRUPOS, SECCIONES } from '../utils/permisos'
import logo from '../assets/Logo.png'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [menuAbierto, setMenuAbierto] = useState(false) // solo se usa en celular

  const salir = () => {
    logout()
    navigate('/login')
  }

  // Cada grupo muestra solo las secciones que el rol puede usar;
  // los grupos que quedan vacios no se dibujan.
  const grupos = GRUPOS.map((g) => ({
    ...g,
    secciones: g.secciones.filter((s) => s.roles.includes(user.rol)),
  })).filter((g) => g.secciones.length > 0)

  const actual = SECCIONES.find((s) => pathname.startsWith(s.to))

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-marca">
          <img
            src={logo}
            alt="Orígenes SV"
            className="marca-imagen"
          />
          <button
            type="button"
            className="btn-menu d-md-none ms-auto"
            onClick={() => setMenuAbierto(!menuAbierto)}
            aria-label="Abrir menú"
          >
            <i className={`bi ${menuAbierto ? 'bi-x-lg' : 'bi-list'}`} />
          </button>
        </div>

        <div className={`sidebar-cuerpo ${menuAbierto ? 'abierto' : ''}`}>
          <nav className="flex-grow-1">
            {grupos.map((g) => (
              <div key={g.titulo} className="menu-grupo">
                <div className="menu-titulo">{g.titulo}</div>
                {g.secciones.map((s) => (
                  <NavLink
                    key={s.to}
                    to={s.to}
                    onClick={() => setMenuAbierto(false)}
                    className={({ isActive }) => `menu-link ${isActive ? 'activo' : ''}`}
                  >
                    <i className={`bi ${s.icono}`} />
                    <span>{s.label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </div>
      </aside>

      <div className="contenido">
        {/*Barra superior: ruta actual a la izquierda y sesion iniciada a la derecha*/}
        <header className="topbar">
          <div className="topbar-ruta">
            <span className="text-muted">Orígenes SV</span>
            {actual && (
              <>
                <span className="text-muted mx-2">/</span>
                <strong>{actual.label}</strong>
              </>
            )}
          </div>

          <div className="usuario-top">
            <div className="usuario-avatar">{user.nombre?.charAt(0).toUpperCase()}</div>
            <div className="usuario-datos d-none d-sm-block">
              <div className="usuario-nombre">{user.nombre}</div>
              <div className="usuario-sucursal">
                <Badge className="rol-badge me-1">{user.rol}</Badge>
                {user.sucursal?.nombre}
              </div>
            </div>
            <Button color="outline-secondary" size="sm" onClick={salir} title="Cerrar sesión">
              <i className="bi bi-box-arrow-right" /> <span className="d-none d-md-inline">Salir</span>
            </Button>
          </div>
        </header>

        <main className="p-3 p-md-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
