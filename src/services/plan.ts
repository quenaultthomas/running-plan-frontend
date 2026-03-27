import api from './api'
import {
  GeneratePromptRequest,
  GeneratePromptResponse,
  ImportPlanRequest,
  PlanSummary,
  PlanSummaryWithProgress,
} from '../types/plan'

export const generatePrompt = async (
  payload: GeneratePromptRequest,
): Promise<GeneratePromptResponse> => {
  const { data } = await api.post<GeneratePromptResponse>(
    '/api/plan/generate-prompt',
    payload,
  )
  return data
}

export const importPlan = async (payload: ImportPlanRequest): Promise<PlanSummary> => {
  const { data } = await api.post<PlanSummary>('/api/plan/import', payload)
  return data
}

export const getPlans = async (): Promise<PlanSummaryWithProgress[]> => {
  const { data } = await api.get<PlanSummaryWithProgress[]>('/api/plan')
  return data
}
