import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getStravaStatus, getStravaAuthUrl, disconnectStrava, StravaStatus } from '../services/strava'

type StravaState =
  | { status: 'loading' }
  | { status: 'success'; data: StravaStatus }
  | { status: 'error' }

type DisconnectState = 'idle' | 'loading' | 'error'

export default function ProfilePage() {
  const { logout } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [stravaState, setStravaState] = useState<StravaState>({ status: 'loading' })
  const [disconnectState, setDisconnectState] = useState<DisconnectState>('idle')
  const [connectingStrava, setConnectingStrava] = useState(false)

  const stravaConnected = searchParams.get('strava') === 'connected'

  useEffect(() => {
    getStravaStatus()
      .then((data) => setStravaState({ status: 'success', data }))
      .catch(() => setStravaState({ status: 'error' }))
  }, [])

  const handleConnectStrava = async () => {
    setConnectingStrava(true)
    try {
      const { authUrl } = await getStravaAuthUrl()
      window.location.href = authUrl
    } catch {
      setConnectingStrava(false)
    }
  }

  const handleDisconnect = async () => {
    setDisconnectState('loading')
    try {
      await disconnectStrava()
      setStravaState({ status: 'success', data: { connected: false } })
      setDisconnectState('idle')
      if (stravaConnected) {
        setSearchParams({})
      }
    } catch {
      setDisconnectState('error')
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">Running Plan</h1>
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
              Tableau de bord
            </Link>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold mb-8">Profil</h2>

        {/* ── Succès connexion Strava ────────────────────────────────── */}
        {stravaConnected && (
          <div
            role="alert"
            className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 font-medium"
          >
            Strava connecté avec succès !
          </div>
        )}

        {/* ── Section Strava ─────────────────────────────────────────── */}
        <section aria-label="Connexion Strava" className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FC4C02' }}>
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <h3 className="text-lg font-semibold">Strava</h3>
          </div>

          {stravaState.status === 'loading' && (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {stravaState.status === 'error' && (
            <p className="text-sm text-red-600">
              Impossible de récupérer le statut Strava. Veuillez réessayer.
            </p>
          )}

          {stravaState.status === 'success' && !stravaState.data.connected && (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Connectez votre compte Strava pour synchroniser vos activités.
              </p>
              <button
                onClick={handleConnectStrava}
                disabled={connectingStrava}
                className="px-5 py-2.5 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#FC4C02' }}
              >
                {connectingStrava ? 'Redirection…' : 'Connecter Strava'}
              </button>
            </div>
          )}

          {stravaState.status === 'success' && stravaState.data.connected && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Strava connecté
                </span>
              </div>

              {stravaState.data.athleteName && (
                <p className="text-sm text-gray-700 mb-1">
                  Athlète : <span className="font-medium">{stravaState.data.athleteName}</span>
                </p>
              )}

              {stravaState.data.connectedAt && (
                <p className="text-sm text-gray-500 mb-4">
                  Connecté le {formatDate(stravaState.data.connectedAt)}
                </p>
              )}

              {disconnectState === 'error' && (
                <p className="text-sm text-red-600 mb-3">
                  La déconnexion a échoué. Veuillez réessayer.
                </p>
              )}

              <button
                onClick={handleDisconnect}
                disabled={disconnectState === 'loading'}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {disconnectState === 'loading' ? 'Déconnexion…' : 'Déconnecter'}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
