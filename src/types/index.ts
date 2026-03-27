export interface User {
  id: string
  username: string
}

export interface RunningPlan {
  id: string
  title: string
  description: string
  createdAt: string
  weeks: Week[]
}

export interface Week {
  weekNumber: number
  sessions: Session[]
}

export interface Session {
  day: string
  type: string
  distance: number
  duration: number
  notes: string
}
