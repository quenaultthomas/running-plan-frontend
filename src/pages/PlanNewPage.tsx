import { useState } from 'react'
import { useForm, FieldPath } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { generatePrompt } from '../services/plan'
import {
  GeneratePromptRequest,
  RunnerLevel,
  GoalType,
  LEVEL_LABELS,
  GOAL_TYPE_LABELS,
  DAY_LABELS,
  ALL_DAYS,
} from '../types/plan'

// ─── Types ────────────────────────────────────────────────────────────────

// Le form est identique au contrat API sauf weeklySessionsCount / currentLongRunDistance
// qui arrivent en string depuis les inputs et sont castés via valueAsNumber
type GeneratePromptForm = GeneratePromptRequest

// Champs à valider par étape
const STEP_FIELDS: Record<number, FieldPath<GeneratePromptForm>[]> = {
  1: [
    'runner.level',
    'runner.weeklySessionsCount',
    'runner.currentLongRunDistance',
    'runner.currentLongRunPace',
  ],
  2: ['goal.type', 'goal.raceDate'],
  3: ['planName'],
}

const STEP_LABELS = ['Profil coureur', 'Objectif', 'Contraintes']

// ─── Stepper indicator ────────────────────────────────────────────────────

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEP_LABELS.map((label, idx) => {
        const stepNum = idx + 1
        const active = current === stepNum
        const done = current > stepNum
        return (
          <div key={stepNum} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  done
                    ? 'bg-blue-600 text-white'
                    : active
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {done ? '✓' : stepNum}
              </div>
              <span
                className={`mt-1 text-xs font-medium ${
                  active ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
            {idx < STEP_LABELS.length - 1 && (
              <div
                className={`h-0.5 w-14 mb-4 mx-1 transition-colors ${
                  current > stepNum ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Field helpers ────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-red-500 text-xs mt-1">{message}</p>
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}
    </label>
  )
}

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

// ─── Page ─────────────────────────────────────────────────────────────────

export default function PlanNewPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [apiError, setApiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<GeneratePromptForm>({
    defaultValues: { constraints: { restDays: [] } },
  })

  // Avancer après validation de l'étape courante
  const goNext = async () => {
    const valid = await trigger(STEP_FIELDS[step])
    if (valid) setStep((s) => s + 1)
  }

  const goBack = () => setStep((s) => s - 1)

  // Soumission finale (étape 3)
  const onSubmit = async (data: GeneratePromptForm) => {
    setApiError(null)
    setLoading(true)
    try {
      const payload: GeneratePromptRequest = {
        ...data,
        goal: {
          ...data.goal,
          targetTime: data.goal.targetTime || undefined,
        },
        constraints: {
          ...data.constraints,
          notes: data.constraints.notes || undefined,
        },
      }
      const { prompt } = await generatePrompt(payload)
      localStorage.setItem('generatedPrompt', prompt)
      navigate('/plan/prompt', { state: { prompt } })
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setApiError(err.response.data.message as string)
      } else {
        setApiError('Une erreur est survenue. Veuillez réessayer.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">Running Plan</h1>
          <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            Tableau de bord
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold mb-6 text-center">Nouveau plan</h2>

        <Stepper current={step} />

        <div className="bg-white rounded-xl shadow-sm p-8">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>

            {/* ── Étape 1 : Profil coureur ─────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold mb-4">Profil coureur</h3>

                {/* Niveau */}
                <div>
                  <Label>Niveau</Label>
                  <select
                    {...register('runner.level', { required: 'Niveau requis' })}
                    className={inputCls}
                    defaultValue=""
                  >
                    <option value="" disabled>Choisir un niveau</option>
                    {(Object.keys(LEVEL_LABELS) as RunnerLevel[]).map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {LEVEL_LABELS[lvl]}
                      </option>
                    ))}
                  </select>
                  <FieldError message={errors.runner?.level?.message} />
                </div>

                {/* Séances par semaine */}
                <div>
                  <Label>Nombre de séances par semaine</Label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    {...register('runner.weeklySessionsCount', {
                      valueAsNumber: true,
                      required: 'Requis',
                      min: { value: 1, message: 'Minimum 1 séance' },
                      max: { value: 7, message: 'Maximum 7 séances' },
                    })}
                    className={inputCls}
                    placeholder="3"
                  />
                  <FieldError message={errors.runner?.weeklySessionsCount?.message} />
                </div>

                {/* Distance longue actuelle */}
                <div>
                  <Label>Distance de la longue sortie actuelle (km)</Label>
                  <input
                    type="number"
                    min={1}
                    step="0.1"
                    {...register('runner.currentLongRunDistance', {
                      valueAsNumber: true,
                      required: 'Requis',
                      min: { value: 1, message: 'Minimum 1 km' },
                    })}
                    className={inputCls}
                    placeholder="12"
                  />
                  <FieldError message={errors.runner?.currentLongRunDistance?.message} />
                </div>

                {/* Allure longue sortie */}
                <div>
                  <Label>Allure sur la longue sortie (MM:SS / km)</Label>
                  <input
                    type="text"
                    {...register('runner.currentLongRunPace', {
                      required: 'Allure requise',
                      pattern: {
                        value: /^\d{1,2}:\d{2}$/,
                        message: 'Format attendu : MM:SS (ex. 05:30)',
                      },
                    })}
                    className={inputCls}
                    placeholder="05:30"
                  />
                  <FieldError message={errors.runner?.currentLongRunPace?.message} />
                </div>
              </div>
            )}

            {/* ── Étape 2 : Objectif ───────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold mb-4">Objectif</h3>

                {/* Type d'objectif */}
                <div>
                  <Label>Type d'objectif</Label>
                  <select
                    {...register('goal.type', { required: 'Objectif requis' })}
                    className={inputCls}
                    defaultValue=""
                  >
                    <option value="" disabled>Choisir un objectif</option>
                    {(Object.keys(GOAL_TYPE_LABELS) as GoalType[]).map((gt) => (
                      <option key={gt} value={gt}>
                        {GOAL_TYPE_LABELS[gt]}
                      </option>
                    ))}
                  </select>
                  <FieldError message={errors.goal?.type?.message} />
                </div>

                {/* Temps cible (optionnel) */}
                <div>
                  <Label>
                    Temps cible{' '}
                    <span className="text-gray-400 font-normal">(optionnel — ex. 01:45:00)</span>
                  </Label>
                  <input
                    type="text"
                    {...register('goal.targetTime', {
                      pattern: {
                        value: /^(\d{1,2}:)?\d{2}:\d{2}$/,
                        message: 'Format attendu : HH:MM:SS ou MM:SS',
                      },
                    })}
                    className={inputCls}
                    placeholder="01:45:00"
                  />
                  <FieldError message={errors.goal?.targetTime?.message} />
                </div>

                {/* Date de course */}
                <div>
                  <Label>Date de la course</Label>
                  <input
                    type="date"
                    {...register('goal.raceDate', { required: 'Date requise' })}
                    className={inputCls}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <FieldError message={errors.goal?.raceDate?.message} />
                </div>
              </div>
            )}

            {/* ── Étape 3 : Contraintes ────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold mb-4">Contraintes & nom du plan</h3>

                {/* Nom du plan */}
                <div>
                  <Label>Nom du plan</Label>
                  <input
                    type="text"
                    {...register('planName', { required: 'Nom du plan requis' })}
                    className={inputCls}
                    placeholder="Mon plan semi-marathon printemps 2026"
                  />
                  <FieldError message={errors.planName?.message} />
                </div>

                {/* Jours de repos */}
                <div>
                  <Label>Jours de repos</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {ALL_DAYS.map((day) => (
                      <label
                        key={day}
                        className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          value={day}
                          {...register('constraints.restDays')}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm">{DAY_LABELS[day]}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label>
                    Notes{' '}
                    <span className="text-gray-400 font-normal">(optionnel)</span>
                  </Label>
                  <textarea
                    {...register('constraints.notes')}
                    rows={3}
                    className={inputCls}
                    placeholder="Blessure au genou il y a 6 mois, préférence pour les sorties le matin..."
                  />
                </div>

                {/* Erreur API */}
                {apiError && (
                  <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                    {apiError}
                  </div>
                )}
              </div>
            )}

            {/* ── Navigation ───────────────────────────────────────────── */}
            <div className="flex justify-between mt-8">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Précédent
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                >
                  Suivant
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Génération...' : 'Générer le prompt'}
                </button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
