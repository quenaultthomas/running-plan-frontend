import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { importPlan } from '../services/plan'
import { PlanSummary } from '../types/plan'

// ─── État machine ──────────────────────────────────────────────────────────

type ImportState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'preview'; plan: PlanSummary }
  | { status: 'error'; message: string }

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function PlanImportPage() {
  const navigate = useNavigate()
  const [jsonText, setJsonText] = useState('')
  const [state, setState] = useState<ImportState>({ status: 'idle' })

  const handleValidate = async () => {
    // Validation syntaxique côté client
    try {
      JSON.parse(jsonText)
    } catch {
      setState({ status: 'error', message: 'JSON invalide — vérifiez la syntaxe.' })
      return
    }

    setState({ status: 'loading' })
    try {
      const plan = await importPlan({ planJson: jsonText })
      setState({ status: 'preview', plan })
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? (err.response.data.message as string)
          : 'Une erreur est survenue. Veuillez réessayer.'
      setState({ status: 'error', message })
    }
  }

  const handleReset = () => {
    setState({ status: 'idle' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">Running Plan</h1>
          <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            Tableau de bord
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold mb-2">Importer un plan</h2>
        <p className="text-gray-500 text-sm mb-6">
          Collez le JSON généré par Claude ci-dessous.
        </p>

        {/* ── Saisie JSON ─────────────────────────────────────────────── */}
        {(state.status === 'idle' || state.status === 'error') && (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              JSON du plan
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={14}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder={'{\n  "planName": "Mon plan",\n  ...\n}'}
            />

            {state.status === 'error' && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <span className="mt-0.5">✕</span>
                <span>{state.message}</span>
              </div>
            )}

            <button
              onClick={handleValidate}
              disabled={!jsonText.trim()}
              className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              Valider et importer
            </button>
          </div>
        )}

        {/* ── Chargement ──────────────────────────────────────────────── */}
        {state.status === 'loading' && (
          <div className="bg-white rounded-xl shadow-sm p-12 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Validation en cours…</p>
          </div>
        )}

        {/* ── Aperçu ──────────────────────────────────────────────────── */}
        {state.status === 'preview' && (
          <div className="space-y-4">
            {/* Carte récapitulatif */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-green-200">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-green-600 text-lg">✓</span>
                <h3 className="font-semibold text-green-700">Plan validé avec succès</h3>
              </div>

              <h4 className="text-lg font-bold mb-1">{state.plan.name}</h4>
              <p className="text-blue-600 text-sm font-medium mb-4">{state.plan.goal}</p>

              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-gray-500">Début</dt>
                  <dd className="font-medium">{formatDate(state.plan.startDate)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Fin</dt>
                  <dd className="font-medium">{formatDate(state.plan.endDate)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Semaines</dt>
                  <dd className="font-medium">{state.plan.weeksCount} semaines</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Séances</dt>
                  <dd className="font-medium">{state.plan.sessionsCount} séances</dd>
                </div>
              </dl>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                Modifier le JSON
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Confirmer l'import
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
