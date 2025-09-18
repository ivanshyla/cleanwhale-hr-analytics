type KPIs = {
  title: string
  value: number | string
}[]

export default function KPIcards({ items }: { items: KPIs }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {items.map((k) => (
        <div key={k.title} className="rounded-md bg-white p-4 shadow-sm border">
          <div className="text-xs text-gray-500">{k.title}</div>
          <div className="text-2xl font-semibold">{k.value}</div>
        </div>
      ))}
    </div>
  )
}


