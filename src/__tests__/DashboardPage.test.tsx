import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from '../pages/DashboardPage'

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockUseAuth = vi.hoisted(() => vi.fn())
vi.mock('../hooks/useAuth', () => ({ useAuth: mockUseAuth }))

const mockUsePWAInstall = vi.hoisted(() => vi.fn())
vi.mock('../hooks/usePWAInstall', () => ({ usePWAInstall: mockUsePWAInstall }))

vi.mock('../data/citations', () => ({
  CITATIONS: [
    { text: 'La douleur est temporaire.', author: 'Lance Armstrong' },
    { text: 'Le champion se relève.', author: 'Vince Lombardi' },
  ],
}))

const mockGetPlans = vi.hoisted(() => vi.fn())
const mockArchivePlan = vi.hoisted(() => vi.fn())
const mockDeletePlan = vi.hoisted(() => vi.fn())
const mockGetPlanStats = vi.hoisted(() => vi.fn())
vi.mock('../services/plan', () => ({
  getPlans: mockGetPlans,
  archivePlan: mockArchivePlan,
  deletePlan: mockDeletePlan,
  getPlanStats: mockGetPlanStats,
}))

const mockGetStravaStatus = vi.hoisted(() => vi.fn())
const mockSyncStrava = vi.hoisted(() => vi.fn())
vi.mock('../services/strava', () => ({
  getStravaStatus: mockGetStravaStatus,
  syncStrava: mockSyncStrava,
}))

const STATS = {
  totalSessions: 112,
  completedSessions: 56,
  completionPercentage: 50,
  totalDistanceKm: 840,
  completedDistanceKm: 420,
  currentWeekNumber: 14,
  totalWeeks: 28,
  nextSession: {
    date: '2026-04-07',
    day: 'TUESDAY' as const,
    type: 'LONG_RUN',
    goal: 'Sortie longue 20 km',
  },
}

const PLANS = [
  {
    planId: 'plan-1',
    name: 'Plan marathon Paris',
    goal: 'Finir le marathon de Paris',
    startDate: '2026-04-01',
    endDate: '2026-10-15',
    weeksCount: 28,
    sessionsCount: 112,
    completedSessionsCount: 56,
  },
  {
    planId: 'plan-2',
    name: 'Plan 10 km',
    goal: 'Courir 10 km en moins de 50 min',
    startDate: '2026-05-01',
    endDate: '2026-07-01',
    weeksCount: 8,
    sessionsCount: 24,
    completedSessionsCount: 0,
  },
]

beforeEach(() => {
  mockUseAuth.mockReturnValue({ logout: vi.fn() })
  mockUsePWAInstall.mockReturnValue({ canInstall: false, install: vi.fn() })
  mockGetPlanStats.mockResolvedValue(STATS)
  mockGetStravaStatus.mockResolvedValue({ connected: false })
})

afterEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
})

function renderPage() {
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
}

// ─── Rendu initial / chargement ────────────────────────────────────────────

describe('DashboardPage — rendu', () => {
  it('affiche le titre', async () => {
    mockGetPlans.mockResolvedValue([])
    renderPage()
    expect(screen.getByText('Tableau de bord')).toBeInTheDocument()
  })

  it('affiche le spinner pendant le chargement', () => {
    mockGetPlans.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })
})

// ─── Liste vide ────────────────────────────────────────────────────────────

describe('DashboardPage — liste vide', () => {
  it("affiche le message 'Aucun plan' quand la liste est vide", async () => {
    mockGetPlans.mockResolvedValue([])
    renderPage()
    await screen.findByText(/Aucun plan pour l'instant/i)
  })
})

// ─── Liste avec plans ──────────────────────────────────────────────────────

describe('DashboardPage — liste de plans', () => {
  it('affiche les noms des plans', async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    renderPage()
    await screen.findByText('Plan marathon Paris')
    expect(screen.getByText('Plan 10 km')).toBeInTheDocument()
  })

  it('affiche les objectifs des plans', async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    renderPage()
    await screen.findByText('Finir le marathon de Paris')
    expect(screen.getByText('Courir 10 km en moins de 50 min')).toBeInTheDocument()
  })

  it('affiche le pourcentage de progression correct', async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    renderPage()
    await screen.findAllByText('50%')
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('appelle getPlans au montage', async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    renderPage()
    await waitFor(() => expect(mockGetPlans).toHaveBeenCalledTimes(1))
  })
})

// ─── Erreur API ────────────────────────────────────────────────────────────

describe('DashboardPage — erreur API', () => {
  it("affiche un message d'erreur si getPlans échoue", async () => {
    mockGetPlans.mockRejectedValue(new Error('network'))
    renderPage()
    await screen.findByText(/Impossible de charger les plans/i)
  })
})

// ─── Boutons Créer / Importer ─────────────────────────────────────────────

describe('DashboardPage — boutons créer / importer', () => {
  it('affiche les boutons "Créer" et "Importer" quand aucun plan actif', async () => {
    mockGetPlans.mockResolvedValue([])
    renderPage()
    await screen.findByText(/Aucun plan pour l'instant/i)
    const linkNew = screen.getByRole('link', { name: 'Créer un nouveau plan' })
    expect(linkNew).toBeInTheDocument()
    expect(linkNew).toHaveAttribute('href', '/plan/new')
    // Deux liens "Importer un plan" peuvent exister (header + section vide)
    const importLinks = screen.getAllByRole('link', { name: 'Importer un plan' })
    expect(importLinks.length).toBeGreaterThanOrEqual(1)
    importLinks.forEach((l) => expect(l).toHaveAttribute('href', '/plan/import'))
  })

  it('masque les boutons "Créer" et "Importer" quand un plan actif existe', async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    renderPage()
    await screen.findByText('Plan marathon Paris')
    expect(
      screen.queryByRole('link', { name: 'Créer un nouveau plan' }),
    ).not.toBeInTheDocument()
    // Le lien "Importer un plan" dans l'en-tête ne doit pas être présent
    // (seul le lien dans la section "liste vide" peut exister, mais elle est cachée)
    expect(
      screen.queryByRole('link', { name: 'Importer un plan' }),
    ).not.toBeInTheDocument()
  })
})

// ─── Lien vers le plan ────────────────────────────────────────────────────

describe('DashboardPage — liens vers les plans', () => {
  it('chaque carte de plan est un lien vers /plan/:planId', async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    renderPage()
    await screen.findByText('Plan marathon Paris')
    expect(screen.getByRole('link', { name: /Plan marathon Paris/i })).toHaveAttribute(
      'href',
      '/plan/plan-1',
    )
    expect(screen.getByRole('link', { name: /Plan 10 km/i })).toHaveAttribute(
      'href',
      '/plan/plan-2',
    )
  })
})

// ─── Archivage ────────────────────────────────────────────────────────────

describe('DashboardPage — archivage', () => {
  it('affiche un bouton "Archiver ce plan" pour chaque plan', async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    renderPage()
    await screen.findByText('Plan marathon Paris')
    const buttons = screen.getAllByRole('button', { name: 'Archiver ce plan' })
    expect(buttons).toHaveLength(2)
  })

  it('appelle archivePlan avec le planId correct', async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    mockArchivePlan.mockResolvedValue({ planId: 'plan-1', archived: true })
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Plan marathon Paris')

    const [firstBtn] = screen.getAllByRole('button', { name: 'Archiver ce plan' })
    await user.click(firstBtn)

    await waitFor(() => expect(mockArchivePlan).toHaveBeenCalledWith('plan-1'))
  })

  it('retire le plan de la liste après archivage sans rechargement', async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    mockArchivePlan.mockResolvedValue({ planId: 'plan-1', archived: true })
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Plan marathon Paris')

    const [firstBtn] = screen.getAllByRole('button', { name: 'Archiver ce plan' })
    await user.click(firstBtn)

    await waitFor(() =>
      expect(screen.queryByText('Plan marathon Paris')).not.toBeInTheDocument(),
    )
    // getPlans must NOT have been called a second time
    expect(mockGetPlans).toHaveBeenCalledTimes(1)
    // The other plan stays
    expect(screen.getByText('Plan 10 km')).toBeInTheDocument()
  })

  it('désactive le bouton pendant la requête', async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    mockArchivePlan.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Plan marathon Paris')

    const [firstBtn] = screen.getAllByRole('button', { name: 'Archiver ce plan' })
    await user.click(firstBtn)

    expect(screen.getByRole('button', { name: 'Archivage…' })).toBeDisabled()
  })
})

// ─── Déconnexion ───────────────────────────────────────────────────────────

describe('DashboardPage — déconnexion', () => {
  it('appelle logout au clic sur le bouton Déconnexion', async () => {
    const logoutMock = vi.fn()
    mockUseAuth.mockReturnValue({ logout: logoutMock })
    mockGetPlans.mockResolvedValue([])

    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Déconnexion' }))

    expect(logoutMock).toHaveBeenCalledTimes(1)
  })
})

// ─── Statistiques ──────────────────────────────────────────────────────────

describe('DashboardPage — statistiques', () => {
  it('appelle getPlanStats avec le planId du premier plan', async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    renderPage()
    await waitFor(() => expect(mockGetPlanStats).toHaveBeenCalledWith('plan-1'))
  })

  it('affiche la carte Progression', async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    renderPage()
    const statsSection = await screen.findByRole('region', { name: 'Statistiques du plan actif' })
    expect(within(statsSection).getByText('50%')).toBeInTheDocument()
    expect(within(statsSection).getByText('56 / 112 séances')).toBeInTheDocument()
  })

  it('affiche la carte Distance', async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    renderPage()
    await screen.findByText('Distance')
    expect(screen.getByText('420 km')).toBeInTheDocument()
    expect(screen.getByText('sur 840 km prévus')).toBeInTheDocument()
  })

  it('affiche la carte Semaines', async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    renderPage()
    await screen.findByText('Semaines')
    expect(screen.getByText('14')).toBeInTheDocument()
    expect(screen.getByText('sur 28 semaines')).toBeInTheDocument()
  })

  it('affiche la carte Prochaine séance avec le type traduit', async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    renderPage()
    await screen.findByText('Prochaine séance')
    expect(screen.getByText('Sortie longue')).toBeInTheDocument()
  })

  it('affiche le jour de la semaine traduit depuis le champ day (pas de conversion de date)', async () => {
    // day: 'TUESDAY' → DAY_LABELS → 'Mardi' (sans passer par parseDate)
    mockGetPlans.mockResolvedValue(PLANS)
    renderPage()
    await screen.findByText('Prochaine séance')
    expect(screen.getByText('Mardi')).toBeInTheDocument()
  })

  it('affiche SATURDAY comme "Samedi" (cas du bug original vendredi/samedi)', async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    mockGetPlanStats.mockResolvedValue({
      ...STATS,
      nextSession: { ...STATS.nextSession!, date: '2026-03-28T00:00:00Z', day: 'SATURDAY' as const },
    })
    renderPage()
    await screen.findByText('Prochaine séance')
    expect(screen.getByText('Samedi')).toBeInTheDocument()
    // Vendredi ne doit pas être affiché
    expect(screen.queryByText('Vendredi')).not.toBeInTheDocument()
  })

  it("affiche 'Aucune' si nextSession est null", async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    mockGetPlanStats.mockResolvedValue({ ...STATS, nextSession: null })
    renderPage()
    await screen.findByText('Prochaine séance')
    expect(screen.getByText('Aucune')).toBeInTheDocument()
  })

  it('ne plante pas si nextSession.date est undefined (fallback sur day)', async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    mockGetPlanStats.mockResolvedValue({
      ...STATS,
      nextSession: {
        type: 'EASY_RUN',
        goal: 'Footing',
        date: undefined as unknown as string,
        day: 'MONDAY' as const,
      },
    })
    renderPage()
    await screen.findByText('Prochaine séance')
    expect(screen.getByText('Lundi')).toBeInTheDocument()
    expect(screen.queryByText(/invalid date/i)).not.toBeInTheDocument()
  })

  it('ne plante pas si startDate ou endDate du plan est undefined', async () => {
    const planWithoutDates = {
      ...PLANS[0],
      startDate: undefined as unknown as string,
      endDate: undefined as unknown as string,
    }
    mockGetPlans.mockResolvedValue([planWithoutDates])
    renderPage()
    await screen.findByText('Plan marathon Paris')
    // Pas de crash, la page s'affiche
    expect(screen.getByText('Plan marathon Paris')).toBeInTheDocument()
  })

  it("n'affiche pas les statistiques si la liste de plans est vide", async () => {
    mockGetPlans.mockResolvedValue([])
    renderPage()
    await screen.findByText(/Aucun plan pour l'instant/i)
    expect(screen.queryByText('Progression')).not.toBeInTheDocument()
    expect(mockGetPlanStats).not.toHaveBeenCalled()
  })
})

// ─── Suppression ───────────────────────────────────────────────────────────

describe('DashboardPage — suppression', () => {
  it('affiche un bouton "Supprimer" pour chaque plan', async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    renderPage()
    await screen.findByText('Plan marathon Paris')
    const buttons = screen.getAllByRole('button', { name: 'Supprimer' })
    expect(buttons).toHaveLength(2)
  })

  it('ouvre la modale de confirmation au clic sur "Supprimer"', async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Plan marathon Paris')

    const [firstBtn] = screen.getAllByRole('button', { name: 'Supprimer' })
    await user.click(firstBtn)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText(/Supprimer le plan/i)).toBeInTheDocument()
    expect(within(dialog).getByText(/Plan marathon Paris/)).toBeInTheDocument()
  })

  it('ferme la modale sans supprimer au clic sur "Annuler"', async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Plan marathon Paris')

    const [firstBtn] = screen.getAllByRole('button', { name: 'Supprimer' })
    await user.click(firstBtn)
    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mockDeletePlan).not.toHaveBeenCalled()
    expect(screen.getByText('Plan marathon Paris')).toBeInTheDocument()
  })

  it('appelle deletePlan avec le bon planId après confirmation', async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    mockDeletePlan.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Plan marathon Paris')

    const [firstBtn] = screen.getAllByRole('button', { name: 'Supprimer' })
    await user.click(firstBtn)
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Supprimer' }))

    await waitFor(() => expect(mockDeletePlan).toHaveBeenCalledWith('plan-1'))
  })

  it('retire le plan de la liste après suppression sans rechargement', async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    mockDeletePlan.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Plan marathon Paris')

    const [firstBtn] = screen.getAllByRole('button', { name: 'Supprimer' })
    await user.click(firstBtn)
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Supprimer' }))

    await waitFor(() =>
      expect(screen.queryByText('Plan marathon Paris')).not.toBeInTheDocument(),
    )
    expect(mockGetPlans).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Plan 10 km')).toBeInTheDocument()
  })

  it("affiche un message d'erreur si la suppression échoue", async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    mockDeletePlan.mockRejectedValue(new Error('network'))
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Plan marathon Paris')

    const [firstBtn] = screen.getAllByRole('button', { name: 'Supprimer' })
    await user.click(firstBtn)
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Supprimer' }))

    await screen.findByText(/La suppression a échoué/i)
    expect(screen.getByText('Plan marathon Paris')).toBeInTheDocument()
  })

  it('désactive le bouton pendant la suppression', async () => {
    mockGetPlans.mockResolvedValue(PLANS)
    mockDeletePlan.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Plan marathon Paris')

    const [firstBtn] = screen.getAllByRole('button', { name: 'Supprimer' })
    await user.click(firstBtn)
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Supprimer' }))

    await screen.findByRole('button', { name: 'Suppression…' })
    expect(screen.getByRole('button', { name: 'Suppression…' })).toBeDisabled()
  })
})

// ─── Citation motivante ────────────────────────────────────────────────────

describe('DashboardPage — citation motivante', () => {
  it('affiche une citation au chargement', async () => {
    mockGetPlans.mockResolvedValue([])
    renderPage()
    const quote = await screen.findByRole('figure')
    expect(quote).toBeInTheDocument()
    const blockquote = within(quote).getByRole('blockquote')
    expect(blockquote.textContent).toMatch(/La douleur est temporaire|Le champion se relève/)
  })

  it('affiche le nom de l\'auteur en tant que légende', async () => {
    sessionStorage.setItem(
      'dashboard_citation',
      JSON.stringify({ text: 'La douleur est temporaire.', author: 'Lance Armstrong' }),
    )
    mockGetPlans.mockResolvedValue([])
    renderPage()
    await screen.findByRole('figure')
    expect(screen.getByText('Lance Armstrong')).toBeInTheDocument()
  })

  it('utilise la citation du sessionStorage si présente', async () => {
    sessionStorage.setItem(
      'dashboard_citation',
      JSON.stringify({ text: 'Le champion se relève.', author: 'Vince Lombardi' }),
    )
    mockGetPlans.mockResolvedValue([])
    renderPage()
    await screen.findByRole('figure')
    expect(screen.getByText('Vince Lombardi')).toBeInTheDocument()
  })

  it('stocke la citation dans le sessionStorage au premier rendu', async () => {
    mockGetPlans.mockResolvedValue([])
    renderPage()
    await screen.findByRole('figure')
    const stored = sessionStorage.getItem('dashboard_citation')
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!)
    expect(parsed).toHaveProperty('text')
    expect(parsed).toHaveProperty('author')
  })

  it('affiche la bannière d\'installation quand canInstall est true', async () => {
    mockUsePWAInstall.mockReturnValue({ canInstall: true, install: vi.fn() })
    mockGetPlans.mockResolvedValue([])
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )
    await screen.findByRole('figure')
    expect(screen.getByRole('banner', { name: /installation/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /installer/i })).toBeInTheDocument()
  })

  it('conserve la même citation après un second rendu', async () => {
    mockGetPlans.mockResolvedValue([])
    const { unmount } = render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )
    await screen.findByRole('figure')
    const first = sessionStorage.getItem('dashboard_citation')
    unmount()

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )
    await screen.findByRole('figure')
    expect(sessionStorage.getItem('dashboard_citation')).toBe(first)
  })
})

// ─── Sync Strava ───────────────────────────────────────────────────────────

describe('DashboardPage — sync Strava', () => {
  it("n'affiche pas le bouton Strava si non connecté", async () => {
    mockGetStravaStatus.mockResolvedValue({ connected: false })
    mockGetPlans.mockResolvedValue(PLANS)
    renderPage()
    await screen.findByText('Plan marathon Paris')
    expect(
      screen.queryByRole('button', { name: /synchroniser avec strava/i }),
    ).not.toBeInTheDocument()
  })

  it("n'affiche pas le bouton Strava si aucun plan", async () => {
    mockGetStravaStatus.mockResolvedValue({ connected: true })
    mockGetPlans.mockResolvedValue([])
    renderPage()
    await screen.findByText(/Aucun plan pour l'instant/i)
    expect(
      screen.queryByRole('button', { name: /synchroniser avec strava/i }),
    ).not.toBeInTheDocument()
  })

  it('affiche le bouton "Synchroniser avec Strava" si connecté et plans présents', async () => {
    mockGetStravaStatus.mockResolvedValue({ connected: true })
    mockGetPlans.mockResolvedValue(PLANS)
    renderPage()
    await screen.findByRole('button', { name: /synchroniser avec strava/i })
  })

  it('appelle syncStrava au clic', async () => {
    mockGetStravaStatus.mockResolvedValue({ connected: true })
    mockGetPlans.mockResolvedValue(PLANS)
    mockSyncStrava.mockResolvedValue({ activitiesAnalyzed: 5, sessionsValidated: 2 })
    const user = userEvent.setup()
    renderPage()
    const btn = await screen.findByRole('button', { name: /synchroniser avec strava/i })
    await user.click(btn)
    await waitFor(() => expect(mockSyncStrava).toHaveBeenCalledTimes(1))
  })

  it('affiche le toast avec le résumé après sync réussie', async () => {
    mockGetStravaStatus.mockResolvedValue({ connected: true })
    mockGetPlans.mockResolvedValue(PLANS)
    mockSyncStrava.mockResolvedValue({ activitiesAnalyzed: 5, sessionsValidated: 2 })
    const user = userEvent.setup()
    renderPage()
    const btn = await screen.findByRole('button', { name: /synchroniser avec strava/i })
    await user.click(btn)
    const toast = await screen.findByRole('status')
    expect(toast).toBeInTheDocument()
    expect(toast.textContent).toMatch(/5/)
    expect(toast.textContent).toMatch(/activités analysées/i)
    expect(toast.textContent).toMatch(/2/)
    expect(toast.textContent).toMatch(/séances validées automatiquement/i)
  })

  it('désactive le bouton pendant la synchronisation', async () => {
    mockGetStravaStatus.mockResolvedValue({ connected: true })
    mockGetPlans.mockResolvedValue(PLANS)
    mockSyncStrava.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderPage()
    const btn = await screen.findByRole('button', { name: /synchroniser avec strava/i })
    await user.click(btn)
    expect(await screen.findByRole('button', { name: /synchronisation…/i })).toBeDisabled()
  })

  it('rafraîchit les statistiques après une sync réussie', async () => {
    mockGetStravaStatus.mockResolvedValue({ connected: true })
    mockGetPlans.mockResolvedValue(PLANS)
    mockSyncStrava.mockResolvedValue({ activitiesAnalyzed: 3, sessionsValidated: 1 })
    const user = userEvent.setup()
    renderPage()
    const btn = await screen.findByRole('button', { name: /synchroniser avec strava/i })
    await user.click(btn)
    await waitFor(() => expect(mockGetPlanStats).toHaveBeenCalledTimes(2))
  })
})
