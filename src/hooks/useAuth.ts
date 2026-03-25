import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register, LoginPayload, RegisterPayload } from '../services/auth'

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleLogin = async (payload: LoginPayload) => {
    setLoading(true)
    setError(null)
    try {
      const { token } = await login(payload)
      localStorage.setItem('jwt', token)
      navigate('/dashboard')
    } catch {
      setError('Email ou mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (payload: RegisterPayload) => {
    setLoading(true)
    setError(null)
    try {
      const { token } = await register(payload)
      localStorage.setItem('jwt', token)
      navigate('/dashboard')
    } catch {
      setError('Erreur lors de la création du compte.')
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('jwt')
    navigate('/login')
  }

  return { handleLogin, handleRegister, logout, loading, error }
}
