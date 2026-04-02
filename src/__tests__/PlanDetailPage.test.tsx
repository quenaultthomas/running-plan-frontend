import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PlanDetailPage from '../pages/PlanDetailPage'

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockGetPlanById = vi.hoisted(() => vi.fn())
const mockCompleteSession = vi.hoisted(() => vi.fn())
const mockSkipSession = vi.hoisted(() => vi.fn())
const mockUpdateSession = vi.hoisted(() => vi.fn())
vi.mock('../services/plan', () => ({
  getPlanById: mockGetPlanById,
  completeSession: mockCompleteSession,
  skipSession: mockSkipSession,
  updateSession: mockUpdateSession,
}))

vi.mock('../services/strava', () => ({
  getStravaStatus: vi.fn().mockResolvedValue({ connected: false }),
  syncStrava: vi.fn(),
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
  status: 'PENDING' as const,
  completedAt: null,
  skippedAt: null,
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
  status: 'COMPLETED' as const,
  completedAt: '2026-03-20T08:00:00Z',
  skippedAt: null,
}

const SESSION_SKIPPED = {
  ...SESSION_BASE,
  sessionId: 's5',
  sessionNumber: 5,
  day: 'THURSDAY' as const,
  type: 'TEMPO',
  goal: 'Tempo 40 min',
  status: 'SKIPPED' as const,
  completedAt: null,
  skippedAt: '2026-03-21T09:00:00Z',
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

const SESSION_WITH_BLOCKS = {
  ...SESSION_BASE,
  sessionId: 's4',
  sessionNumber: 4,
  day: 'TUESDAY' as const,
  type: 'INTERVAL',
  blocks: [
    {
      blockType: 'WARMUP' as const,
      label: 'Trottinement léger',
      durationMinutes: 15,
      description: 'Course facile + gammes',
    },
    {
      blockType: 'WORK' as const,
      label: '3 × 2 km @ 10km',
      repetitions: 3,
      distanceKm: 2,
      pace: '4:30',
      effortDurationSeconds: 480,
      recoveryDurationSeconds: 120,
    },
    {
      blockType: 'COOLDOWN' as const,
      label: 'Marche récupération',
      durationMinutes: 10,
    },
  ],
}

const WEEK_WITH_BLOCKS = {
  weekId: 'w4',
  weekNumber: 4,
  phase: 'Intensité',
  startDate: '2026-03-31',
  endDate: '2026-04-06',
  sessions: [SESSION_WITH_BLOCKS],
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
  it('affiche le bouton sur une séance PENDING', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    // WEEK_CURRENT (active) has SESSION_BASE (PENDING)
    await screen.findByRole('button', { name: 'Valider la séance' })
  })

  it("n'affiche pas le bouton sur une séance COMPLETED", async () => {
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
  it("affiche le badge ✅ Réalisée après validation sans rechargement", async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    mockCompleteSession.mockResolvedValue({
      sessionId: 's3',
      completed: true,
      completedAt: '2026-03-27T10:00:00Z',
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Valider la séance' }))

    await screen.findByLabelText('Séance réalisée')
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
    await screen.findByLabelText('Séance réalisée')

    expect(screen.queryByRole('button', { name: 'Valider la séance' })).not.toBeInTheDocument()
  })

  it('affiche la date après validation', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    mockCompleteSession.mockResolvedValue({
      sessionId: 's3',
      completed: true,
      completedAt: '2026-03-27T10:00:00Z',
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Valider la séance' }))

    await screen.findByText(/27\/03\/2026/)
  })

  it('affiche la date pour une séance déjà COMPLETED', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Affûtage')

    // Navigate to week 2 (SESSION_DONE, completedAt: '2026-03-20T08:00:00Z')
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await screen.findByText('Sortie longue progressive')

    expect(screen.getByLabelText('Séance réalisée')).toBeInTheDocument()
    expect(screen.getByText(/20\/03\/2026/)).toBeInTheDocument()
  })
})

// ─── Indicateurs de statut ────────────────────────────────────────────────

describe('PlanDetailPage — indicateurs de statut', () => {
  it("n'affiche pas de badge pour une séance PENDING", async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText('Footing de récupération')
    expect(screen.queryByLabelText('Séance réalisée')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Séance sautée')).not.toBeInTheDocument()
  })

  it('affiche le badge ✅ Réalisée pour une séance COMPLETED', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Affûtage')

    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))

    await screen.findByText('Sortie longue progressive')
    expect(screen.getByLabelText('Séance réalisée')).toBeInTheDocument()
    expect(screen.getByText('✅ Réalisée')).toBeInTheDocument()
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

// ─── Bouton "Modifier" ────────────────────────────────────────────────────

describe('PlanDetailPage — bouton modifier', () => {
  it('affiche le bouton "Modifier" sur chaque séance', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText('Footing de récupération')
    expect(screen.getByRole('button', { name: 'Modifier la séance' })).toBeInTheDocument()
  })

  it('ouvre la modale au clic sur "Modifier"', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Modifier la séance' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/Durée/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Distance/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Allure/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Jour/i)).toBeInTheDocument()
  })

  it('pré-remplit le formulaire avec les valeurs de la séance', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Modifier la séance' }))

    expect(screen.getByLabelText<HTMLInputElement>(/Durée/i).value).toBe('45')
    expect(screen.getByLabelText<HTMLInputElement>(/Distance/i).value).toBe('8')
    // Allure calculée : 45 min / 8 km = 337.5 s → 5:38
    expect(screen.getByText(/Allure calculée/i)).toBeInTheDocument()
    expect(screen.getByText(/5:38 min\/km/i)).toBeInTheDocument()
  })

  it('ferme la modale sans appeler l\'API au clic sur "Annuler"', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Modifier la séance' }))
    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mockUpdateSession).not.toHaveBeenCalled()
  })
})

// ─── Validation du formulaire ─────────────────────────────────────────────

describe('PlanDetailPage — validation formulaire modification', () => {
  it('affiche une erreur si la durée est à 0', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Modifier la séance' }))

    const durationInput = screen.getByLabelText(/Durée/i)
    await user.clear(durationInput)
    await user.type(durationInput, '0')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await screen.findByText(/La durée doit être supérieure à 0/i)
    expect(mockUpdateSession).not.toHaveBeenCalled()
  })

  it('affiche l\'allure calculée en temps réel quand durée et distance sont renseignées', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Modifier la séance' }))

    const durationInput = screen.getByLabelText(/Durée/i)
    const distanceInput = screen.getByLabelText(/Distance/i)
    await user.clear(durationInput)
    await user.clear(distanceInput)

    // Pas encore d'allure calculée
    expect(screen.queryByText(/Allure calculée/i)).not.toBeInTheDocument()

    // 60 min / 10 km = 360 s = 6:00
    await user.type(durationInput, '60')
    await user.type(distanceInput, '10')
    expect(screen.getByText(/Allure calculée/i)).toBeInTheDocument()
    expect(screen.getByText(/6:00 min\/km/i)).toBeInTheDocument()
  })

  it("n'affiche pas l'allure calculée si la distance est absente", async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Modifier la séance' }))

    await user.clear(screen.getByLabelText(/Distance/i))
    expect(screen.queryByText(/Allure calculée/i)).not.toBeInTheDocument()
  })
})

// ─── Mise à jour locale après modification ─────────────────────────────────

describe('PlanDetailPage — mise à jour locale après modification', () => {
  it('appelle updateSession avec les bons paramètres dont le pace calculé', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    mockUpdateSession.mockResolvedValue({
      sessionId: 's3',
      durationMinutes: 60,
      distanceKm: 8,
      pace: '7:30',
      dayOfWeek: 'FRIDAY',
    })
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Modifier la séance' }))

    const dialog = screen.getByRole('dialog')
    await user.clear(within(dialog).getByLabelText(/Durée/i))
    await user.type(within(dialog).getByLabelText(/Durée/i), '60')
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))

    // 60 min / 8 km = 450 s = 7:30
    await waitFor(() =>
      expect(mockUpdateSession).toHaveBeenCalledWith(
        'plan-1',
        's3',
        expect.objectContaining({ durationMinutes: 60, distanceKm: 8, pace: '7:30' }),
      ),
    )
  })

  it('ferme la modale après succès', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    mockUpdateSession.mockResolvedValue({
      sessionId: 's3',
      durationMinutes: 60,
      distanceKm: 8,
      pace: '5:30',
      dayOfWeek: 'FRIDAY',
    })
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Modifier la séance' }))
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mockGetPlanById).toHaveBeenCalledTimes(1)
  })

  it('met à jour la durée affichée après succès', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    mockUpdateSession.mockResolvedValue({
      sessionId: 's3',
      durationMinutes: 60,
      distanceKm: 8,
      pace: '5:30',
      dayOfWeek: 'FRIDAY',
    })
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Modifier la séance' }))

    const dialog = screen.getByRole('dialog')
    await user.clear(within(dialog).getByLabelText(/Durée/i))
    await user.type(within(dialog).getByLabelText(/Durée/i), '60')
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))

    await screen.findByText('60 min')
    expect(mockGetPlanById).toHaveBeenCalledTimes(1)
  })

  it('affiche une erreur serveur si updateSession échoue', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    mockUpdateSession.mockRejectedValue(new Error('network'))
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Modifier la séance' }))
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await screen.findByText(/La modification a échoué/i)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('désactive le bouton "Enregistrer" pendant la requête', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    mockUpdateSession.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Modifier la séance' }))
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await screen.findByRole('button', { name: 'Enregistrement…' })
    expect(screen.getByRole('button', { name: 'Enregistrement…' })).toBeDisabled()
  })
})

// ─── Blocs de séance ──────────────────────────────────────────────────────

describe('PlanDetailPage — blocs de séance', () => {
  function renderWithBlocks() {
    const plan = {
      ...PLAN,
      weeks: [WEEK_WITH_BLOCKS, ...PLAN.weeks],
    }
    mockGetPlanById.mockResolvedValue(plan)
    renderPage()
  }

  it("n'affiche pas le bouton blocs pour une séance sans blocs", async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByText('Footing de récupération')
    expect(screen.queryByText(/Voir les blocs/i)).not.toBeInTheDocument()
  })

  it("n'affiche pas le bouton blocs pour une séance EASY_RUN même avec des blocs", async () => {
    const easyRunWithBlocks = {
      ...SESSION_WITH_BLOCKS,
      sessionId: 's6',
      type: 'EASY_RUN',
    }
    const plan = {
      ...PLAN,
      weeks: [{ ...WEEK_WITH_BLOCKS, sessions: [easyRunWithBlocks] }, ...PLAN.weeks],
    }
    mockGetPlanById.mockResolvedValue(plan)
    renderPage()
    await screen.findByText('Affûtage')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await screen.findByText('Intensité')
    expect(screen.queryByText(/Voir les blocs/i)).not.toBeInTheDocument()
  })

  it("affiche le bouton 'Voir les blocs (N)' si la séance a des blocs", async () => {
    renderWithBlocks()
    // Navigate to week 1 (WEEK_WITH_BLOCKS is idx 0 but today is idx 3, so navigate back)
    await screen.findByText('Affûtage')
    const user = userEvent.setup()
    // Navigate to WEEK_WITH_BLOCKS (idx 0 = first week, need 3 clicks back from idx 3)
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await screen.findByText('Intensité')
    expect(screen.getByText('Voir les blocs (3)')).toBeInTheDocument()
  })

  it('affiche les blocs au clic sur "Voir les blocs"', async () => {
    renderWithBlocks()
    await screen.findByText('Affûtage')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await screen.findByText('Intensité')

    await user.click(screen.getByText('Voir les blocs (3)'))

    expect(screen.getByText('Trottinement léger')).toBeInTheDocument()
    expect(screen.getByText('3 × 2 km @ 10km')).toBeInTheDocument()
    expect(screen.getByText('Marche récupération')).toBeInTheDocument()
  })

  it('affiche le type de bloc traduit', async () => {
    renderWithBlocks()
    await screen.findByText('Affûtage')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await screen.findByText('Intensité')

    await user.click(screen.getByText('Voir les blocs (3)'))

    expect(screen.getByText('Échauffement')).toBeInTheDocument()
    expect(screen.getByText('Travail')).toBeInTheDocument()
    expect(screen.getByText('Retour au calme')).toBeInTheDocument()
  })

  it('affiche la description du bloc si présente', async () => {
    renderWithBlocks()
    await screen.findByText('Affûtage')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await screen.findByText('Intensité')

    await user.click(screen.getByText('Voir les blocs (3)'))

    expect(screen.getByText('Course facile + gammes')).toBeInTheDocument()
  })

  it('replie les blocs au second clic ("Masquer les blocs")', async () => {
    renderWithBlocks()
    await screen.findByText('Affûtage')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await screen.findByText('Intensité')

    await user.click(screen.getByText('Voir les blocs (3)'))
    await screen.findByText('Masquer les blocs')
    await user.click(screen.getByText('Masquer les blocs'))

    expect(screen.queryByText('Trottinement léger')).not.toBeInTheDocument()
    expect(screen.getByText('Voir les blocs (3)')).toBeInTheDocument()
  })
})

// ─── Bouton "Passer la séance" ────────────────────────────────────────────

describe('PlanDetailPage — passer la séance', () => {
  it('affiche le bouton "Passer la séance" sur une séance PENDING', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    renderPage()
    await screen.findByRole('button', { name: 'Passer la séance' })
  })

  it("n'affiche pas le bouton sur une séance COMPLETED", async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Affûtage')

    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await screen.findByText('Sortie longue progressive')

    expect(screen.queryByRole('button', { name: 'Passer la séance' })).not.toBeInTheDocument()
  })

  it('appelle skipSession avec planId et sessionId', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    mockSkipSession.mockResolvedValue({
      sessionId: 's3',
      status: 'SKIPPED',
      skippedAt: '2026-03-27T11:00:00Z',
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Passer la séance' }))

    await waitFor(() =>
      expect(mockSkipSession).toHaveBeenCalledWith('plan-1', 's3'),
    )
  })

  it('affiche le badge ⏭️ Sautée après avoir passé la séance', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    mockSkipSession.mockResolvedValue({
      sessionId: 's3',
      status: 'SKIPPED',
      skippedAt: '2026-03-27T11:00:00Z',
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Passer la séance' }))

    await screen.findByLabelText('Séance sautée')
    expect(screen.getByText('⏭️ Sautée')).toBeInTheDocument()
    expect(mockGetPlanById).toHaveBeenCalledTimes(1)
  })

  it('affiche la date pour une séance déjà SKIPPED', async () => {
    const weekSkipped = {
      weekId: 'w-skip',
      weekNumber: 10,
      phase: 'Test',
      startDate: '2026-05-01',
      endDate: '2026-05-07',
      sessions: [SESSION_SKIPPED],
    }
    mockGetPlanById.mockResolvedValue({ ...PLAN, weeks: [weekSkipped] })
    renderPage()

    await screen.findByLabelText('Séance sautée')
    expect(screen.getByText(/21\/03\/2026/)).toBeInTheDocument()
  })

  it('désactive le bouton "Passer la séance" pendant la requête', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    mockSkipSession.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Passer la séance' }))

    expect(screen.getByRole('button', { name: 'Passer la séance' })).toBeDisabled()
  })

  it('masque les boutons Valider et Passer après avoir passé la séance', async () => {
    mockGetPlanById.mockResolvedValue(PLAN)
    mockSkipSession.mockResolvedValue({
      sessionId: 's3',
      status: 'SKIPPED',
      skippedAt: '2026-03-27T11:00:00Z',
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Passer la séance' }))
    await screen.findByLabelText('Séance sautée')

    expect(screen.queryByRole('button', { name: 'Valider la séance' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Passer la séance' })).not.toBeInTheDocument()
  })
})
