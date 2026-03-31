import api from './api'

export interface StravaStatus {
  connected: boolean
  athleteName?: string
  connectedAt?: string
}

export interface StravaAuthResponse {
  authUrl: string
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
