import { useLocation, Link } from 'react-router-dom'

interface LocationState {
  prompt?: string
}

export default function PlanPromptPage() {
  const { state } = useLocation()
  const prompt =
    (state as LocationState | null)?.prompt ??
    localStorage.getItem('generatedPrompt') ??
    ''

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
        <p className="text-gray-500 text-sm mb-6">
          Ce prompt a été généré à partir de votre profil. Vous pouvez le copier et
          l'utiliser directement avec un modèle IA.
        </p>

        {prompt ? (
          <>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                {prompt}
              </pre>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => navigator.clipboard.writeText(prompt)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Copier le prompt
              </button>
              <Link
                to="/plan/new"
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                Nouveau plan
              </Link>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
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
