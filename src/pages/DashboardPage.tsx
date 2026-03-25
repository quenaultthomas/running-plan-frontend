import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function DashboardPage() {
  const { logout } = useAuth()

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
        <h2 className="text-2xl font-bold mb-6">Tableau de bord</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/plan/new"
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-100"
          >
            <h3 className="font-semibold text-lg mb-2">Nouveau plan</h3>
            <p className="text-gray-500 text-sm">Créer un plan d'entraînement personnalisé</p>
          </Link>

          <Link
            to="/plan/prompt"
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-100"
          >
            <h3 className="font-semibold text-lg mb-2">Générer par IA</h3>
            <p className="text-gray-500 text-sm">Décrire votre objectif en langage naturel</p>
          </Link>

          <Link
            to="/plan/import"
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-100"
          >
            <h3 className="font-semibold text-lg mb-2">Importer</h3>
            <p className="text-gray-500 text-sm">Importer un plan depuis un fichier</p>
          </Link>
        </div>
      </main>
    </div>
  )
}
