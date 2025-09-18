# KalinkowaAI Backend (FastAPI)

## Run locally
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
export SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
# optional service role for server writes
# export SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE"
uvicorn main:app --host 0.0.0.0 --port 10000 --reload
```

## Render deploy
- Build command: `pip install -r backend/requirements.txt`
- Start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- Environment:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (optional)
