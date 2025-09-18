type Col<T> = {
  key: keyof T
  title: string
}

export default function DataTable<T>({ data, columns }: { data: T[]; columns: Col<T>[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border bg-white">
        <thead className="bg-gray-50 text-left text-sm">
          <tr>
            {columns.map((c) => (
              <th key={String(c.key)} className="p-2 border">{c.title}</th>
            ))}
          </tr>
        </thead>
        <tbody className="text-sm">
          {data.map((row, idx) => (
            <tr key={idx} className="even:bg-gray-50">
              {columns.map((c) => (
                <td key={String(c.key)} className="p-2 border">{String(row[c.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


