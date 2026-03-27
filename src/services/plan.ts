import api from './api'
import {
  CompleteSessionResponse,
  GeneratePromptRequest,
  GeneratePromptResponse,
  ImportPlanRequest,
  PlanDetail,
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

export const getPlanById = async (planId: string): Promise<PlanDetail> => {
  const { data } = await api.get<PlanDetail>(`/api/plan/${planId}`)
  return data
}

export const completeSession = async (
  planId: string,
  sessionId: string,
): Promise<CompleteSessionResponse> => {
  const { data } = await api.patch<CompleteSessionResponse>(
    `/api/plan/${planId}/sessions/${sessionId}/complete`,
  )
  return data
}
