import api from './api'
import {
  ArchivePlanResponse,
  CompleteSessionResponse,
  GeneratePromptRequest,
  GeneratePromptResponse,
  ImportPlanRequest,
  PlanDetail,
  PlanStats,
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

export const archivePlan = async (planId: string): Promise<ArchivePlanResponse> => {
  const { data } = await api.patch<ArchivePlanResponse>(`/api/plan/${planId}/archive`)
  return data
}

export const getPlanStats = async (planId: string): Promise<PlanStats> => {
  const { data } = await api.get<PlanStats>(`/api/plan/${planId}/stats`)
  return data
}

export const deletePlan = async (planId: string): Promise<void> => {
  await api.delete(`/api/plan/${planId}`)
}
