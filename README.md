# HR/Operations Weekly Report System

A web application for 15 managers to track weekly performance data with role-based reporting and analytics.

## Tech Stack

- **Database**: PostgreSQL (Supabase)
- **Backend**: FastAPI (Python), SQLAlchemy ORM
- **Frontend**: React + Vite + Tailwind CSS, Recharts
- **Authentication**: Supabase Auth
- **Hosting**: Railway/Render (Backend), Vercel (Frontend)

## Project Structure

```
├── backend/          # FastAPI application
├── frontend/         # React application
├── database/         # SQL schema and migrations
└── docs/            # Documentation
```

## Features

- Role-based reporting (Hiring, Operations, Mixed, Country Manager)
- Weekly data collection and visualization
- City, role, and time-based comparisons
- Export to CSV/Excel
- AI-powered insights and notifications

## Getting Started

1. Set up Supabase project and database
2. Configure environment variables
3. Run backend: `cd backend && uvicorn main:app --reload`
4. Run frontend: `cd frontend && npm run dev`

## Database Schema

- `profiles`: User information and roles
- `weekly_reports`: Weekly performance data
- `country_reports`: Country manager reports

