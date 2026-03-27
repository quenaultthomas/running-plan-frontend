import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { completeSession, getPlanById } from '../services/plan'
import {
  DAY_LABELS,
  PlanDetail,
  PlanWeek,
  SESSION_TYPE_LABELS,
} from '../types/plan'

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })
}

function formatCompletedAt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Renvoie l'index de la semaine dont la plage couvre aujourd'hui, ou -1. */
function currentWeekIndex(weeks: PlanWeek[]): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return weeks.findIndex((w) => {
    const start = new Date(w.startDate)
    const end = new Date(w.endDate)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    return today >= start && today <= end
  })
}

// ─── État machine ──────────────────────────────────────────────────────────

type PageState =
  | { status: 'loading' }
  | { status: 'success'; plan: PlanDetail }
  | { status: 'error' }

// ─── Page ──────────────────────────────────────────────────────────────────

export default function PlanDetailPage() {
  const { planId } = useParams<{ planId: string }>()
  const [state, setState] = useState<PageState>({ status: 'loading' })
  const [weekIdx, setWeekIdx] = useState(0)

  useEffect(() => {
    if (!planId) return
    getPlanById(planId)
      .then((plan) => {
        const idx = currentWeekIndex(plan.weeks)
        setWeekIdx(idx >= 0 ? idx : 0)
        setState({ status: 'success', plan })
      })
      .catch(() => setState({ status: 'error' }))
  }, [planId])

  const handleSessionComplete = (sessionId: string, completedAt: string) => {
    setState((prev) => {
      if (prev.status !== 'success') return prev
      return {
        ...prev,
        plan: {
          ...prev.plan,
          weeks: prev.plan.weeks.map((week) => ({
            ...week,
            sessions: week.sessions.map((s) =>
              s.sessionId === sessionId
                ? { ...s, completed: true, completedAt }
                : s,
            ),
          })),
        },
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">Running Plan</h1>
          <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            Tableau de bord
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* ── Chargement ─────────────────────────────────────────────── */}
        {state.status === 'loading' && (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ── Erreur ─────────────────────────────────────────────────── */}
        {state.status === 'error' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            Impossible de charger le plan. Veuillez réessayer.
          </div>
        )}

        {/* ── Contenu ─────────────────────────────────────────────────── */}
        {state.status === 'success' && (
          <PlanView
            plan={state.plan}
            planId={planId!}
            weekIdx={weekIdx}
            setWeekIdx={setWeekIdx}
            onSessionComplete={handleSessionComplete}
          />
        )}
      </main>
    </div>
  )
}

// ─── Sous-composants ───────────────────────────────────────────────────────

interface PlanViewProps {
  plan: PlanDetail
  planId: string
  weekIdx: number
  setWeekIdx: (i: number) => void
  onSessionComplete: (sessionId: string, completedAt: string) => void
}

function PlanView({ plan, planId, weekIdx, setWeekIdx, onSessionComplete }: PlanViewProps) {
  const week = plan.weeks[weekIdx]
  const todayIdx = currentWeekIndex(plan.weeks)

  return (
    <div className="space-y-6">
      {/* En-tête du plan */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-1">{plan.name}</h2>
        <p className="text-blue-600 font-medium mb-3">{plan.goal}</p>
        <p className="text-sm text-gray-500">
          {formatDate(plan.startDate)} → {formatDate(plan.endDate)}
        </p>
      </div>

      {/* Navigation entre semaines */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => setWeekIdx(weekIdx - 1)}
          disabled={weekIdx === 0}
          aria-label="Semaine précédente"
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Précédent
        </button>

        <span className="text-sm text-gray-500">
          Semaine {week.weekNumber} / {plan.weeks.length}
        </span>

        <button
          onClick={() => setWeekIdx(weekIdx + 1)}
          disabled={weekIdx === plan.weeks.length - 1}
          aria-label="Semaine suivante"
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Suivant →
        </button>
      </div>

      {/* Carte de la semaine */}
      <WeekCard
        week={week}
        isCurrent={weekIdx === todayIdx}
        planId={planId}
        onSessionComplete={onSessionComplete}
      />
    </div>
  )
}

interface WeekCardProps {
  week: PlanWeek
  isCurrent: boolean
  planId: string
  onSessionComplete: (sessionId: string, completedAt: string) => void
}

function WeekCard({ week, isCurrent, planId, onSessionComplete }: WeekCardProps) {
  const [completing, setCompleting] = useState<Set<string>>(new Set())

  const handleComplete = async (sessionId: string) => {
    setCompleting((prev) => new Set(prev).add(sessionId))
    try {
      const result = await completeSession(planId, sessionId)
      onSessionComplete(result.sessionId, result.completedAt)
    } finally {
      setCompleting((prev) => {
        const next = new Set(prev)
        next.delete(sessionId)
        return next
      })
    }
  }

  return (
    <div
      className={`bg-white rounded-xl shadow-sm overflow-hidden ${
        isCurrent ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      {/* En-tête de semaine */}
      <div
        className={`px-6 py-4 flex justify-between items-center ${
          isCurrent ? 'bg-blue-50' : 'bg-gray-50'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800">
              Semaine {week.weekNumber}
            </span>
            {isCurrent && (
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                En cours
              </span>
            )}
          </div>
          <span className="text-sm text-gray-500">{week.phase}</span>
        </div>
        <span className="text-sm text-gray-400">
          {formatDateShort(week.startDate)} → {formatDateShort(week.endDate)}
        </span>
      </div>

      {/* Liste des séances */}
      <ul className="divide-y divide-gray-100">
        {week.sessions.map((session) => (
          <li key={session.sessionId} className="px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Jour + type */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {DAY_LABELS[session.day] ?? session.day}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                    {SESSION_TYPE_LABELS[session.type] ?? session.type}
                  </span>
                </div>

                {/* Objectif */}
                <p className="text-sm text-gray-700 mb-2">{session.goal}</p>

                {/* Métriques */}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  {session.durationMinutes != null && (
                    <span>{session.durationMinutes} min</span>
                  )}
                  {session.distanceKm != null && (
                    <span>{session.distanceKm} km</span>
                  )}
                  {session.pace && (
                    <span>{session.pace} min/km</span>
                  )}
                </div>
              </div>

              {/* Statut / action */}
              <div className="flex-shrink-0 flex flex-col items-end gap-1">
                {session.completed ? (
                  <>
                    <span
                      className="text-xl"
                      aria-label="Séance complétée"
                    >
                      ✅
                    </span>
                    {session.completedAt && (
                      <span className="text-xs text-gray-400">
                        Effectuée le {formatCompletedAt(session.completedAt)}
                      </span>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => handleComplete(session.sessionId)}
                    disabled={completing.has(session.sessionId)}
                    aria-label="Valider la séance"
                    className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {completing.has(session.sessionId) ? '…' : 'Valider la séance'}
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
