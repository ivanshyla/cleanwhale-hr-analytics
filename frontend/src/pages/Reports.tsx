import { useQuery } from '@tanstack/react-query'
import { api, WeeklyReport } from '../lib/api'
import DataTable from '../components/DataTable'
import FiltersBar from '../components/FiltersBar'

export default function Reports() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['weekly_reports'],
    queryFn: async () => (await api.get<WeeklyReport[]>('/weekly_reports?limit=100')).data,
  })

  if (isLoading) return <div>Loading...</div>
  if (error || !data) return <div>Error</div>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <FiltersBar />
      <DataTable
        data={data}
        columns={[
          { key: 'week_start', title: 'Week start' },
          { key: 'week_end', title: 'Week end' },
          { key: 'interviews', title: 'Interviews' },
          { key: 'registrations', title: 'Registrations' },
          { key: 'messages', title: 'Messages' },
          { key: 'tickets_resolved', title: 'Tickets' },
          { key: 'orders', title: 'Orders' },
        ]}
      />
    </div>
  )
}


