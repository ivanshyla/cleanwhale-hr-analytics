import { useState } from 'react'
import { api } from '../lib/api'

export default function CountryForm() {
  const [state, setState] = useState({
    week_start: '',
    week_end: '',
    city: '',
    hired_people: 0,
    orders: 0,
    trengo_messages: 0,
    crm_tickets: 0,
    comments: '',
  })
  const [ok, setOk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setOk(null); setErr(null)
    try {
      await api.post('/country_reports', {
        user_id: 'country',
        ...state,
        hired_people: Number(state.hired_people),
        orders: Number(state.orders),
        trengo_messages: Number(state.trengo_messages),
        crm_tickets: Number(state.crm_tickets),
      })
      setOk('Saved')
    } catch (e: any) {
      setErr(e?.message || 'Error')
    }
  }

  const set = (k: string) => (v: any) => setState((s) => ({ ...s, [k]: v }))

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Country Manager</h1>
      <form className="grid gap-3 max-w-xl" onSubmit={onSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <input type="date" className="border p-2 rounded" value={state.week_start} onChange={(e) => set('week_start')(e.target.value)} />
          <input type="date" className="border p-2 rounded" value={state.week_end} onChange={(e) => set('week_end')(e.target.value)} />
        </div>
        <input placeholder="City" className="border p-2 rounded" value={state.city} onChange={(e) => set('city')(e.target.value)} />
        <NumberInput label="Hired People" value={state.hired_people} onChange={set('hired_people')} />
        <NumberInput label="Orders" value={state.orders} onChange={set('orders')} />
        <NumberInput label="Trengo Messages" value={state.trengo_messages} onChange={set('trengo_messages')} />
        <NumberInput label="CRM Tickets" value={state.crm_tickets} onChange={set('crm_tickets')} />
        <label className="grid gap-1 text-sm">
          <span className="text-gray-600">Comments</span>
          <textarea className="border p-2 rounded" rows={3} value={state.comments} onChange={(e) => set('comments')(e.target.value)} />
        </label>
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


