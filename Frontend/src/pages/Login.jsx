import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  FormGroup,
  Input,
  Label,
  Spinner
} from 'reactstrap'

import { useAuth } from '../context/AuthContext'
import { rutaInicial } from '../utils/permisos'

import logo from '../assets/Logo.png'
import platillos from '../assets/platillos.png'

import './Login.css'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ usuario: '', clave: '' })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  if (user) return <Navigate to={rutaInicial(user.rol)} replace />

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)

    try {
      const usuario = await login(form.usuario.trim(), form.clave)
      navigate(rutaInicial(usuario.rol))
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-page">

      
      <section className="login-visual">
        <img
          src={platillos}
          alt="Variedad de comida salvadoreña"
          className="login-food-image"
        />

        <div className="login-overlay"></div>

        <div className="login-visual-content">
          <span className="login-tagline">
            SABORES DE NUESTRA TIERRA
          </span>

          <h1>
            El sabor de<br />
            nuestras raíces.
          </h1>

          <p>
            Tradición salvadoreña que se disfruta
            en cada bocado.
          </p>
        </div>
      </section>

      {/*PANEL DERECHO: FORMULARIO*/}
      <section className="login-form-section">

        <div className="login-form-container">

          <img
            src={logo}
            alt="Orígenes SV"
            className="login-logo"
          />

          <div className="login-heading">
            <h2>Bienvenido</h2>
            <p>Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit}>

            <FormGroup className="login-form-group">

              <Input
                id="usuario"
                name="usuario"
                type="email"
                value={form.usuario}
                onChange={handleChange}
                placeholder="Correo "
                required
                autoFocus
                className="login-input"
              />
            </FormGroup>

            <FormGroup className="login-form-group">

              <Input
                id="clave"
                name="clave"
                type="password"
                value={form.clave}
                onChange={handleChange}
                placeholder="Contraseña"
                required
                className="login-input"
              />
            </FormGroup>

            {error && (
              <Alert color="danger" className="py-2">
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              disabled={cargando}
              className="login-button"
              block
            >
              {cargando ? <Spinner size="sm" /> : 'Iniciar sesión'}
            </Button>

          </form>

          <p className="login-footer">
            ORÍGENES SV · EL SABOR DE NUESTRAS RAÍCES
          </p>

        </div>
      </section>

    </div>
  )
}
