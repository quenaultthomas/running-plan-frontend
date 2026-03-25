import { Link } from 'react-router-dom'

export default function PlanImportPage() {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      console.log('Fichier sélectionné :', file.name)
      // TODO: appel API import
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-bold mb-6">Importer un plan</h1>

        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors">
          <span className="text-gray-400 text-sm mb-2">Cliquez pour sélectionner un fichier</span>
          <span className="text-gray-300 text-xs">JSON, CSV acceptés</span>
          <input
            type="file"
            accept=".json,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        <div className="mt-6 text-center">
          <Link to="/dashboard" className="text-blue-600 hover:underline text-sm">
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  )
}
