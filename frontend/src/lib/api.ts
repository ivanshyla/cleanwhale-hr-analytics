import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

export type Summary = {
  count: number
  interviews: number
  registrations: number
  messages: number
  tickets_resolved: number
  orders: number
  avg_stress: number
}

export type WeeklyReport = {
  id: number
  week_start: string
  week_end: string
  interviews?: number
  ads_posted?: number
  registrations?: number
  full_days?: number
  hiring_issues?: string | null
  stress_level?: number
  overtime?: boolean
  messages?: number
  tickets_resolved?: number
  orders?: number
  created_at: string
}


