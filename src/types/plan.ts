export type RunnerLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

export type GoalType = 'FIVE_KM' | 'TEN_KM' | 'HALF_MARATHON' | 'MARATHON'

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY'

export interface GeneratePromptRequest {
  planName: string
  runner: {
    level: RunnerLevel
    weeklySessionsCount: number
    currentLongRunDistance: number
    currentLongRunPace: string
  }
  goal: {
    type: GoalType
    targetTime?: string
    raceDate: string
  }
  constraints: {
    restDays: DayOfWeek[]
    notes?: string
  }
}

export interface GeneratePromptResponse {
  prompt: string
}

export const LEVEL_LABELS: Record<RunnerLevel, string> = {
  BEGINNER: 'Débutant',
  INTERMEDIATE: 'Intermédiaire',
  ADVANCED: 'Avancé',
}

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  FIVE_KM: '5 km',
  TEN_KM: '10 km',
  HALF_MARATHON: 'Semi-marathon',
  MARATHON: 'Marathon',
}

export const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Lundi',
  TUESDAY: 'Mardi',
  WEDNESDAY: 'Mercredi',
  THURSDAY: 'Jeudi',
  FRIDAY: 'Vendredi',
  SATURDAY: 'Samedi',
  SUNDAY: 'Dimanche',
}

export const ALL_DAYS: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]

// ─── Import & plan list ───────────────────────────────────────────────────

export interface ImportPlanRequest {
  planJson: string
}

/** Réponse POST /api/plan/import (201) et élément de GET /api/plan */
export interface PlanSummary {
  planId: string
  name: string
  goal: string
  startDate: string
  endDate: string
  weeksCount: number
  sessionsCount: number
}

/** Élément de GET /api/plan — inclut la progression */
export interface PlanSummaryWithProgress extends PlanSummary {
  completedSessionsCount: number
}

// ─── Plan detail ──────────────────────────────────────────────────────────

export type SessionType =
  | 'EASY_RUN'
  | 'LONG_RUN'
  | 'INTERVAL'
  | 'TEMPO'
  | 'THRESHOLD'
  | 'RECOVERY'
  | 'HILL_REPEAT'
  | 'CROSS_TRAINING'
  | 'RACE'
  | 'REST'

export const SESSION_TYPE_LABELS: Record<string, string> = {
  EASY_RUN: 'Footing facile',
  LONG_RUN: 'Sortie longue',
  INTERVAL: 'Intervalles',
  TEMPO: 'Tempo',
  THRESHOLD: 'Seuil',
  RECOVERY: 'Récupération',
  HILL_REPEAT: 'Côtes',
  CROSS_TRAINING: 'Cross-training',
  RACE: 'Course',
  REST: 'Repos',
}

export interface PlanSession {
  sessionId: string
  sessionNumber: number
  day: DayOfWeek
  type: string
  goal: string
  durationMinutes: number | null
  distanceKm: number | null
  pace: string | null
  completed: boolean
  completedAt: string | null
}

export interface PlanWeek {
  weekId: string
  weekNumber: number
  phase: string
  startDate: string
  endDate: string
  sessions: PlanSession[]
}

export interface PlanDetail {
  planId: string
  name: string
  goal: string
  startDate: string
  endDate: string
  weeks: PlanWeek[]
}

export interface CompleteSessionResponse {
  sessionId: string
  completed: true
  completedAt: string
}
