import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'

interface LocationState {
  prompt?: string
}

export default function PlanPromptPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const prompt =
    (state as LocationState | null)?.prompt ??
    localStorage.getItem('generatedPrompt') ??
    ''

  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
        <h2 className="text-2xl font-bold mb-2">Prompt généré</h2>

        {prompt ? (
          <>
            {/* Zone de texte non éditable */}
            <textarea
              readOnly
              value={prompt}
              rows={14}
              className="w-full mt-4 border border-gray-200 rounded-xl p-4 text-sm text-gray-800 font-mono leading-relaxed bg-white shadow-sm resize-none focus:outline-none"
            />

            {/* Message d'instruction */}
            <div className="mt-4 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <span className="text-blue-500 text-lg mt-0.5">ℹ</span>
              <p className="text-sm text-blue-800">
                Collez ce prompt dans Claude, puis revenez ici pour importer le plan généré.
              </p>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleCopy}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                {copied ? '✓ Copié !' : 'Copier le prompt'}
              </button>

              <a
                href="https://claude.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors text-center"
              >
                Ouvrir Claude ↗
              </a>

              <button
                onClick={() => navigate('/plan/import')}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Importer mon plan
              </button>
            </div>
          </>
        ) : (
          <div className="mt-6 bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
            <p className="text-gray-500 mb-4">Aucun prompt disponible.</p>
            <Link to="/plan/new" className="text-blue-600 hover:underline text-sm">
              Créer un plan pour générer un prompt
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
