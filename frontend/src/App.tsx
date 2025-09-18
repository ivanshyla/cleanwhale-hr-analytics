import { Link, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Reports from './pages/Reports'
import WeeklyForm from './pages/WeeklyForm'
import CountryForm from './pages/CountryForm'
import Login from './pages/Login'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
          <div className="font-semibold">Kalinkowa HR/OPS</div>
          <nav className="flex gap-3 text-sm">
            <Link to="/" className="hover:underline">Dashboard</Link>
            <Link to="/login" className="hover:underline">Login</Link>
            <Link to="/weekly" className="hover:underline">Weekly Form</Link>
            <Link to="/country" className="hover:underline">Country Form</Link>
            <Link to="/reports" className="hover:underline">Reports</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/weekly" element={<WeeklyForm />} />
          <Route path="/country" element={<CountryForm />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
