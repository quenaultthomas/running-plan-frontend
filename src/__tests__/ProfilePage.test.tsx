import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ProfilePage from '../pages/ProfilePage'

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockUseAuth = vi.hoisted(() => vi.fn())
vi.mock('../hooks/useAuth', () => ({ useAuth: mockUseAuth }))

const mockGetStravaStatus = vi.hoisted(() => vi.fn())
const mockGetStravaAuthUrl = vi.hoisted(() => vi.fn())
const mockDisconnectStrava = vi.hoisted(() => vi.fn())
vi.mock('../services/strava', () => ({
  getStravaStatus: mockGetStravaStatus,
  getStravaAuthUrl: mockGetStravaAuthUrl,
  disconnectStrava: mockDisconnectStrava,
}))

// ─── Helpers ──────────────────────────────────────────────────────────────

function renderProfile(search = '') {
  mockUseAuth.mockReturnValue({ logout: vi.fn() })
  return render(
    <MemoryRouter initialEntries={[`/profile${search}`]}>
      <ProfilePage />
    </MemoryRouter>,
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Rendu de base ──────────────────────────────────────────────────────

  it('affiche le titre de la page', async () => {
    mockGetStravaStatus.mockResolvedValue({ connected: false })
    renderProfile()
    expect(screen.getByRole('heading', { name: /profil/i })).toBeInTheDocument()
  })

  it('affiche le lien vers le tableau de bord', async () => {
    mockGetStravaStatus.mockResolvedValue({ connected: false })
    renderProfile()
    expect(screen.getByRole('link', { name: /tableau de bord/i })).toBeInTheDocument()
  })

  it('affiche le spinner de chargement initialement', () => {
    mockGetStravaStatus.mockReturnValue(new Promise(() => {}))
    renderProfile()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  // ── Non connecté ───────────────────────────────────────────────────────

  it('affiche le bouton "Connecter Strava" si non connecté', async () => {
    mockGetStravaStatus.mockResolvedValue({ connected: false })
    renderProfile()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /connecter strava/i })).toBeInTheDocument(),
    )
  })

  it('redirige vers authUrl au clic sur "Connecter Strava"', async () => {
    mockGetStravaStatus.mockResolvedValue({ connected: false })
    mockGetStravaAuthUrl.mockResolvedValue({ authUrl: 'https://strava.com/oauth/authorize?test' })
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '' },
    })

    renderProfile()
    const btn = await screen.findByRole('button', { name: /connecter strava/i })
    await userEvent.click(btn)

    await waitFor(() =>
      expect(window.location.href).toBe('https://strava.com/oauth/authorize?test'),
    )
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  it('désactive le bouton pendant la redirection', async () => {
    mockGetStravaStatus.mockResolvedValue({ connected: false })
    mockGetStravaAuthUrl.mockReturnValue(new Promise(() => {}))

    renderProfile()
    const btn = await screen.findByRole('button', { name: /connecter strava/i })
    await userEvent.click(btn)

    expect(await screen.findByRole('button', { name: /redirection/i })).toBeDisabled()
  })

  // ── Connecté ───────────────────────────────────────────────────────────

  it('affiche le badge "Strava connecté" si connecté', async () => {
    mockGetStravaStatus.mockResolvedValue({
      connected: true,
      athleteName: 'Thomas Dupont',
      connectedAt: '2026-01-15T10:00:00Z',
    })
    renderProfile()
    await waitFor(() =>
      expect(screen.getByText(/strava connecté/i)).toBeInTheDocument(),
    )
  })

  it("affiche le nom de l'athlète", async () => {
    mockGetStravaStatus.mockResolvedValue({
      connected: true,
      athleteName: 'Thomas Dupont',
      connectedAt: '2026-01-15T10:00:00Z',
    })
    renderProfile()
    await waitFor(() =>
      expect(screen.getByText(/Thomas Dupont/)).toBeInTheDocument(),
    )
  })

  it('affiche la date de connexion', async () => {
    mockGetStravaStatus.mockResolvedValue({
      connected: true,
      athleteName: 'Thomas Dupont',
      connectedAt: '2026-01-15T10:00:00Z',
    })
    renderProfile()
    await waitFor(() =>
      expect(screen.getByText(/15 janvier 2026/)).toBeInTheDocument(),
    )
  })

  it('affiche le bouton "Déconnecter"', async () => {
    mockGetStravaStatus.mockResolvedValue({
      connected: true,
      athleteName: 'Thomas Dupont',
      connectedAt: '2026-01-15T10:00:00Z',
    })
    renderProfile()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /déconnecter/i })).toBeInTheDocument(),
    )
  })

  it('déconnecte Strava et affiche le bouton de connexion', async () => {
    mockGetStravaStatus.mockResolvedValue({
      connected: true,
      athleteName: 'Thomas Dupont',
      connectedAt: '2026-01-15T10:00:00Z',
    })
    mockDisconnectStrava.mockResolvedValue(undefined)

    renderProfile()
    const btn = await screen.findByRole('button', { name: /déconnecter/i })
    await userEvent.click(btn)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /connecter strava/i })).toBeInTheDocument(),
    )
  })

  it('affiche une erreur si la déconnexion échoue', async () => {
    mockGetStravaStatus.mockResolvedValue({
      connected: true,
      athleteName: 'Thomas Dupont',
      connectedAt: '2026-01-15T10:00:00Z',
    })
    mockDisconnectStrava.mockRejectedValue(new Error('network error'))

    renderProfile()
    const btn = await screen.findByRole('button', { name: /déconnecter/i })
    await userEvent.click(btn)

    await waitFor(() =>
      expect(screen.getByText(/la déconnexion a échoué/i)).toBeInTheDocument(),
    )
  })

  // ── Erreur API status ──────────────────────────────────────────────────

  it('affiche un message d\'erreur si le statut Strava est indisponible', async () => {
    mockGetStravaStatus.mockRejectedValue(new Error('network'))
    renderProfile()
    await waitFor(() =>
      expect(screen.getByText(/impossible de récupérer le statut strava/i)).toBeInTheDocument(),
    )
  })

  // ── Retour OAuth ───────────────────────────────────────────────────────

  it('affiche le message de succès si ?strava=connected est présent', async () => {
    mockGetStravaStatus.mockResolvedValue({
      connected: true,
      athleteName: 'Thomas Dupont',
      connectedAt: '2026-01-15T10:00:00Z',
    })
    renderProfile('?strava=connected')
    expect(
      screen.getByText(/strava connecté avec succès/i),
    ).toBeInTheDocument()
  })

  it('ne affiche pas le message de succès sans paramètre', async () => {
    mockGetStravaStatus.mockResolvedValue({ connected: false })
    renderProfile()
    await waitFor(() =>
      expect(screen.queryByText(/strava connecté avec succès/i)).not.toBeInTheDocument(),
    )
  })
})
