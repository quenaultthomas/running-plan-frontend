import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'

interface PromptForm {
  prompt: string
}

export default function PlanPromptPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<PromptForm>()

  const onSubmit = (data: PromptForm) => {
    console.log('Prompt soumis :', data.prompt)
    // TODO: appel API génération IA
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-bold mb-6">Générer un plan par IA</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Décrivez votre objectif
            </label>
            <textarea
              {...register('prompt', { required: 'Veuillez décrire votre objectif' })}
              rows={5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex : Je veux courir un semi-marathon dans 3 mois, je cours 3 fois par semaine..."
            />
            {errors.prompt && (
              <p className="text-red-500 text-xs mt-1">{errors.prompt.message}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Générer le plan
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/dashboard" className="text-blue-600 hover:underline text-sm">
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  )
}
