import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PlanDetailPage from '../pages/PlanDetailPage'

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockGetPlanById = vi.hoisted(() => vi.fn())
vi.mock('../services/plan', () => ({
  getPlanById: mockGetPlanById,
  completeSession: vi.fn(),
  skipSession: vi.fn(),
  updateSession: vi.fn(),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────

const SESSION_STRAVA = {
  sessionId: 'strava-session',
  sessionNumber: 1,
  day: 'MONDAY' as const,
  type: 'EASY_RUN',
  goal: 'Footing de récupération',
  durationMinutes: 45,
  distanceKm: 8,
  pace: '5:30',
  status: 'COMPLETED' as const,
  completedAt: '2026-03-20T08:00:00Z',
  skippedAt: null,
  stravaActivityId: 12345678,
}

const SESSION_NO_STRAVA = {
  sessionId: 'manual-session',
  sessionNumber: 2,
  day: 'WEDNESDAY' as const,
  type: 'LONG_RUN',
  goal: 'Sortie longue',
  durationMinutes: 90,
  distanceKm: 18,
  pace: '5:45',
  status: 'COMPLETED' as const,
  completedAt: '2026-03-21T08:00:00Z',
  skippedAt: null,
}

const PLAN = {
  planId: 'plan-strava',
  name: 'Plan test Strava',
  goal: 'Finir un marathon',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  weeks: [
    {
      weekId: 'w1',
      weekNumber: 1,
      phase: 'Base',
      startDate: '2026-01-01',
      endDate: '2026-01-07',
      sessions: [SESSION_STRAVA, SESSION_NO_STRAVA],
    },
  ],
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/plan/plan-strava']}>
      <Routes>
        <Route path="/plan/:planId" element={<PlanDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => vi.clearAllMocks())

// ─── Tests badge "Via Strava" ──────────────────────────────────────────────

describe('PlanDetailPage — badge Via Strava', () => {
  it('affiche le badge "Via Strava" pour une séance avec stravaActivityId', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    expect(await screen.findByText('Via Strava')).toBeInTheDocument()
  })

  it("n'affiche pas le badge pour une séance sans stravaActivityId", async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText('Via Strava')
    // Seul 1 badge "Via Strava" doit être présent (pas 2)
    expect(screen.getAllByText('Via Strava')).toHaveLength(1)
  })

  it("n'affiche pas le badge pour une séance PENDING", async () => {
    const planWithPending = {
      ...PLAN,
      weeks: [
        {
          ...PLAN.weeks[0],
          sessions: [
            {
              ...SESSION_STRAVA,
              status: 'PENDING' as const,
              completedAt: null,
            },
          ],
        },
      ],
    }
    mockGetPlanById.mockResolvedValue(planWithPending)
    renderPage()
    // Attendre que le plan charge
    await screen.findByText('Footing de récupération')
    expect(screen.queryByText('Via Strava')).not.toBeInTheDocument()
  })
})
