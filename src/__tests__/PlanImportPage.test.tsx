import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import PlanImportPage from '../pages/PlanImportPage'

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockNavigate = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockImportPlan = vi.hoisted(() => vi.fn())
const mockArchivePlan = vi.hoisted(() => vi.fn())
vi.mock('../services/plan', () => ({
  importPlan: mockImportPlan,
  archivePlan: mockArchivePlan,
}))

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>()
  return {
    ...actual,
    default: actual.default,
    isAxiosError: (err: unknown) =>
      typeof err === 'object' && err !== null && (err as Record<string, unknown>).isAxiosError === true,
  }
})

const VALID_PLAN = {
  planId: 'plan-1',
  name: 'Plan marathon',
  goal: 'Courir le marathon de Paris',
  startDate: '2026-04-01',
  endDate: '2026-10-15',
  weeksCount: 28,
  sessionsCount: 112,
}

const CONFLICT_ERROR = {
  isAxiosError: true,
  response: {
    status: 409,
    data: { message: 'Un plan actif existe déjà.', planId: 'plan-actif-42' },
  },
}

function renderPage() {
  render(
    <MemoryRouter>
      <PlanImportPage />
    </MemoryRouter>,
  )
}

function typeJson(value: string) {
  const textarea = screen.getByRole('textbox')
  fireEvent.change(textarea, { target: { value } })
}

afterEach(() => vi.clearAllMocks())

// ─── Affichage initial ─────────────────────────────────────────────────────

describe('PlanImportPage — affichage initial', () => {
  it('affiche le titre', () => {
    renderPage()
    expect(screen.getByText('Importer un plan')).toBeInTheDocument()
  })

  it('affiche la zone de texte JSON', () => {
    renderPage()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('affiche le bouton "Valider et importer" désactivé si champ vide', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Valider et importer' })).toBeDisabled()
  })

  it('active le bouton dès que du texte est saisi', () => {
    renderPage()
    typeJson('x')
    expect(screen.getByRole('button', { name: 'Valider et importer' })).not.toBeDisabled()
  })
})

// ─── Validation JSON invalide côté client ──────────────────────────────────

describe('PlanImportPage — JSON syntaxiquement invalide', () => {
  it("affiche un message d'erreur sans appeler l'API", async () => {
    const user = userEvent.setup()
    renderPage()
    typeJson('not json at all')
    await user.click(screen.getByRole('button', { name: 'Valider et importer' }))

    expect(screen.getByText(/JSON invalide/i)).toBeInTheDocument()
    expect(mockImportPlan).not.toHaveBeenCalled()
  })
})

// ─── Import réussi → aperçu ────────────────────────────────────────────────

describe('PlanImportPage — import réussi', () => {
  it("affiche l'aperçu avec les données du plan", async () => {
    mockImportPlan.mockResolvedValue(VALID_PLAN)
    const user = userEvent.setup()
    renderPage()

    typeJson('{"planName":"test"}')
    await user.click(screen.getByRole('button', { name: 'Valider et importer' }))

    await screen.findByText('Plan validé avec succès')
    expect(screen.getByText('Plan marathon')).toBeInTheDocument()
    expect(screen.getByText('28 semaines')).toBeInTheDocument()
    expect(screen.getByText('112 séances')).toBeInTheDocument()
  })

  it("appelle importPlan avec le contenu du champ", async () => {
    mockImportPlan.mockResolvedValue(VALID_PLAN)
    const user = userEvent.setup()
    renderPage()

    const json = '{"planName":"test"}'
    typeJson(json)
    await user.click(screen.getByRole('button', { name: 'Valider et importer' }))

    await waitFor(() => expect(mockImportPlan).toHaveBeenCalledWith({ planJson: json }))
  })

  it('navigue vers /dashboard au clic sur "Confirmer l\'import"', async () => {
    mockImportPlan.mockResolvedValue(VALID_PLAN)
    const user = userEvent.setup()
    renderPage()

    typeJson('{"planName":"test"}')
    await user.click(screen.getByRole('button', { name: 'Valider et importer' }))
    await screen.findByText("Confirmer l'import")
    await user.click(screen.getByRole('button', { name: "Confirmer l'import" }))

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('revient au formulaire au clic sur "Modifier le JSON"', async () => {
    mockImportPlan.mockResolvedValue(VALID_PLAN)
    const user = userEvent.setup()
    renderPage()

    typeJson('{"planName":"test"}')
    await user.click(screen.getByRole('button', { name: 'Valider et importer' }))
    await screen.findByText('Modifier le JSON')
    await user.click(screen.getByRole('button', { name: 'Modifier le JSON' }))

    expect(screen.getByRole('button', { name: 'Valider et importer' })).toBeInTheDocument()
  })
})

// ─── Erreur API générique ──────────────────────────────────────────────────

describe('PlanImportPage — erreur API', () => {
  it("affiche le message d'erreur renvoyé par l'API", async () => {
    mockImportPlan.mockRejectedValue({
      isAxiosError: true,
      response: { status: 400, data: { message: 'JSON invalide ou structure incorrecte' } },
    })
    const user = userEvent.setup()
    renderPage()

    typeJson('{"ok":true}')
    await user.click(screen.getByRole('button', { name: 'Valider et importer' }))

    await screen.findByText('JSON invalide ou structure incorrecte')
  })

  it("affiche un message générique si l'erreur n'a pas de message", async () => {
    mockImportPlan.mockRejectedValue(new Error('network'))
    const user = userEvent.setup()
    renderPage()

    typeJson('{"ok":true}')
    await user.click(screen.getByRole('button', { name: 'Valider et importer' }))

    await screen.findByText(/Une erreur est survenue/i)
  })
})

// ─── Conflit 409 ──────────────────────────────────────────────────────────

describe('PlanImportPage — conflit 409', () => {
  it("affiche le message du 409 et le bouton d'archivage", async () => {
    mockImportPlan.mockRejectedValue(CONFLICT_ERROR)
    const user = userEvent.setup()
    renderPage()

    typeJson('{"planName":"test"}')
    await user.click(screen.getByRole('button', { name: 'Valider et importer' }))

    await screen.findByText('Un plan actif existe déjà.')
    expect(
      screen.getByRole('button', { name: 'Archiver mon plan actuel et importer' }),
    ).toBeInTheDocument()
  })

  it('affiche toujours le formulaire JSON en cas de conflit', async () => {
    mockImportPlan.mockRejectedValue(CONFLICT_ERROR)
    const user = userEvent.setup()
    renderPage()

    typeJson('{"planName":"test"}')
    await user.click(screen.getByRole('button', { name: 'Valider et importer' }))
    await screen.findByText('Un plan actif existe déjà.')

    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Valider et importer' })).toBeInTheDocument()
  })

  it("appelle archivePlan puis importPlan au clic sur 'Archiver mon plan actuel et importer'", async () => {
    mockImportPlan
      .mockRejectedValueOnce(CONFLICT_ERROR)
      .mockResolvedValueOnce(VALID_PLAN)
    mockArchivePlan.mockResolvedValue({ planId: 'plan-actif-42', archived: true })
    const user = userEvent.setup()
    renderPage()

    typeJson('{"planName":"test"}')
    await user.click(screen.getByRole('button', { name: 'Valider et importer' }))
    await screen.findByText('Un plan actif existe déjà.')

    await user.click(
      screen.getByRole('button', { name: 'Archiver mon plan actuel et importer' }),
    )

    await waitFor(() => expect(mockArchivePlan).toHaveBeenCalledWith('plan-actif-42'))
    await waitFor(() =>
      expect(mockImportPlan).toHaveBeenCalledTimes(2),
    )
  })

  it("affiche l'aperçu après archive + reimport réussi", async () => {
    mockImportPlan
      .mockRejectedValueOnce(CONFLICT_ERROR)
      .mockResolvedValueOnce(VALID_PLAN)
    mockArchivePlan.mockResolvedValue({ planId: 'plan-actif-42', archived: true })
    const user = userEvent.setup()
    renderPage()

    typeJson('{"planName":"test"}')
    await user.click(screen.getByRole('button', { name: 'Valider et importer' }))
    await screen.findByText('Un plan actif existe déjà.')

    await user.click(
      screen.getByRole('button', { name: 'Archiver mon plan actuel et importer' }),
    )

    await screen.findByText('Plan validé avec succès')
    expect(screen.getByText('Plan marathon')).toBeInTheDocument()
  })

  it("affiche une erreur générique si l'archivage échoue", async () => {
    mockImportPlan.mockRejectedValueOnce(CONFLICT_ERROR)
    mockArchivePlan.mockRejectedValue(new Error('network'))
    const user = userEvent.setup()
    renderPage()

    typeJson('{"planName":"test"}')
    await user.click(screen.getByRole('button', { name: 'Valider et importer' }))
    await screen.findByText('Un plan actif existe déjà.')

    await user.click(
      screen.getByRole('button', { name: 'Archiver mon plan actuel et importer' }),
    )

    await screen.findByText(/Une erreur est survenue/i)
  })
})
