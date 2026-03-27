import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { login, register, LoginPayload, RegisterPayload } from '../services/auth'

function storeSession(token: string, userId: string, username: string) {
  localStorage.setItem('jwt', token)
  localStorage.setItem('userId', userId)
  localStorage.setItem('username', username)
}

function extractApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    return err.response.data.message as string
  }
  return fallback
}

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleLogin = async (payload: LoginPayload) => {
    setLoading(true)
    setError(null)
    try {
      const { token, userId, username } = await login(payload)
      storeSession(token, userId, username)
      navigate('/dashboard')
    } catch (err) {
      setError(extractApiError(err, 'Identifiants incorrects'))
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (payload: RegisterPayload) => {
    setLoading(true)
    setError(null)
    try {
      const { token, userId, username } = await register(payload)
      storeSession(token, userId, username)
      navigate('/dashboard')
    } catch (err) {
      setError(extractApiError(err, 'Erreur lors de la création du compte.'))
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('jwt')
    localStorage.removeItem('userId')
    localStorage.removeItem('username')
    navigate('/login')
  }

  return { handleLogin, handleRegister, logout, loading, error }
}
