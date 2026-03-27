import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { archivePlan, getPlans, getPlanStats } from '../services/plan'
import { PlanStats, PlanSummaryWithProgress, SESSION_TYPE_LABELS } from '../types/plan'

type FetchState =
  | { status: 'loading' }
  | { status: 'success'; plans: PlanSummaryWithProgress[] }
  | { status: 'error' }

type StatsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; stats: PlanStats }
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
  const [archiving, setArchiving] = useState<Set<string>>(new Set())
  const [statsState, setStatsState] = useState<StatsState>({ status: 'idle' })

  useEffect(() => {
    getPlans()
      .then((plans) => {
        setState({ status: 'success', plans })
        if (plans.length > 0) {
          setStatsState({ status: 'loading' })
          getPlanStats(plans[0].planId)
            .then((stats) => setStatsState({ status: 'success', stats }))
            .catch(() => setStatsState({ status: 'error' }))
        }
      })
      .catch(() => setState({ status: 'error' }))
  }, [])

  const handleArchive = async (planId: string) => {
    setArchiving((prev) => new Set(prev).add(planId))
    try {
      await archivePlan(planId)
      setState((prev) => {
        if (prev.status !== 'success') return prev
        return { ...prev, plans: prev.plans.filter((p) => p.planId !== planId) }
      })
    } finally {
      setArchiving((prev) => {
        const next = new Set(prev)
        next.delete(planId)
        return next
      })
    }
  }

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
          <div className="flex gap-3">
            <Link
              to="/plan/new"
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Créer un nouveau plan
            </Link>
            <Link
              to="/plan/import"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Importer un plan
            </Link>
          </div>
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

        {/* ── Section statistiques ─────────────────────────────────────── */}
        {statsState.status === 'success' && (
          <section aria-label="Statistiques du plan actif" className="mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Plan actif — statistiques
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {/* Progression */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-xs text-gray-500 mb-1">Progression</p>
                <p className="text-2xl font-bold text-blue-600">
                  {statsState.stats.completionPercentage}%
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {statsState.stats.completedSessions} / {statsState.stats.totalSessions} séances
                </p>
              </div>

              {/* Distance */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-xs text-gray-500 mb-1">Distance</p>
                <p className="text-2xl font-bold text-blue-600">
                  {statsState.stats.completedDistanceKm} km
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  sur {statsState.stats.totalDistanceKm} km prévus
                </p>
              </div>

              {/* Semaines */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-xs text-gray-500 mb-1">Semaines</p>
                <p className="text-2xl font-bold text-blue-600">
                  {statsState.stats.currentWeekNumber}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  sur {statsState.stats.totalWeeks} semaines
                </p>
              </div>

              {/* Prochaine séance */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-xs text-gray-500 mb-1">Prochaine séance</p>
                {statsState.stats.nextSession ? (
                  <>
                    <p className="text-sm font-semibold text-gray-800 mt-1">
                      {SESSION_TYPE_LABELS[statsState.stats.nextSession.type] ??
                        statsState.stats.nextSession.type}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(statsState.stats.nextSession.date)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 mt-1">Aucune</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Liste vide ──────────────────────────────────────────────── */}
        {state.status === 'success' && state.plans.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500 text-sm">
            Aucun plan pour l'instant.{' '}
            <Link to="/plan/import" className="text-blue-600 hover:underline">
              Importer un plan
            </Link>
          </div>
        )}

        {/* ── Liste des plans ─────────────────────────────────────────── */}
        {state.status === 'success' && state.plans.length > 0 && (
          <ul className="space-y-4">
            {state.plans.map((plan) => {
              const progress =
                plan.sessionsCount > 0
                  ? Math.round((plan.completedSessionsCount / plan.sessionsCount) * 100)
                  : 0
              return (
                <li
                  key={plan.planId}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <Link
                    to={`/plan/${plan.planId}`}
                    className="block p-6"
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

                  <div className="px-6 pb-4">
                    <button
                      onClick={() => handleArchive(plan.planId)}
                      disabled={archiving.has(plan.planId)}
                      className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {archiving.has(plan.planId) ? 'Archivage…' : 'Archiver ce plan'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
