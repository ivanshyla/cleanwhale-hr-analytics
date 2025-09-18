import { LineChart as LC, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function LineChart({ data, xKey, yKey }: { data: any[]; xKey: string; yKey: string }) {
  return (
    <div className="bg-white border rounded p-3">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LC data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey={yKey} stroke="#111827" strokeWidth={2} dot={false} />
          </LC>
        </ResponsiveContainer>
      </div>
    </div>
  )
}


