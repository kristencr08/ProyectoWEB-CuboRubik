import { createContext, useContext, useState } from 'react'
import { api } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null
    } catch {
      return null
    }
  })

  const login = async (usuario, clave) => {
    const data = await api.login(usuario, clave)
    localStorage.setItem('token', data.token)
    try {
      const perfil = await api.perfil()
      localStorage.setItem('user', JSON.stringify(perfil.usuario))
      setUser(perfil.usuario)
      return perfil.usuario
    } catch (err) {
      localStorage.removeItem('token')
      throw err
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
