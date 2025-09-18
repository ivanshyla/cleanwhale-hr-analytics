from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Any, Dict
import os
import httpx

app = FastAPI(title="KalinkowaAI Backend", version="0.1.0")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Prefer service role on server for RLS-bypassing writes when needed
SUPABASE_AUTH_HEADER = (
    {"apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"}
    if SUPABASE_SERVICE_ROLE_KEY
    else {"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {SUPABASE_ANON_KEY}"}
)


class WeeklyReportIn(BaseModel):
    user_id: str
    week_iso: str
    week_start_date: str
    hr_metrics: Dict[str, Any] = {}
    ops_metrics: Dict[str, Any] = {}


class CountryReportIn(BaseModel):
    manager_id: Optional[str] = None
    country: str = "PL"
    week_iso: str
    summary: Optional[str] = None
    aggregates: Dict[str, Any] = {}


@app.get("/")
async def root():
    return {"status": "ok"}


@app.get("/weekly_reports")
async def list_weekly_reports(week_iso: Optional[str] = Query(None)):
    if not SUPABASE_URL:
        raise HTTPException(500, "SUPABASE_URL not configured")
    url = f"{SUPABASE_URL}/rest/v1/weekly_reports"
    params = {"select": "*"}
    if week_iso:
        params["week_iso"] = f"eq.{week_iso}"
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(url, headers={**SUPABASE_AUTH_HEADER, "Accept": "application/json"}, params=params)
        r.raise_for_status()
        return r.json()


@app.post("/weekly_reports", status_code=201)
async def create_weekly_report(payload: WeeklyReportIn):
    url = f"{SUPABASE_URL}/rest/v1/weekly_reports"
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(url, headers={**SUPABASE_AUTH_HEADER, "Content-Type": "application/json"}, json=payload.model_dump())
        if r.status_code >= 400:
            raise HTTPException(r.status_code, r.text)
        return r.json()


@app.get("/country_reports")
async def list_country_reports(week_iso: Optional[str] = Query(None)):
    url = f"{SUPABASE_URL}/rest/v1/country_reports"
    params = {"select": "*"}
    if week_iso:
        params["week_iso"] = f"eq.{week_iso}"
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(url, headers={**SUPABASE_AUTH_HEADER, "Accept": "application/json"}, params=params)
        r.raise_for_status()
        return r.json()


@app.post("/country_reports", status_code=201)
async def create_country_report(payload: CountryReportIn):
    url = f"{SUPABASE_URL}/rest/v1/country_reports"
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(url, headers={**SUPABASE_AUTH_HEADER, "Content-Type": "application/json"}, json=payload.model_dump())
        if r.status_code >= 400:
            raise HTTPException(r.status_code, r.text)
        return r.json()


@app.get("/summary")
async def summary(week_iso: Optional[str] = Query(None)):
    url = f"{SUPABASE_URL}/rest/v1/weekly_reports"
    params = {"select": "hr_metrics,ops_metrics,week_iso"}
    if week_iso:
        params["week_iso"] = f"eq.{week_iso}"
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url, headers={**SUPABASE_AUTH_HEADER, "Accept": "application/json"}, params=params)
        r.raise_for_status()
        rows = r.json()
    total_reports = len(rows)
    return {"total_reports": total_reports, "week_iso": week_iso or "all"}


@app.get("/export")
async def export_data(week_iso: Optional[str] = Query(None)):
    url = f"{SUPABASE_URL}/rest/v1/weekly_reports"
    params = {"select": "*"}
    if week_iso:
        params["week_iso"] = f"eq.{week_iso}"
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.get(url, headers={**SUPABASE_AUTH_HEADER, "Accept": "application/json"}, params=params)
        r.raise_for_status()
        return {"data": r.json()}

# Run: uvicorn main:app --host 0.0.0.0 --port 10000
