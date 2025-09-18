import { useQuery } from '@tanstack/react-query'
import { api, WeeklyReport } from '../lib/api'

export default function Reports() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['weekly_reports'],
    queryFn: async () => (await api.get<WeeklyReport[]>('/weekly_reports?limit=100')).data,
  })

  if (isLoading) return <div>Loading...</div>
  if (error || !data) return <div>Error</div>

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Reports</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full border bg-white">
          <thead className="bg-gray-50 text-left text-sm">
            <tr>
              <th className="p-2 border">Week</th>
              <th className="p-2 border">Interviews</th>
              <th className="p-2 border">Registrations</th>
              <th className="p-2 border">Messages</th>
              <th className="p-2 border">Tickets</th>
              <th className="p-2 border">Orders</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {data.map((r) => (
              <tr key={r.id} className="even:bg-gray-50">
                <td className="p-2 border">{r.week_start} – {r.week_end}</td>
                <td className="p-2 border">{r.interviews ?? 0}</td>
                <td className="p-2 border">{r.registrations ?? 0}</td>
                <td className="p-2 border">{r.messages ?? 0}</td>
                <td className="p-2 border">{r.tickets_resolved ?? 0}</td>
                <td className="p-2 border">{r.orders ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


