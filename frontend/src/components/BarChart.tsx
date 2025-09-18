import { BarChart as BC, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function BarChart({ data, xKey, yKey }: { data: any[]; xKey: string; yKey: string }) {
  return (
    <div className="bg-white border rounded p-3">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BC data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Bar dataKey={yKey} fill="#111827" />
          </BC>
        </ResponsiveContainer>
      </div>
    </div>
  )
}


