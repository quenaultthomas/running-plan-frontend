import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RegisterPage from '../pages/RegisterPage'

const mockUseAuth = vi.hoisted(() => vi.fn())

vi.mock('../hooks/useAuth', () => ({
  useAuth: mockUseAuth,
}))

const handleRegisterMock = vi.fn()

beforeEach(() => {
  mockUseAuth.mockReturnValue({
    handleLogin: vi.fn(),
    handleRegister: handleRegisterMock,
    logout: vi.fn(),
    loading: false,
    error: null,
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

function renderRegister() {
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  )
}

// Helpers pour remplir le formulaire
async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  overrides: {
    name?: string
    email?: string
    password?: string
    confirm?: string
  } = {},
) {
  const {
    name = 'Jean Test',
    email = 'jean@example.com',
    password = 'motdepasse1',
    confirm = 'motdepasse1',
  } = overrides

  const [passwordInput, confirmInput] = screen.getAllByPlaceholderText('••••••••')

  if (name) await user.type(screen.getByPlaceholderText('Jean Dupont'), name)
  if (email) await user.type(screen.getByPlaceholderText('vous@exemple.com'), email)
  if (password) await user.type(passwordInput, password)
  if (confirm) await user.type(confirmInput, confirm)
}

// ─── Validation des champs ─────────────────────────────────────────────────

describe('RegisterPage — validation des champs', () => {
  it('affiche les erreurs requis si le formulaire est vide', async () => {
    const user = userEvent.setup()
    renderRegister()

    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    expect(await screen.findByText('Nom requis')).toBeInTheDocument()
    expect(screen.getByText('Email requis')).toBeInTheDocument()
    expect(screen.getByText('Mot de passe requis')).toBeInTheDocument()
    expect(screen.getByText('Confirmation requise')).toBeInTheDocument()
  })

  it("affiche 'Email invalide' pour un email sans domaine", async () => {
    const user = userEvent.setup()
    renderRegister()

    await fillForm(user, { email: 'pasunemail' })
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    expect(await screen.findByText('Email invalide')).toBeInTheDocument()
    expect(handleRegisterMock).not.toHaveBeenCalled()
  })

  it("affiche '8 caractères minimum' si le mot de passe est trop court", async () => {
    const user = userEvent.setup()
    renderRegister()

    await fillForm(user, { password: 'court', confirm: 'court' })
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    expect(await screen.findByText('8 caractères minimum')).toBeInTheDocument()
    expect(handleRegisterMock).not.toHaveBeenCalled()
  })

  it("affiche 'Les mots de passe ne correspondent pas' si la confirmation diffère", async () => {
    const user = userEvent.setup()
    renderRegister()

    await fillForm(user, { password: 'motdepasse1', confirm: 'autremotdepasse' })
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    expect(
      await screen.findByText('Les mots de passe ne correspondent pas'),
    ).toBeInTheDocument()
    expect(handleRegisterMock).not.toHaveBeenCalled()
  })
})

// ─── Soumission réussie ────────────────────────────────────────────────────

describe('RegisterPage — soumission réussie', () => {
  it('appelle handleRegister avec name, email, password — sans confirmPassword', async () => {
    const user = userEvent.setup()
    renderRegister()

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    await waitFor(() => {
      expect(handleRegisterMock).toHaveBeenCalledWith({
        name: 'Jean Test',
        email: 'jean@example.com',
        password: 'motdepasse1',
      })
    })

    // confirmPassword ne doit jamais être transmis à l'API
    expect(handleRegisterMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ confirmPassword: expect.anything() }),
    )
  })

  it('affiche le lien vers /login', () => {
    renderRegister()
    expect(screen.getByRole('link', { name: 'Se connecter' })).toBeInTheDocument()
  })
})

// ─── Erreur API ────────────────────────────────────────────────────────────

describe("RegisterPage — affichage de l'erreur API", () => {
  it('affiche le message retourné par le hook', () => {
    mockUseAuth.mockReturnValue({
      handleLogin: vi.fn(),
      handleRegister: handleRegisterMock,
      logout: vi.fn(),
      loading: false,
      error: 'Email déjà utilisé',
    })
    renderRegister()
    expect(screen.getByText('Email déjà utilisé')).toBeInTheDocument()
  })
})
