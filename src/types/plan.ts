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
