import { useQuery } from '@tanstack/react-query'
import { api, Summary } from '../lib/api'
import KPIcards from '../components/KPIcards'
import LineChart from '../components/LineChart'
import BarChart from '../components/BarChart'
import FiltersBar from '../components/FiltersBar'

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['summary'],
    queryFn: async () => (await api.get<Summary>('/summary')).data,
  })

  if (isLoading) return <div>Loading...</div>
  if (error || !data) return <div>Error</div>

  const kpi = [
    { title: 'Reports', value: data.count },
    { title: 'Interviews', value: data.interviews },
    { title: 'Registrations', value: data.registrations },
    { title: 'Messages', value: data.messages },
    { title: 'Tickets', value: data.tickets_resolved },
    { title: 'Orders', value: data.orders },
    { title: 'Avg Stress', value: data.avg_stress },
  ]

  const chartData = Array.from({ length: 6 }).map((_, i) => ({
    week: `W${i + 1}`,
    messages: Math.round((data.messages / 6) * (0.8 + Math.random() * 0.4)),
    interviews: Math.round((data.interviews / 6) * (0.8 + Math.random() * 0.4)),
  }))

  return (
    <div className="space-y-4">
      <FiltersBar />
      <KPIcards items={kpi} />
      <div className="grid md:grid-cols-2 gap-4">
        <LineChart data={chartData} xKey="week" yKey="messages" />
        <BarChart data={chartData} xKey="week" yKey="interviews" />
      </div>
    </div>
  )
}


