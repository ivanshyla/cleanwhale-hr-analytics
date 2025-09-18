from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import date

from .db import Base, engine, get_db
from .models import WeeklyReport, CountryReport
from .schemas import WeeklyReportCreate, CountryReportCreate


app = FastAPI(title="HR/Operations Reports")

# CORS for local frontend (Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # Создаем таблицы, если их нет (работает только в схемах public)
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/weekly_reports")
def create_report(payload: WeeklyReportCreate, db: Session = Depends(get_db)):
    report = WeeklyReport(**payload.model_dump())
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@app.get("/weekly_reports")
def list_reports(limit: int = 50, db: Session = Depends(get_db)):
    """Возвращает последние отчёты (по умолчанию 50)."""
    q = db.query(WeeklyReport).order_by(WeeklyReport.id.desc()).limit(limit)
    return [
        {
            "id": r.id,
            "week_start": r.week_start,
            "week_end": r.week_end,
            "interviews": r.interviews,
            "ads_posted": r.ads_posted,
            "registrations": r.registrations,
            "full_days": r.full_days,
            "hiring_issues": r.hiring_issues,
            "stress_level": r.stress_level,
            "overtime": r.overtime,
            "messages": r.messages,
            "tickets_resolved": r.tickets_resolved,
            "orders": r.orders,
            "created_at": r.created_at,
        }
        for r in q.all()
    ]


@app.post("/country_reports")
def create_country_report(payload: CountryReportCreate, db: Session = Depends(get_db)):
    cr = CountryReport(**payload.model_dump())
    db.add(cr)
    db.commit()
    db.refresh(cr)
    return cr


@app.get("/summary")
def summary(db: Session = Depends(get_db)):
    """Простая сводка по неделе: суммы по основным полям."""
    # Для простоты — агрегируем всю таблицу
    rows = db.query(WeeklyReport).all()
    result = {
        "count": len(rows),
        "interviews": sum((r.interviews or 0) for r in rows),
        "registrations": sum((r.registrations or 0) for r in rows),
        "messages": sum((r.messages or 0) for r in rows),
        "tickets_resolved": sum((r.tickets_resolved or 0) for r in rows),
        "orders": sum((r.orders or 0) for r in rows),
        "avg_stress": round((sum((r.stress_level or 0) for r in rows) / len(rows)), 2) if rows else 0,
    }
    return result


@app.get("/export")
def export_csv(db: Session = Depends(get_db)):
    """Экспорт weekly_reports в CSV (строки в ответе)."""
    import csv
    import io

    rows = db.query(WeeklyReport).order_by(WeeklyReport.id.desc()).all()
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "id", "week_start", "week_end", "interviews", "ads_posted", "registrations",
        "full_days", "stress_level", "overtime", "messages", "tickets_resolved", "orders",
        "hiring_issues", "created_at",
    ])
    for r in rows:
        writer.writerow([
            r.id, r.week_start, r.week_end, r.interviews, r.ads_posted, r.registrations,
            r.full_days, r.stress_level, r.overtime, r.messages, r.tickets_resolved, r.orders,
            r.hiring_issues, r.created_at,
        ])
    return buf.getvalue()


