import { useState } from 'react'
import { api } from '../lib/api'

export default function WeeklyForm() {
  const [state, setState] = useState({
    week_start: '',
    week_end: '',
    interviews: 0,
    registrations: 0,
    messages: 0,
    tickets_resolved: 0,
    orders: 0,
    stress_level: 0,
    full_days: 0,
  })
  const [ok, setOk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setOk(null); setErr(null)
    try {
      await api.post('/weekly_reports', {
        week_start: state.week_start,
        week_end: state.week_end,
        interviews: Number(state.interviews),
        registrations: Number(state.registrations),
        messages: Number(state.messages),
        tickets_resolved: Number(state.tickets_resolved),
        orders: Number(state.orders),
        stress_level: Number(state.stress_level),
        full_days: Number(state.full_days),
      })
      setOk('Saved')
    } catch (e: any) {
      setErr(e?.message || 'Error')
    }
  }

  const set = (k: string) => (v: any) => setState((s) => ({ ...s, [k]: v }))

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Weekly Report</h1>
      <form className="grid gap-3 max-w-xl" onSubmit={onSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <input type="date" className="border p-2 rounded" value={state.week_start} onChange={(e) => set('week_start')(e.target.value)} />
          <input type="date" className="border p-2 rounded" value={state.week_end} onChange={(e) => set('week_end')(e.target.value)} />
        </div>
        <NumberInput label="Interviews" value={state.interviews} onChange={set('interviews')} />
        <NumberInput label="Registrations" value={state.registrations} onChange={set('registrations')} />
        <NumberInput label="Messages" value={state.messages} onChange={set('messages')} />
        <NumberInput label="Tickets Resolved" value={state.tickets_resolved} onChange={set('tickets_resolved')} />
        <NumberInput label="Orders" value={state.orders} onChange={set('orders')} />
        <NumberInput label="Stress (0-10)" value={state.stress_level} onChange={set('stress_level')} />
        <NumberInput label="Full days" value={state.full_days} onChange={set('full_days')} />
        <button className="bg-black text-white rounded px-3 py-2">Save</button>
        {ok && <div className="text-green-600 text-sm">{ok}</div>}
        {err && <div className="text-red-600 text-sm">{err}</div>}
      </form>
    </div>
  )
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-gray-600">{label}</span>
      <input type="number" className="border p-2 rounded" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}


