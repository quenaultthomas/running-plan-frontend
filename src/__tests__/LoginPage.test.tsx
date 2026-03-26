import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'

// vi.hoisted garantit que la variable est initialisée AVANT le hissage de vi.mock
const mockUseAuth = vi.hoisted(() => vi.fn())

vi.mock('../hooks/useAuth', () => ({
  useAuth: mockUseAuth,
}))

const handleLoginMock = vi.fn()

beforeEach(() => {
  mockUseAuth.mockReturnValue({
    handleLogin: handleLoginMock,
    handleRegister: vi.fn(),
    logout: vi.fn(),
    loading: false,
    error: null,
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

function renderLogin() {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

// ─── Affichage du formulaire ───────────────────────────────────────────────

describe('LoginPage — affichage du formulaire', () => {
  it('affiche le champ email', () => {
    renderLogin()
    expect(screen.getByPlaceholderText('vous@exemple.com')).toBeInTheDocument()
  })

  it('affiche le champ mot de passe', () => {
    renderLogin()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  it('affiche le bouton de soumission', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument()
  })

  it("affiche le lien vers /register", () => {
    renderLogin()
    expect(screen.getByRole('link', { name: "S'inscrire" })).toBeInTheDocument()
  })
})

// ─── Soumission réussie ────────────────────────────────────────────────────

describe('LoginPage — soumission réussie', () => {
  it('appelle handleLogin avec email et password saisis', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByPlaceholderText('vous@exemple.com'), 'jean@example.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'motdepasse1')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    // RHF appelle handleSubmit(fn) avec (data, event) — on vérifie le premier argument
    await waitFor(() => {
      expect(handleLoginMock).toHaveBeenCalledWith(
        { email: 'jean@example.com', password: 'motdepasse1' },
        expect.anything(),
      )
    })
  })

  it("n'appelle pas handleLogin si l'email est invalide", async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByPlaceholderText('vous@exemple.com'), 'pasunemail')
    await user.type(screen.getByPlaceholderText('••••••••'), 'motdepasse1')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    await screen.findByText('Email invalide')
    expect(handleLoginMock).not.toHaveBeenCalled()
  })
})

// ─── Erreur API ────────────────────────────────────────────────────────────

describe("LoginPage — affichage de l'erreur API", () => {
  it('affiche le message retourné par le hook', () => {
    mockUseAuth.mockReturnValue({
      handleLogin: handleLoginMock,
      handleRegister: vi.fn(),
      logout: vi.fn(),
      loading: false,
      error: 'Identifiants incorrects',
    })
    renderLogin()
    expect(screen.getByText('Identifiants incorrects')).toBeInTheDocument()
  })

  it("n'affiche pas de message d'erreur quand error est null", () => {
    renderLogin()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('Identifiants incorrects')).not.toBeInTheDocument()
  })
})
