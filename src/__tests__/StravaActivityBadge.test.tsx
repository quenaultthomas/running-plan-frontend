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
  stravaName: 'Footing matinal',
  stravaDistanceKm: 8.2,
  stravaDurationMin: 46,
  stravaAvgPace: '5:37',
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

  it('affiche le badge "Via Strava" pour une séance PENDING avec stravaActivityId', async () => {
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
    await screen.findByText('Footing de récupération')
    expect(screen.getByText('Via Strava')).toBeInTheDocument()
  })
})

// ─── Tests détails Strava ──────────────────────────────────────────────────

describe('PlanDetailPage — détails réels Strava', () => {
  it('affiche les détails Strava sous les infos prévues', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText('Via Strava')
    const details = screen.getByText(/Footing matinal/)
    expect(details).toBeInTheDocument()
    expect(details.textContent).toContain('8.2 km')
    expect(details.textContent).toContain('46 min')
    expect(details.textContent).toContain('5:37 /km')
  })

  it('affiche les champs disponibles séparés par " · "', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText('Via Strava')
    const details = screen.getByText(/Footing matinal/)
    expect(details.textContent).toBe('Footing matinal · 8.2 km · 46 min · 5:37 /km')
  })

  it("n'affiche qu'un seul bloc de détails Strava (SESSION_NO_STRAVA n'en a pas)", async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText('Via Strava')
    // Un seul élément de détails Strava : celui de SESSION_STRAVA
    const detailsElements = document.querySelectorAll('p.italic')
    expect(detailsElements).toHaveLength(1)
    expect(detailsElements[0].textContent).toContain('Footing matinal')
  })

  it('affiche uniquement les champs non nuls si certains manquent', async () => {
    const planPartial = {
      ...PLAN,
      weeks: [
        {
          ...PLAN.weeks[0],
          sessions: [
            {
              ...SESSION_STRAVA,
              stravaName: 'Course rapide',
              stravaDistanceKm: 10,
              stravaDurationMin: undefined,
              stravaAvgPace: undefined,
            },
          ],
        },
      ],
    }
    mockGetPlanById.mockResolvedValue(planPartial)
    renderPage()
    await screen.findByText('Via Strava')
    const details = screen.getByText(/Course rapide/)
    expect(details.textContent).toBe('Course rapide · 10 km')
  })
})
