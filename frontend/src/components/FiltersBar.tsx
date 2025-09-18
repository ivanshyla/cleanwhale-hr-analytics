type Props = {
  city?: string
  onCityChange?: (v: string) => void
  role?: string
  onRoleChange?: (v: string) => void
  onApply?: () => void
}

export default function FiltersBar({ city = '', role = '', onCityChange, onRoleChange, onApply }: Props) {
  return (
    <div className="flex flex-wrap gap-2 items-center bg-white border rounded p-3">
      <input
        placeholder="City"
        className="border rounded px-2 py-1"
        value={city}
        onChange={(e) => onCityChange?.(e.target.value)}
      />
      <select className="border rounded px-2 py-1" value={role} onChange={(e) => onRoleChange?.(e.target.value)}>
        <option value="">All roles</option>
        <option value="hiring">Hiring</option>
        <option value="operations">Operations</option>
        <option value="mixed">Mixed</option>
        <option value="country_manager">Country</option>
      </select>
      <button className="bg-black text-white rounded px-3 py-1" onClick={onApply}>Apply</button>
    </div>
  )
}


