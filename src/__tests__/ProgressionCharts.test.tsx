import { render, screen } from '@testing-library/react'
import ProgressionCharts from '../components/ProgressionCharts'
import { WeeklyStat } from '../types/plan'

// ─── Mock recharts ────────────────────────────────────────────────────────────
// recharts utilise ResizeObserver et canvas non disponibles en jsdom

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="line-chart" data-points={data?.length}>{children}</div>
  ),
  Line: ({ name, stroke }: { name: string; stroke: string }) => (
    <div data-testid={`line-${name}`} data-stroke={stroke} />
  ),
  XAxis: ({ dataKey }: { dataKey: string }) => (
    <div data-testid="x-axis" data-key={dataKey} />
  ),
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PAST_WEEK: WeeklyStat = {
  weekNumber: 1,
  startDate: '2026-01-05',
  plannedDistanceKm: 30,
  actualDistanceKm: 28,
  plannedDurationMin: 180,
  actualDurationMin: 165,
}

const FUTURE_WEEK: WeeklyStat = {
  weekNumber: 2,
  startDate: '2099-01-01',
  plannedDistanceKm: 35,
  actualDistanceKm: 0,
  plannedDurationMin: 200,
  actualDurationMin: 0,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProgressionCharts', () => {
  it('affiche la section "Progression par semaine"', () => {
    render(<ProgressionCharts weeklyStats={[PAST_WEEK]} />)
    expect(screen.getByRole('region', { name: /graphiques de progression/i })).toBeInTheDocument()
    expect(screen.getByText(/Progression par semaine/i)).toBeInTheDocument()
  })

  it('affiche les deux graphiques (distance et durée)', () => {
    render(<ProgressionCharts weeklyStats={[PAST_WEEK]} />)
    expect(screen.getByText('Distance (km)')).toBeInTheDocument()
    expect(screen.getByText('Durée (min)')).toBeInTheDocument()
    expect(screen.getAllByTestId('line-chart')).toHaveLength(2)
  })

  it('ne rend rien si toutes les semaines sont dans le futur', () => {
    const { container } = render(<ProgressionCharts weeklyStats={[FUTURE_WEEK]} />)
    expect(container.firstChild).toBeNull()
  })

  it('ne rend rien si weeklyStats est vide', () => {
    const { container } = render(<ProgressionCharts weeklyStats={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('filtre les semaines futures et ne garde que les passées', () => {
    render(<ProgressionCharts weeklyStats={[PAST_WEEK, FUTURE_WEEK]} />)
    // 2 LineCharts, chacun avec 1 point (seul PAST_WEEK est visible)
    const charts = screen.getAllByTestId('line-chart')
    expect(charts).toHaveLength(2)
    charts.forEach((chart) => {
      expect(chart).toHaveAttribute('data-points', '1')
    })
  })

  it('formate les labels X en "Sem. N"', () => {
    render(<ProgressionCharts weeklyStats={[PAST_WEEK]} />)
    const xAxes = screen.getAllByTestId('x-axis')
    xAxes.forEach((axis) => {
      expect(axis).toHaveAttribute('data-key', 'name')
    })
  })

  it('crée 4 lignes au total (2 par graphique : Objectif + Réalisé)', () => {
    render(<ProgressionCharts weeklyStats={[PAST_WEEK]} />)
    expect(screen.getAllByTestId('line-Objectif')).toHaveLength(2)
    expect(screen.getAllByTestId('line-Réalisé')).toHaveLength(2)
  })

  it('utilise #3B82F6 pour les lignes Objectif', () => {
    render(<ProgressionCharts weeklyStats={[PAST_WEEK]} />)
    screen.getAllByTestId('line-Objectif').forEach((line) => {
      expect(line).toHaveAttribute('data-stroke', '#3B82F6')
    })
  })

  it('utilise #22C55E pour les lignes Réalisé', () => {
    render(<ProgressionCharts weeklyStats={[PAST_WEEK]} />)
    screen.getAllByTestId('line-Réalisé').forEach((line) => {
      expect(line).toHaveAttribute('data-stroke', '#22C55E')
    })
  })

  it('inclut plusieurs semaines passées dans les données', () => {
    const week2: WeeklyStat = {
      ...PAST_WEEK,
      weekNumber: 2,
      startDate: '2026-01-12',
      plannedDistanceKm: 35,
      actualDistanceKm: 33,
    }
    render(<ProgressionCharts weeklyStats={[PAST_WEEK, week2]} />)
    const charts = screen.getAllByTestId('line-chart')
    charts.forEach((chart) => {
      expect(chart).toHaveAttribute('data-points', '2')
    })
  })
})
