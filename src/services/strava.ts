import api from './api'

export interface StravaStatus {
  connected: boolean
  athleteName?: string
  connectedAt?: string
}

export interface StravaAuthResponse {
  authUrl: string
}

export interface StravaSyncResponse {
  activitiesAnalyzed: number
  sessionsValidated: number
}

export async function getStravaStatus(): Promise<StravaStatus> {
  const { data } = await api.get<StravaStatus>('/api/strava/status')
  return data
}

export async function getStravaAuthUrl(): Promise<StravaAuthResponse> {
  const { data } = await api.get<StravaAuthResponse>('/api/strava/auth')
  return data
}

export async function disconnectStrava(): Promise<void> {
  await api.delete('/api/strava/disconnect')
}

export async function syncStrava(): Promise<StravaSyncResponse> {
  const { data } = await api.post<StravaSyncResponse>('/api/strava/sync')
  return data
}
