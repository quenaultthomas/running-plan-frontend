import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'

const mockUseAuth = vi.hoisted(() => vi.fn())
vi.mock('../hooks/useAuth', () => ({ useAuth: mockUseAuth }))

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

afterEach(() => vi.clearAllMocks())

function renderLogin() {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

// ─── Affichage du formulaire ───────────────────────────────────────────────

describe('LoginPage — affichage du formulaire', () => {
  it('affiche le champ pseudo', () => {
    renderLogin()
    expect(screen.getByPlaceholderText('mon_pseudo')).toBeInTheDocument()
  })

  it('affiche le champ mot de passe', () => {
    renderLogin()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  it('affiche le bouton de soumission', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument()
  })

  it('affiche le lien vers /register', () => {
    renderLogin()
    expect(screen.getByRole('link', { name: "S'inscrire" })).toBeInTheDocument()
  })

  it("n'affiche pas de champ email", () => {
    renderLogin()
    expect(screen.queryByPlaceholderText('vous@exemple.com')).not.toBeInTheDocument()
  })
})

// ─── Validation ────────────────────────────────────────────────────────────

describe('LoginPage — validation du pseudo', () => {
  it("affiche 'Pseudo requis' si le champ est vide", async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))
    expect(await screen.findByText('Pseudo requis')).toBeInTheDocument()
    expect(handleLoginMock).not.toHaveBeenCalled()
  })

  it("affiche '3 caractères minimum' si le pseudo est trop court", async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByPlaceholderText('mon_pseudo'), 'ab')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))
    expect(await screen.findByText('3 caractères minimum')).toBeInTheDocument()
    expect(handleLoginMock).not.toHaveBeenCalled()
  })

  it("affiche '30 caractères maximum' si le pseudo est trop long", async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByPlaceholderText('mon_pseudo'), 'a'.repeat(31))
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))
    expect(await screen.findByText('30 caractères maximum')).toBeInTheDocument()
    expect(handleLoginMock).not.toHaveBeenCalled()
  })

  it('affiche une erreur si le pseudo contient des espaces', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByPlaceholderText('mon_pseudo'), 'mon pseudo')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))
    expect(await screen.findByText('Lettres, chiffres, - et _ uniquement')).toBeInTheDocument()
    expect(handleLoginMock).not.toHaveBeenCalled()
  })

  it('accepte les caractères alphanumériques, _ et -', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByPlaceholderText('mon_pseudo'), 'Jean_Dupont-42')
    await user.type(screen.getByPlaceholderText('••••••••'), 'motdepasse1')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))
    await waitFor(() => expect(handleLoginMock).toHaveBeenCalledWith(
      { username: 'Jean_Dupont-42', password: 'motdepasse1' },
      expect.anything(),
    ))
  })
})

// ─── Soumission réussie ────────────────────────────────────────────────────

describe('LoginPage — soumission réussie', () => {
  it('appelle handleLogin avec username et password', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByPlaceholderText('mon_pseudo'), 'jeantest')
    await user.type(screen.getByPlaceholderText('••••••••'), 'motdepasse1')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() => {
      expect(handleLoginMock).toHaveBeenCalledWith(
        { username: 'jeantest', password: 'motdepasse1' },
        expect.anything(),
      )
    })
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
    expect(screen.queryByText('Identifiants incorrects')).not.toBeInTheDocument()
  })
})
