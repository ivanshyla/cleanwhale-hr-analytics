from datetime import date
from typing import Optional
from pydantic import BaseModel, Field


class WeeklyReportCreate(BaseModel):
    user_id: Optional[str] = None  # позже заменим на auth
    week_start: date
    week_end: date

    # HR
    interviews: Optional[int] = 0
    ads_posted: Optional[int] = 0
    registrations: Optional[int] = 0
    full_days: Optional[int] = 0
    hiring_issues: Optional[str] = None
    stress_level: Optional[int] = Field(default=0, ge=0, le=10)
    overtime: Optional[bool] = False

    # Ops
    messages: Optional[int] = 0
    tickets_resolved: Optional[int] = 0
    orders: Optional[int] = 0
    ops_cleaner_issues: Optional[str] = None
    ops_client_issues: Optional[str] = None


class CountryReportCreate(BaseModel):
    user_id: str
    week_start: date
    week_end: date
    city: str
    hired_people: Optional[int] = None
    orders: Optional[int] = None
    trengo_messages: Optional[int] = None
    crm_tickets: Optional[int] = None
    comments: Optional[str] = None


