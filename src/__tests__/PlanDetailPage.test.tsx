import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PlanDetailPage from '../pages/PlanDetailPage'

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockGetPlanById = vi.hoisted(() => vi.fn())
const mockCompleteSession = vi.hoisted(() => vi.fn())
vi.mock('../services/plan', () => ({
  getPlanById: mockGetPlanById,
  completeSession: mockCompleteSession,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────

const SESSION_BASE = {
  sessionId: 's1',
  sessionNumber: 1,
  day: 'MONDAY' as const,
  type: 'EASY_RUN',
  goal: 'Footing de récupération',
  durationMinutes: 45,
  distanceKm: 8,
  pace: '5:30',
  completed: false,
  completedAt: null,
}

const SESSION_DONE = {
  ...SESSION_BASE,
  sessionId: 's2',
  sessionNumber: 2,
  day: 'WEDNESDAY' as const,
  type: 'LONG_RUN',
  goal: 'Sortie longue progressive',
  durationMinutes: 90,
  distanceKm: 18,
  pace: '5:45',
  completed: true,
  completedAt: '2026-03-20T08:00:00Z',
}

const WEEK_1 = {
  weekId: 'w1',
  weekNumber: 1,
  phase: 'Base',
  startDate: '2026-03-02',
  endDate: '2026-03-08',
  sessions: [SESSION_BASE],
}

const WEEK_2 = {
  weekId: 'w2',
  weekNumber: 2,
  phase: 'Développement',
  startDate: '2026-03-09',
  endDate: '2026-03-15',
  sessions: [SESSION_DONE],
}

// Week containing today (2026-03-27)
const WEEK_CURRENT = {
  weekId: 'w3',
  weekNumber: 3,
  phase: 'Affûtage',
  startDate: '2026-03-24',
  endDate: '2026-03-30',
  sessions: [
    {
      ...SESSION_BASE,
      sessionId: 's3',
      sessionNumber: 3,
      day: 'FRIDAY' as const,
    },
  ],
}

const PLAN = {
  planId: 'plan-1',
  name: 'Plan marathon Paris',
  goal: 'Finir le marathon de Paris',
  startDate: '2026-03-02',
  endDate: '2026-10-15',
  weeks: [WEEK_1, WEEK_2, WEEK_CURRENT],
}

function renderPage(planId = 'plan-1') {
  render(
    <MemoryRouter initialEntries={[`/plan/${planId}`]}>
      <Routes>
        <Route path="/plan/:planId" element={<PlanDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => vi.clearAllMocks())

// ─── Rendu / chargement ────────────────────────────────────────────────────

describe('PlanDetailPage — chargement', () => {
  it('affiche le spinner pendant le chargement', () => {
    mockGetPlanById.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('appelle getPlanById avec le planId de la route', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage('plan-1')
    await waitFor(() => expect(mockGetPlanById).toHaveBeenCalledWith('plan-1'))
  })
})

// ─── En-tête du plan ──────────────────────────────────────────────────────

describe('PlanDetailPage — en-tête', () => {
  it('affiche le nom du plan', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText('Plan marathon Paris')
  })

  it("affiche l'objectif", async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText('Finir le marathon de Paris')
  })

  it('affiche les dates début/fin', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText(/2 mars 2026/i)
    expect(screen.getByText(/15 octobre 2026/i)).toBeInTheDocument()
  })
})

// ─── Affichage de la semaine ───────────────────────────────────────────────

describe('PlanDetailPage — semaine courante', () => {
  it("affiche la semaine en cours (date du jour = 2026-03-27 → semaine 3)", async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText('Semaine 3')
    expect(screen.getByText('En cours')).toBeInTheDocument()
  })

  it('affiche la phase de la semaine', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText('Affûtage')
  })

  it('affiche la période de la semaine', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText(/24 mars/i)
  })
})

// ─── Séances ──────────────────────────────────────────────────────────────

describe('PlanDetailPage — séances', () => {
  it('affiche le jour traduit en français', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText('Vendredi')
  })

  it('affiche le type traduit en français', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText('Footing facile')
  })

  it("affiche l'objectif de la séance", async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText('Footing de récupération')
  })

  it('affiche la durée', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText('45 min')
  })

  it('affiche la distance', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText('8 km')
  })

  it("affiche l'allure", async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText('5:30 min/km')
  })
})

// ─── Bouton "Valider la séance" ───────────────────────────────────────────

describe('PlanDetailPage — bouton valider', () => {
  it('affiche le bouton sur une séance non complétée', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    // WEEK_CURRENT (active) has SESSION_BASE (not completed)
    await screen.findByRole('button', { name: 'Valider la séance' })
  })

  it("n'affiche pas le bouton sur une séance complétée", async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Affûtage')

    // Navigate to week 2 (has SESSION_DONE)
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await screen.findByText('Sortie longue progressive')

    expect(screen.queryByRole('button', { name: 'Valider la séance' })).not.toBeInTheDocument()
  })

  it('appelle completeSession avec planId et sessionId', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    mockCompleteSession.mockResolvedValue({
      sessionId: 's3',
      completed: true,
      completedAt: '2026-03-27T10:00:00Z',
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Valider la séance' }))

    await waitFor(() =>
      expect(mockCompleteSession).toHaveBeenCalledWith('plan-1', 's3'),
    )
  })

  it('désactive le bouton pendant la requête', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    // Never resolves → keeps button in loading state
    mockCompleteSession.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderPage()

    const btn = await screen.findByRole('button', { name: 'Valider la séance' })
    await user.click(btn)

    // aria-label stays "Valider la séance"; the button must be disabled
    expect(screen.getByRole('button', { name: 'Valider la séance' })).toBeDisabled()
  })
})

// ─── Mise à jour locale après validation ──────────────────────────────────

describe('PlanDetailPage — mise à jour locale', () => {
  it("affiche ✅ après validation sans rechargement de la page", async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    mockCompleteSession.mockResolvedValue({
      sessionId: 's3',
      completed: true,
      completedAt: '2026-03-27T10:00:00Z',
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Valider la séance' }))

    await screen.findByLabelText('Séance complétée')
    // getPlanById must NOT have been called a second time
    expect(mockGetPlanById).toHaveBeenCalledTimes(1)
  })

  it("masque le bouton après validation", async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    mockCompleteSession.mockResolvedValue({
      sessionId: 's3',
      completed: true,
      completedAt: '2026-03-27T10:00:00Z',
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Valider la séance' }))
    await screen.findByLabelText('Séance complétée')

    expect(screen.queryByRole('button', { name: 'Valider la séance' })).not.toBeInTheDocument()
  })

  it('affiche "Effectuée le JJ/MM/YYYY" après validation', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    mockCompleteSession.mockResolvedValue({
      sessionId: 's3',
      completed: true,
      completedAt: '2026-03-27T10:00:00Z',
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Valider la séance' }))

    await screen.findByText(/Effectuée le/i)
    expect(screen.getByText(/27\/03\/2026/)).toBeInTheDocument()
  })

  it('affiche la date de validation pour une séance déjà complétée', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Affûtage')

    // Navigate to week 2 (SESSION_DONE, completedAt: '2026-03-20T08:00:00Z')
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await screen.findByText('Sortie longue progressive')

    expect(screen.getByText(/Effectuée le/i)).toBeInTheDocument()
    expect(screen.getByText(/20\/03\/2026/)).toBeInTheDocument()
  })
})

// ─── Indicateur complété ──────────────────────────────────────────────────

describe('PlanDetailPage — indicateur complété', () => {
  it("n'affiche pas ✅ pour une séance non complétée", async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText('Footing de récupération')
    expect(screen.queryByLabelText('Séance complétée')).not.toBeInTheDocument()
  })

  it('affiche ✅ pour une séance déjà complétée (navigation vers semaine 2)', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Affûtage')

    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))

    await screen.findByText('Sortie longue progressive')
    expect(screen.getByLabelText('Séance complétée')).toBeInTheDocument()
  })
})

// ─── Navigation semaines ──────────────────────────────────────────────────

describe('PlanDetailPage — navigation', () => {
  it('désactive le bouton Précédent sur la première semaine', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Affûtage')

    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))

    expect(screen.getByRole('button', { name: 'Semaine précédente' })).toBeDisabled()
  })

  it('désactive le bouton Suivant sur la dernière semaine', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText('Affûtage')
    expect(screen.getByRole('button', { name: 'Semaine suivante' })).toBeDisabled()
  })

  it('navigue vers la semaine suivante', async () => {
    mockGetPlanById.mockResolvedValue({ ...PLAN, weeks: [WEEK_1, WEEK_2] })
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Base')

    await user.click(screen.getByRole('button', { name: 'Semaine suivante' }))

    await screen.findByText('Développement')
  })

  it('navigue vers la semaine précédente', async () => {
    mockGetPlanById.mockResolvedValue({ ...PLAN, weeks: [WEEK_1, WEEK_2] })
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Base')

    await user.click(screen.getByRole('button', { name: 'Semaine suivante' }))
    await screen.findByText('Développement')

    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await screen.findByText('Base')
  })

  it('affiche le compteur de semaine', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText('Semaine 3 / 3')
  })
})

// ─── Erreur API ────────────────────────────────────────────────────────────

describe('PlanDetailPage — erreur API', () => {
  it("affiche un message d'erreur si getPlanById échoue", async () => {
    mockGetPlanById.mockRejectedValue(new Error('network'))
    renderPage()
    await screen.findByText(/Impossible de charger le plan/i)
  })
})
