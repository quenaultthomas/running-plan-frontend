import api from './api'
import { GeneratePromptRequest, GeneratePromptResponse } from '../types/plan'

export const generatePrompt = async (
  payload: GeneratePromptRequest,
): Promise<GeneratePromptResponse> => {
  const { data } = await api.post<GeneratePromptResponse>(
    '/api/plan/generate-prompt',
    payload,
  )
  return data
}
