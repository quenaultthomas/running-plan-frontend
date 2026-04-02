import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePWAInstall } from '../hooks/usePWAInstall'
import { CITATIONS, Citation } from '../data/citations'
import { archivePlan, deletePlan, getPlans, getPlanStats } from '../services/plan'
import ProgressionCharts from '../components/ProgressionCharts'
import { getStravaStatus, syncStrava, StravaSyncResponse } from '../services/strava'
import { DAY_LABELS, PlanStats, PlanSummaryWithProgress, SESSION_TYPE_LABELS } from '../types/plan'

// ─── Citation du jour ───────────────────────────────────────────────────────

const SESSION_KEY = 'dashboard_citation'

function getSessionCitation(): Citation {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Citation
      if (parsed.text && parsed.author) return parsed
    }
  } catch {
    // ignore
  }
  const citation = CITATIONS[Math.floor(Math.random() * CITATIONS.length)]
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(citation))
  return citation
}

type FetchState =
  | { status: 'loading' }
  | { status: 'success'; plans: PlanSummaryWithProgress[] }
  | { status: 'error' }

type StatsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; stats: PlanStats }
  | { status: 'error' }

/** Parse robuste : gère "2026-03-30", "2026-03-30T00:00:00Z", "2026-03-30 00:00:00" et undefined/null */
function parseDate(iso: string | null | undefined): Date {
  if (!iso) return new Date()
  // Remplace le séparateur espace (non-standard) par T pour uniformiser
  const normalised = iso.trim().replace(' ', 'T')
  // Pour les dates seules (YYYY-MM-DD), on force l'interprétation en heure locale
  // afin d'éviter le décalage UTC → jour précédent selon le fuseau
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalised)) {
    const [y, m, d] = normalised.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(normalised)
}

function formatDate(iso: string | null | undefined) {
  return parseDate(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateLong(iso: string | null | undefined) {
  return parseDate(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ─── Modale de confirmation ─────────────────────────────────────────────────

interface ConfirmDeleteModalProps {
  planName: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDeleteModal({ planName, onConfirm, onCancel }: ConfirmDeleteModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4">
        <h3 id="modal-title" className="text-lg font-semibold mb-2">
          Supprimer le plan ?
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Le plan <span className="font-medium">« {planName} »</span> sera supprimé
          définitivement. Cette action est irréversible.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { logout } = useAuth()
  const { canInstall, install } = usePWAInstall()
  const [state, setState] = useState<FetchState>({ status: 'loading' })
  const [archiving, setArchiving] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<Set<string>>(new Set())
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [statsState, setStatsState] = useState<StatsState>({ status: 'idle' })
  const [citation] = useState<Citation>(getSessionCitation)
  const [stravaConnected, setStravaConnected] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncToast, setSyncToast] = useState<StravaSyncResponse | null>(null)

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

  useEffect(() => {
    getStravaStatus()
      .then((s) => setStravaConnected(s.connected))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!syncToast) return
    const timer = setTimeout(() => setSyncToast(null), 5000)
    return () => clearTimeout(timer)
  }, [syncToast])

  const handleStravaSync = async () => {
    setSyncing(true)
    try {
      const result = await syncStrava()
      setSyncToast(result)
      setState((prev) => {
        if (prev.status !== 'success' || prev.plans.length === 0) return prev
        setStatsState({ status: 'loading' })
        getPlanStats(prev.plans[0].planId)
          .then((stats) => setStatsState({ status: 'success', stats }))
          .catch(() => {})
        return prev
      })
    } finally {
      setSyncing(false)
    }
  }

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

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return
    const planId = confirmDeleteId
    setConfirmDeleteId(null)
    setDeleteError(null)
    setDeleting((prev) => new Set(prev).add(planId))
    try {
      await deletePlan(planId)
      setState((prev) => {
        if (prev.status !== 'success') return prev
        return { ...prev, plans: prev.plans.filter((p) => p.planId !== planId) }
      })
    } catch {
      setDeleteError('La suppression a échoué. Veuillez réessayer.')
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev)
        next.delete(planId)
        return next
      })
    }
  }

  const confirmingPlan =
    confirmDeleteId && state.status === 'success'
      ? state.plans.find((p) => p.planId === confirmDeleteId)
      : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Toast sync Strava ──────────────────────────────────────────── */}
      {syncToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-50 bg-white border border-orange-200 rounded-xl shadow-lg px-5 py-4 flex items-center gap-3 max-w-sm"
        >
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: '#FC4C02' }} />
          <p className="text-sm text-gray-800">
            <span className="font-semibold">{syncToast.activitiesAnalyzed}</span> activités analysées
            {' · '}
            <span className="font-semibold">{syncToast.sessionsValidated}</span> séances validées automatiquement
          </p>
        </div>
      )}

      {confirmingPlan && (
        <ConfirmDeleteModal
          planName={confirmingPlan.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">Running Plan</h1>
          <div className="flex items-center gap-4">
            <Link to="/profile" className="text-sm text-gray-500 hover:text-gray-700">
              Profil
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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Tableau de bord</h2>
          {state.status === 'success' && state.plans.length === 0 && (
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
          )}
        </div>

        {/* ── Citation motivante ──────────────────────────────────────── */}
        <figure className="mb-8 px-6 py-5 bg-blue-50 border-l-4 border-blue-400 rounded-r-xl">
          <blockquote className="text-sm italic text-blue-900 leading-relaxed">
            «&nbsp;{citation.text}&nbsp;»
          </blockquote>
          <figcaption className="mt-2 text-xs text-blue-700">
            — <span className="font-bold">{citation.author}</span>
          </figcaption>
        </figure>

        {/* ── Erreur suppression ──────────────────────────────────────── */}
        {deleteError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {deleteError}
          </div>
        )}

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
                      {SESSION_TYPE_LABELS[statsState.stats.nextSession?.type ?? ''] ??
                        statsState.stats.nextSession?.type}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {statsState.stats.nextSession?.day
                        ? DAY_LABELS[statsState.stats.nextSession.day]
                        : formatDateLong(statsState.stats.nextSession?.date)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 mt-1">Aucune</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Graphiques de progression ─────────────────────────────── */}
        {statsState.status === 'success' &&
          statsState.stats.weeklyStats &&
          statsState.stats.weeklyStats.length > 0 && (
            <ProgressionCharts weeklyStats={statsState.stats.weeklyStats} />
          )}

        {/* ── Sync Strava ─────────────────────────────────────────────── */}
        {stravaConnected && state.status === 'success' && state.plans.length > 0 && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={handleStravaSync}
              disabled={syncing}
              className="px-4 py-2 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#FC4C02' }}
            >
              {syncing ? 'Synchronisation…' : 'Synchroniser avec Strava'}
            </button>
          </div>
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
                      {formatDate(plan.startDate ?? null)} → {formatDate(plan.endDate ?? null)}
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

                  <div className="px-6 pb-4 flex gap-2">
                    <button
                      onClick={() => handleArchive(plan.planId)}
                      disabled={archiving.has(plan.planId)}
                      className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {archiving.has(plan.planId) ? 'Archivage…' : 'Archiver ce plan'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(plan.planId)}
                      disabled={deleting.has(plan.planId)}
                      className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {deleting.has(plan.planId) ? 'Suppression…' : 'Supprimer'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>

      {canInstall && (
        <div
          role="banner"
          aria-label="Bannière d'installation de l'application"
          className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-between gap-4 bg-white border-t border-gray-200 px-4 py-3 shadow-lg sm:px-6"
        >
          <p className="text-sm text-gray-700">
            Installer l'application pour un accès rapide.
          </p>
          <button
            onClick={install}
            className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Installer
          </button>
        </div>
      )}
    </div>
  )
}
