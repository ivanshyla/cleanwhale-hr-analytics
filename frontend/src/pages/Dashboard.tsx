import { useQuery } from '@tanstack/react-query'
import { api, Summary } from '../lib/api'

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['summary'],
    queryFn: async () => (await api.get<Summary>('/summary')).data,
  })

  if (isLoading) return <div>Loading...</div>
  if (error || !data) return <div>Error</div>

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <Card title="Reports" value={data.count} />
      <Card title="Interviews" value={data.interviews} />
      <Card title="Registrations" value={data.registrations} />
      <Card title="Messages" value={data.messages} />
      <Card title="Tickets" value={data.tickets_resolved} />
      <Card title="Orders" value={data.orders} />
      <Card title="Avg Stress" value={data.avg_stress} />
    </div>
  )
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-md bg-white p-4 shadow-sm border">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}


