import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getPlans } from '../services/plan'
import { PlanSummaryWithProgress } from '../types/plan'

type FetchState =
  | { status: 'loading' }
  | { status: 'success'; plans: PlanSummaryWithProgress[] }
  | { status: 'error' }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function DashboardPage() {
  const { logout } = useAuth()
  const [state, setState] = useState<FetchState>({ status: 'loading' })

  useEffect(() => {
    getPlans()
      .then((plans) => setState({ status: 'success', plans }))
      .catch(() => setState({ status: 'error' }))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">Running Plan</h1>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Tableau de bord</h2>
          <Link
            to="/plan/import"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Importer un plan
          </Link>
        </div>

        {/* ── Chargement ─────────────────────────────────────────────── */}
        {state.status === 'loading' && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ── Erreur ─────────────────────────────────────────────────── */}
        {state.status === 'error' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            Impossible de charger les plans. Veuillez réessayer.
          </div>
        )}

        {/* ── Liste des plans ─────────────────────────────────────────── */}
        {state.status === 'success' && state.plans.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500 text-sm">
            Aucun plan pour l'instant.{' '}
            <Link to="/plan/import" className="text-blue-600 hover:underline">
              Importer un plan
            </Link>
          </div>
        )}

        {state.status === 'success' && state.plans.length > 0 && (
          <ul className="space-y-4">
            {state.plans.map((plan) => {
              const progress =
                plan.sessionsCount > 0
                  ? Math.round((plan.completedSessionsCount / plan.sessionsCount) * 100)
                  : 0
              return (
                <li key={plan.planId}>
                  <Link
                    to={`/plan/${plan.planId}`}
                    className="block bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{plan.name}</h3>
                        <p className="text-blue-600 text-sm">{plan.goal}</p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {plan.weeksCount} sem. · {plan.sessionsCount} séances
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 mb-3">
                      {formatDate(plan.startDate)} → {formatDate(plan.endDate)}
                    </p>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-10 text-right">
                        {progress}%
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
