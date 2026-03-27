import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RegisterPage from '../pages/RegisterPage'

const mockUseAuth = vi.hoisted(() => vi.fn())
vi.mock('../hooks/useAuth', () => ({ useAuth: mockUseAuth }))

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

afterEach(() => vi.clearAllMocks())

function renderRegister() {
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  )
}

/** Remplit le formulaire via les placeholders */
async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  overrides: { username?: string; password?: string; confirm?: string } = {},
) {
  const {
    username = 'jeantest',
    password = 'motdepasse1',
    confirm = 'motdepasse1',
  } = overrides

  const [passwordInput, confirmInput] = screen.getAllByPlaceholderText('••••••••')
  if (username) await user.type(screen.getByPlaceholderText('mon_pseudo'), username)
  if (password) await user.type(passwordInput, password)
  if (confirm) await user.type(confirmInput, confirm)
}

// ─── Affichage ─────────────────────────────────────────────────────────────

describe('RegisterPage — affichage du formulaire', () => {
  it("n'affiche pas de champ email", () => {
    renderRegister()
    expect(screen.queryByPlaceholderText('vous@exemple.com')).not.toBeInTheDocument()
  })

  it("n'affiche pas de champ nom", () => {
    renderRegister()
    expect(screen.queryByPlaceholderText('Jean Dupont')).not.toBeInTheDocument()
  })

  it('affiche le champ pseudo', () => {
    renderRegister()
    expect(screen.getByPlaceholderText('mon_pseudo')).toBeInTheDocument()
  })

  it('affiche le lien vers /login', () => {
    renderRegister()
    expect(screen.getByRole('link', { name: 'Se connecter' })).toBeInTheDocument()
  })
})

// ─── Validation des champs ─────────────────────────────────────────────────

describe('RegisterPage — validation des champs', () => {
  it('affiche les erreurs requis si le formulaire est vide', async () => {
    const user = userEvent.setup()
    renderRegister()
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))
    expect(await screen.findByText('Pseudo requis')).toBeInTheDocument()
    expect(screen.getByText('Mot de passe requis')).toBeInTheDocument()
    expect(screen.getByText('Confirmation requise')).toBeInTheDocument()
  })

  it("affiche '3 caractères minimum' si le pseudo est trop court", async () => {
    const user = userEvent.setup()
    renderRegister()
    await fillForm(user, { username: 'ab' })
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))
    expect(await screen.findByText('3 caractères minimum')).toBeInTheDocument()
    expect(handleRegisterMock).not.toHaveBeenCalled()
  })

  it("affiche '30 caractères maximum' si le pseudo est trop long", async () => {
    const user = userEvent.setup()
    renderRegister()
    await fillForm(user, { username: 'a'.repeat(31) })
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))
    expect(await screen.findByText('30 caractères maximum')).toBeInTheDocument()
    expect(handleRegisterMock).not.toHaveBeenCalled()
  })

  it('affiche une erreur si le pseudo contient des espaces', async () => {
    const user = userEvent.setup()
    renderRegister()
    await fillForm(user, { username: 'jean dupont' })
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))
    expect(await screen.findByText('Lettres, chiffres, - et _ uniquement')).toBeInTheDocument()
    expect(handleRegisterMock).not.toHaveBeenCalled()
  })

  it('affiche une erreur si le pseudo contient @', async () => {
    const user = userEvent.setup()
    renderRegister()
    await fillForm(user, { username: 'jean@test' })
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))
    expect(await screen.findByText('Lettres, chiffres, - et _ uniquement')).toBeInTheDocument()
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
  it('appelle handleRegister avec username et password — sans confirmPassword', async () => {
    const user = userEvent.setup()
    renderRegister()
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    await waitFor(() => {
      expect(handleRegisterMock).toHaveBeenCalledWith({
        username: 'jeantest',
        password: 'motdepasse1',
      })
    })

    expect(handleRegisterMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ confirmPassword: expect.anything() }),
    )
  })

  it('accepte les underscores et tirets dans le pseudo', async () => {
    const user = userEvent.setup()
    renderRegister()
    await fillForm(user, { username: 'jean_dupont-42' })
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    await waitFor(() => {
      expect(handleRegisterMock).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'jean_dupont-42' }),
      )
    })
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
      error: 'Ce pseudo est déjà utilisé',
    })
    renderRegister()
    expect(screen.getByText('Ce pseudo est déjà utilisé')).toBeInTheDocument()
  })
})
