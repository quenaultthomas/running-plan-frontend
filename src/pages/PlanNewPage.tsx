import { Link } from 'react-router-dom'

export default function PlanNewPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Nouveau plan</h1>
        <p className="text-gray-500 mb-6">Création d'un plan d'entraînement personnalisé</p>
        <Link to="/dashboard" className="text-blue-600 hover:underline text-sm">
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  )
}
