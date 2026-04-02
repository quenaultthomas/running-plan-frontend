import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PlanDetailPage from '../pages/PlanDetailPage'

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockGetPlanById = vi.hoisted(() => vi.fn())
const mockSyncStrava = vi.hoisted(() => vi.fn())
const mockGetStravaStatus = vi.hoisted(() => vi.fn())

vi.mock('../services/plan', () => ({
  getPlanById: mockGetPlanById,
  completeSession: vi.fn(),
  skipSession: vi.fn(),
  updateSession: vi.fn(),
}))

vi.mock('../services/strava', () => ({
  getStravaStatus: mockGetStravaStatus,
  syncStrava: mockSyncStrava,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────

const SESSION_STRAVA: Record<string, unknown> = {
  sessionId: 'strava-session',
  sessionNumber: 1,
  day: 'MONDAY',
  type: 'EASY_RUN',
  goal: 'Footing de récupération',
  durationMinutes: 45,
  distanceKm: 8,
  pace: '5:30',
  status: 'COMPLETED',
  completedAt: '2026-03-20T08:00:00Z',
  skippedAt: null,
  stravaActivityId: 12345678,
  stravaName: 'Footing matinal',
  stravaDistanceKm: 8.2,
  stravaDurationMin: 46,
  stravaAvgPace: '5:37',
}

const SESSION_NO_STRAVA: Record<string, unknown> = {
  sessionId: 'manual-session',
  sessionNumber: 2,
  day: 'WEDNESDAY',
  type: 'LONG_RUN',
  goal: 'Sortie longue',
  durationMinutes: 90,
  distanceKm: 18,
  pace: '5:45',
  status: 'COMPLETED',
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

beforeEach(() => {
  mockGetStravaStatus.mockResolvedValue({ connected: false })
})

afterEach(() => vi.clearAllMocks())

// ─── Correction 1 — Détails réels Strava ──────────────────────────────────

describe('PlanDetailPage — détails réels Strava', () => {
  it('affiche les détails Strava sous les infos prévues', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText(/Via Strava/)
    const details = screen.getByText(/Footing matinal/)
    expect(details.textContent).toContain('8.2 km')
    expect(details.textContent).toContain('46 min')
    expect(details.textContent).toContain('5:37 /km')
  })

  it('affiche les champs disponibles séparés par " · "', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText(/Via Strava/)
    const details = screen.getByText(/Footing matinal/)
    expect(details.textContent).toBe('Footing matinal · 8.2 km · 46 min · 5:37 /km')
  })

  it("n'affiche qu'un seul bloc de détails Strava", async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText(/Via Strava/)
    const detailsElements = document.querySelectorAll('p.italic')
    expect(detailsElements).toHaveLength(1)
    expect(detailsElements[0].textContent).toContain('Footing matinal')
  })

  it('affiche uniquement les champs non nuls si certains manquent', async () => {
    const planPartial = {
      ...PLAN,
      weeks: [{
        ...PLAN.weeks[0],
        sessions: [{
          ...SESSION_STRAVA,
          stravaName: 'Course rapide',
          stravaDistanceKm: 10,
          stravaDurationMin: undefined,
          stravaAvgPace: undefined,
        }],
      }],
    }
    mockGetPlanById.mockResolvedValue(planPartial)
    renderPage()
    await screen.findByText(/Via Strava/)
    const details = screen.getByText(/Course rapide/)
    expect(details.textContent).toBe('Course rapide · 10 km')
  })

  it("n'affiche pas de détails si stravaActivityId est absent", async () => {
    const planNoStrava = {
      ...PLAN,
      weeks: [{ ...PLAN.weeks[0], sessions: [SESSION_NO_STRAVA] }],
    }
    mockGetPlanById.mockResolvedValue(planNoStrava)
    renderPage()
    await screen.findByText('Plan test Strava') // attend le chargement du plan
    expect(document.querySelectorAll('p.italic')).toHaveLength(0)
  })
})

// ─── Correction 2 — Badge 🟠 Via Strava remplace ✅ Réalisée ──────────────

describe('PlanDetailPage — badge Via Strava remplace ✅ Réalisée', () => {
  it('affiche "🟠 Via Strava" pour une séance COMPLETED avec stravaActivityId', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    expect(await screen.findByText(/Via Strava/)).toBeInTheDocument()
  })

  it("n'affiche pas '✅ Réalisée' pour une séance validée via Strava", async () => {
    const planOnlyStrava = {
      ...PLAN,
      weeks: [{ ...PLAN.weeks[0], sessions: [SESSION_STRAVA] }],
    }
    mockGetPlanById.mockResolvedValue(planOnlyStrava)
    renderPage()
    await screen.findByText(/Via Strava/)
    expect(screen.queryByText(/Réalisée/)).not.toBeInTheDocument()
  })

  it("affiche '✅ Réalisée' pour une séance COMPLETED sans stravaActivityId", async () => {
    const planOnlyManual = {
      ...PLAN,
      weeks: [{ ...PLAN.weeks[0], sessions: [SESSION_NO_STRAVA] }],
    }
    mockGetPlanById.mockResolvedValue(planOnlyManual)
    renderPage()
    expect(await screen.findByText(/Réalisée/)).toBeInTheDocument()
    expect(screen.queryByText(/Via Strava/)).not.toBeInTheDocument()
  })

  it('affiche exactement 1 badge Via Strava et 1 badge Réalisée dans le plan mixte', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText(/Via Strava/)
    expect(screen.getAllByText(/Via Strava/)).toHaveLength(1)
    expect(screen.getAllByText(/Réalisée/)).toHaveLength(1)
  })

  it('conserve la date de validation sous le badge Strava', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText(/Via Strava/)
    // completedAt: 2026-03-20 → formatCompletedAt → 20/03/2026
    expect(screen.getByText(/20\/03\/2026/)).toBeInTheDocument()
  })
})

// ─── Correction 3 — Bouton "Synchroniser avec Strava" sur /plan/:planId ───

describe('PlanDetailPage — bouton Synchroniser avec Strava', () => {
  it("n'affiche pas le bouton si Strava non connecté", async () => {
    mockGetStravaStatus.mockResolvedValue({ connected: false })
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText(/Via Strava/)
    expect(
      screen.queryByRole('button', { name: /synchroniser avec strava/i }),
    ).not.toBeInTheDocument()
  })

  it('affiche le bouton si Strava est connecté', async () => {
    mockGetStravaStatus.mockResolvedValue({ connected: true })
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    expect(
      await screen.findByRole('button', { name: /synchroniser avec strava/i }),
    ).toBeInTheDocument()
  })

  it('appelle syncStrava puis recharge le plan au clic', async () => {
    mockGetStravaStatus.mockResolvedValue({ connected: true })
    mockGetPlanById.mockResolvedValue(PLAN)
    mockSyncStrava.mockResolvedValue({ activitiesAnalyzed: 3, sessionsValidated: 1 })
    const user = userEvent.setup()
    renderPage()

    const btn = await screen.findByRole('button', { name: /synchroniser avec strava/i })
    await user.click(btn)

    await waitFor(() => expect(mockSyncStrava).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(mockGetPlanById).toHaveBeenCalledTimes(2))
  })

  it('désactive le bouton pendant la synchronisation', async () => {
    mockGetStravaStatus.mockResolvedValue({ connected: true })
    mockGetPlanById.mockResolvedValue(PLAN)
    mockSyncStrava.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderPage()

    const btn = await screen.findByRole('button', { name: /synchroniser avec strava/i })
    await user.click(btn)

    expect(await screen.findByRole('button', { name: /synchronisation…/i })).toBeDisabled()
  })
})
