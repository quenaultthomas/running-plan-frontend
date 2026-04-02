import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { WeeklyStat } from '../types/plan'

// ─── Tooltip personnalisé ────────────────────────────────────────────────────

interface TooltipPayloadItem {
  value: number | string
  name: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
  unit: string
}

function CustomTooltip({ active, payload, label, unit }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const planned = payload.find((p) => p.name === 'Objectif')
  const actual = payload.find((p) => p.name === 'Réalisé')
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {planned != null && (
        <p className="text-blue-600">Objectif : {planned.value} {unit}</p>
      )}
      {actual != null && (
        <p className="text-green-600">Réalisé : {actual.value} {unit}</p>
      )}
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────

interface Props {
  weeklyStats: WeeklyStat[]
}

export default function ProgressionCharts({ weeklyStats }: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const pastWeeks = weeklyStats.filter((w) => {
    const start = new Date(w.startDate)
    start.setHours(0, 0, 0, 0)
    return start <= today
  })

  if (pastWeeks.length === 0) return null

  const chartData = pastWeeks.map((w) => ({
    name: `Sem. ${w.weekNumber}`,
    plannedDistanceKm: w.plannedDistanceKm,
    actualDistanceKm: w.actualDistanceKm,
    plannedDurationMin: w.plannedDurationMin,
    actualDurationMin: w.actualDurationMin,
  }))

  return (
    <section aria-label="Graphiques de progression" className="mb-8">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Progression par semaine
      </h3>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* ── Graphique Distance ─────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Distance (km)</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip unit="km" />} />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => (
                  <span className="text-gray-600">{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="plannedDistanceKm"
                name="Objectif"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="actualDistanceKm"
                name="Réalisé"
                stroke="#22C55E"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ── Graphique Durée ────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Durée (min)</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip unit="min" />} />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => (
                  <span className="text-gray-600">{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="plannedDurationMin"
                name="Objectif"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="actualDurationMin"
                name="Réalisé"
                stroke="#22C55E"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
