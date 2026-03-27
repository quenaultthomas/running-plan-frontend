import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from '../pages/DashboardPage'

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockUseAuth = vi.hoisted(() => vi.fn())
vi.mock('../hooks/useAuth', () => ({ useAuth: mockUseAuth }))

const mockGetPlans = vi.hoisted(() => vi.fn())
const mockArchivePlan = vi.hoisted(() => vi.fn())
vi.mock('../services/plan', () => ({
  getPlans: mockGetPlans,
  archivePlan: mockArchivePlan,
}))

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
})

afterEach(() => vi.clearAllMocks())

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
    await screen.findByText('50%')
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

// ─── Bouton Créer un nouveau plan ─────────────────────────────────────────

describe('DashboardPage — bouton nouveau plan', () => {
  it('affiche le lien "Créer un nouveau plan" pointant vers /plan/new', async () => {
    mockGetPlans.mockResolvedValue([])
    renderPage()
    const link = screen.getByRole('link', { name: 'Créer un nouveau plan' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/plan/new')
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
