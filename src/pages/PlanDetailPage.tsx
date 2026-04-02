import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { completeSession, getPlanById, skipSession, updateSession } from '../services/plan'
import {
  ALL_DAYS,
  BLOCK_TYPE_ICONS,
  BLOCK_TYPE_LABELS,
  DAY_LABELS,
  DayOfWeek,
  PlanDetail,
  PlanSession,
  PlanWeek,
  SESSION_TYPE_LABELS,
  SessionBlock,
  UpdateSessionResponse,
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

// ─── Affichage des blocs de séance ─────────────────────────────────────────

function BlockItem({ block }: { block: SessionBlock }) {
  const icon = BLOCK_TYPE_ICONS[block.blockType] ?? '▸'
  const label = BLOCK_TYPE_LABELS[block.blockType] ?? block.blockType

  const metrics: string[] = []
  if (block.repetitions != null) metrics.push(`${block.repetitions} ×`)
  if (block.effortDurationSeconds != null) {
    const m = Math.floor(block.effortDurationSeconds / 60)
    const s = block.effortDurationSeconds % 60
    metrics.push(`effort ${m > 0 ? `${m}min ` : ''}${s > 0 ? `${s}s` : ''}`.trim())
  }
  if (block.recoveryDurationSeconds != null) {
    const m = Math.floor(block.recoveryDurationSeconds / 60)
    const s = block.recoveryDurationSeconds % 60
    metrics.push(`récup. ${m > 0 ? `${m}min ` : ''}${s > 0 ? `${s}s` : ''}`.trim())
  }
  if (block.durationMinutes != null) metrics.push(`${block.durationMinutes} min`)
  if (block.distanceKm != null) metrics.push(`${block.distanceKm} km`)
  if (block.pace) metrics.push(`${block.pace} min/km`)

  return (
    <li className="flex items-start gap-3 py-2">
      <span className="text-base mt-0.5 select-none" aria-hidden="true">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-700">{block.label}</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
            {label}
          </span>
        </div>
        {metrics.length > 0 && (
          <p className="text-xs text-gray-500 mt-0.5">{metrics.join(' · ')}</p>
        )}
        {block.description && (
          <p className="text-xs text-gray-400 italic mt-0.5">{block.description}</p>
        )}
      </div>
    </li>
  )
}

// ─── Modale de modification de séance ─────────────────────────────────────

type EditFormValues = {
  durationMinutes: string
  distanceKm: string
  dayOfWeek: DayOfWeek | ''
}

/** Calcule l'allure MM:SS/km à partir de la durée (min) et de la distance (km). */
function calcPace(durationMinutes: string, distanceKm: string): string | null {
  const dur = Number(durationMinutes)
  const dist = Number(distanceKm)
  if (!durationMinutes || !distanceKm || dur <= 0 || dist <= 0) return null
  const totalSeconds = Math.round((dur / dist) * 60)
  const mm = Math.floor(totalSeconds / 60)
  const ss = String(totalSeconds % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

interface EditSessionModalProps {
  session: PlanSession
  planId: string
  onSuccess: (response: UpdateSessionResponse) => void
  onClose: () => void
}

function EditSessionModal({ session, planId, onSuccess, onClose }: EditSessionModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    defaultValues: {
      durationMinutes: session.durationMinutes != null ? String(session.durationMinutes) : '',
      distanceKm: session.distanceKm != null ? String(session.distanceKm) : '',
      dayOfWeek: session.day,
    },
  })

  const [submitError, setSubmitError] = useState<string | null>(null)

  const durationValue = watch('durationMinutes')
  const distanceValue = watch('distanceKm')
  const calculatedPace = calcPace(durationValue, distanceValue)

  const onSubmit = async (values: EditFormValues) => {
    setSubmitError(null)
    const payload: Record<string, unknown> = {}
    if (values.durationMinutes !== '') payload.durationMinutes = Number(values.durationMinutes)
    if (values.distanceKm !== '') payload.distanceKm = Number(values.distanceKm)
    const pace = calcPace(values.durationMinutes, values.distanceKm)
    if (pace !== null) payload.pace = pace
    if (values.dayOfWeek !== '') payload.dayOfWeek = values.dayOfWeek

    try {
      const response = await updateSession(planId, session.sessionId, payload)
      onSuccess(response)
    } catch {
      setSubmitError('La modification a échoué. Veuillez réessayer.')
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm">
        <div className="px-6 pt-6 pb-2">
          <h3 id="edit-modal-title" className="text-lg font-semibold mb-1">
            Modifier la séance
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {SESSION_TYPE_LABELS[session.type] ?? session.type}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="px-6 space-y-4">
            {/* Durée */}
            <div>
              <label htmlFor="edit-duration" className="block text-sm font-medium text-gray-700 mb-1">
                Durée (minutes)
              </label>
              <input
                id="edit-duration"
                type="number"
                min="1"
                placeholder="ex : 45"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.durationMinutes ? 'border-red-400' : 'border-gray-300'
                }`}
                {...register('durationMinutes', {
                  validate: (v) =>
                    v === '' || Number(v) > 0 || 'La durée doit être supérieure à 0',
                })}
              />
              {errors.durationMinutes && (
                <p className="text-xs text-red-600 mt-1">{errors.durationMinutes.message}</p>
              )}
            </div>

            {/* Distance */}
            <div>
              <label htmlFor="edit-distance" className="block text-sm font-medium text-gray-700 mb-1">
                Distance (km)
              </label>
              <input
                id="edit-distance"
                type="number"
                min="0.1"
                step="0.1"
                placeholder="ex : 8"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.distanceKm ? 'border-red-400' : 'border-gray-300'
                }`}
                {...register('distanceKm', {
                  validate: (v) =>
                    v === '' || Number(v) > 0 || 'La distance doit être supérieure à 0',
                })}
              />
              {errors.distanceKm && (
                <p className="text-xs text-red-600 mt-1">{errors.distanceKm.message}</p>
              )}
            </div>

            {/* Allure calculée (lecture seule) */}
            {calculatedPace !== null && (
              <p className="text-sm text-gray-600">
                Allure calculée :{' '}
                <span className="font-mono font-semibold text-blue-700">{calculatedPace} min/km</span>
              </p>
            )}

            {/* Jour */}
            <div>
              <label htmlFor="edit-day" className="block text-sm font-medium text-gray-700 mb-1">
                Jour de la semaine
              </label>
              <select
                id="edit-day"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('dayOfWeek')}
              >
                <option value="">— inchangé —</option>
                {ALL_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {DAY_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>

            {/* Erreur serveur */}
            {submitError && (
              <p className="text-xs text-red-600">{submitError}</p>
            )}
          </div>

          <div className="px-6 py-5 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

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
                ? { ...s, status: 'COMPLETED' as const, completedAt }
                : s,
            ),
          })),
        },
      }
    })
  }

  const handleSessionSkip = (sessionId: string, skippedAt: string) => {
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
                ? { ...s, status: 'SKIPPED' as const, skippedAt }
                : s,
            ),
          })),
        },
      }
    })
  }

  const handleSessionUpdate = (response: UpdateSessionResponse) => {
    setState((prev) => {
      if (prev.status !== 'success') return prev
      return {
        ...prev,
        plan: {
          ...prev.plan,
          weeks: prev.plan.weeks.map((week) => ({
            ...week,
            sessions: week.sessions.map((s) =>
              s.sessionId === response.sessionId
                ? {
                    ...s,
                    durationMinutes: response.durationMinutes,
                    distanceKm: response.distanceKm,
                    pace: response.pace,
                    day: response.dayOfWeek,
                  }
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
            onSessionSkip={handleSessionSkip}
            onSessionUpdate={handleSessionUpdate}
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
  onSessionSkip: (sessionId: string, skippedAt: string) => void
  onSessionUpdate: (response: UpdateSessionResponse) => void
}

function PlanView({
  plan,
  planId,
  weekIdx,
  setWeekIdx,
  onSessionComplete,
  onSessionSkip,
  onSessionUpdate,
}: PlanViewProps) {
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
        onSessionSkip={onSessionSkip}
        onSessionUpdate={onSessionUpdate}
      />
    </div>
  )
}

interface WeekCardProps {
  week: PlanWeek
  isCurrent: boolean
  planId: string
  onSessionComplete: (sessionId: string, completedAt: string) => void
  onSessionSkip: (sessionId: string, skippedAt: string) => void
  onSessionUpdate: (response: UpdateSessionResponse) => void
}

function WeekCard({ week, isCurrent, planId, onSessionComplete, onSessionSkip, onSessionUpdate }: WeekCardProps) {
  const [completing, setCompleting] = useState<Set<string>>(new Set())
  const [skipping, setSkipping] = useState<Set<string>>(new Set())
  const [editingSession, setEditingSession] = useState<PlanSession | null>(null)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())

  const toggleBlocks = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev)
      if (next.has(sessionId)) next.delete(sessionId)
      else next.add(sessionId)
      return next
    })
  }

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

  const handleSkip = async (sessionId: string) => {
    setSkipping((prev) => new Set(prev).add(sessionId))
    try {
      const result = await skipSession(planId, sessionId)
      onSessionSkip(result.sessionId, result.skippedAt)
    } finally {
      setSkipping((prev) => {
        const next = new Set(prev)
        next.delete(sessionId)
        return next
      })
    }
  }

  const handleEditSuccess = (response: UpdateSessionResponse) => {
    setEditingSession(null)
    onSessionUpdate(response)
  }

  return (
    <>
      {editingSession && (
        <EditSessionModal
          session={editingSession}
          planId={planId}
          onSuccess={handleEditSuccess}
          onClose={() => setEditingSession(null)}
        />
      )}

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

                  {/* Détails réels Strava */}
                  {session.stravaActivityId != null && (
                    session.stravaName != null ||
                    session.stravaDistanceKm != null ||
                    session.stravaDurationMin != null ||
                    session.stravaAvgPace != null
                  ) && (
                    <p className="text-xs text-gray-400 italic mt-1">
                      {[
                        session.stravaName,
                        session.stravaDistanceKm != null ? `${session.stravaDistanceKm} km` : null,
                        session.stravaDurationMin != null ? `${session.stravaDurationMin} min` : null,
                        session.stravaAvgPace != null ? `${session.stravaAvgPace} /km` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}

                  {/* Toggle blocs — uniquement pour INTERVAL et TEMPO */}
                  {(session.type === 'INTERVAL' || session.type === 'TEMPO') &&
                    session.blocks &&
                    session.blocks.length > 0 && (
                    <button
                      onClick={() => toggleBlocks(session.sessionId)}
                      aria-expanded={expandedSessions.has(session.sessionId)}
                      aria-controls={`blocks-${session.sessionId}`}
                      className="mt-2 text-xs text-blue-600 hover:underline focus:outline-none"
                    >
                      {expandedSessions.has(session.sessionId)
                        ? 'Masquer les blocs'
                        : `Voir les blocs (${session.blocks.length})`}
                    </button>
                  )}

                  {/* Liste des blocs */}
                  {(session.type === 'INTERVAL' || session.type === 'TEMPO') &&
                    session.blocks &&
                    session.blocks.length > 0 &&
                    expandedSessions.has(session.sessionId) && (
                      <ul
                        id={`blocks-${session.sessionId}`}
                        className="mt-2 pl-1 divide-y divide-gray-100 border border-gray-100 rounded-lg px-3"
                      >
                        {session.blocks.map((block, idx) => (
                          <BlockItem key={idx} block={block} />
                        ))}
                      </ul>
                    )}
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                  {/* Bouton Modifier (toujours visible) */}
                  <button
                    onClick={() => setEditingSession(session)}
                    aria-label="Modifier la séance"
                    className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Modifier
                  </button>

                  {/* Badge Via Strava (visible dès que stravaActivityId est renseigné) */}
                  {session.stravaActivityId != null && (
                    <span
                      className="inline-flex items-center text-xs font-medium text-white px-2 py-1 rounded-full"
                      style={{ backgroundColor: '#FC4C02' }}
                    >
                      Via Strava
                    </span>
                  )}

                  {/* COMPLETED */}
                  {session.status === 'COMPLETED' && (
                    <>
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full"
                        aria-label="Séance réalisée"
                      >
                        ✅ Réalisée
                      </span>
                      {session.completedAt && (
                        <span className="text-xs text-gray-400">
                          le {formatCompletedAt(session.completedAt)}
                        </span>
                      )}
                    </>
                  )}

                  {/* SKIPPED */}
                  {session.status === 'SKIPPED' && (
                    <>
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 px-2 py-1 rounded-full"
                        aria-label="Séance sautée"
                      >
                        ⏭️ Sautée
                      </span>
                      {session.skippedAt && (
                        <span className="text-xs text-gray-400">
                          le {formatCompletedAt(session.skippedAt)}
                        </span>
                      )}
                    </>
                  )}

                  {/* PENDING */}
                  {session.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleComplete(session.sessionId)}
                        disabled={completing.has(session.sessionId)}
                        aria-label="Valider la séance"
                        className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {completing.has(session.sessionId) ? '…' : 'Valider la séance'}
                      </button>
                      <button
                        onClick={() => handleSkip(session.sessionId)}
                        disabled={skipping.has(session.sessionId)}
                        aria-label="Passer la séance"
                        className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {skipping.has(session.sessionId) ? '…' : 'Passer la séance'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
