from sqlalchemy import Column, Integer, String, Text, Boolean, Numeric, Date, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid
from .db import Base

class Profile(Base):
    __tablename__ = "profiles"
    
    user_id = Column(String, primary_key=True)  # UUID from Supabase auth
    full_name = Column(Text, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(Text)  # Hash stored in auth, this is auxiliary field
    city = Column(Text, nullable=False)
    role = Column(Text, CheckConstraint("role IN ('hiring','operations','mixed','country_manager')"))
    salary = Column(Numeric)
    schedule = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    weekly_reports = relationship("WeeklyReport", back_populates="profile")
    country_reports = relationship("CountryReport", back_populates="profile")

class WeeklyReport(Base):
    __tablename__ = "weekly_reports"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("profiles.user_id"), nullable=False)
    week_start = Column(Date, nullable=False)
    week_end = Column(Date, nullable=False)
    
    # Hiring fields
    interviews = Column(Integer)
    ads_posted = Column(Integer)
    registrations = Column(Integer)
    full_days = Column(Integer)
    hiring_issues = Column(Text)
    stress_level = Column(Integer)
    overtime = Column(Boolean)
    
    # Operations fields
    messages = Column(Integer)
    tickets_resolved = Column(Integer)
    orders = Column(Integer)
    ops_cleaner_issues = Column(Text)
    ops_client_issues = Column(Text)
    
    # Meta
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    profile = relationship("Profile", back_populates="weekly_reports")

class CountryReport(Base):
    __tablename__ = "country_reports"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("profiles.user_id"), nullable=False)
    week_start = Column(Date, nullable=False)
    week_end = Column(Date, nullable=False)
    city = Column(Text, nullable=False)
    hired_people = Column(Integer)
    orders = Column(Integer)
    trengo_messages = Column(Integer)
    crm_tickets = Column(Integer)
    comments = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    profile = relationship("Profile", back_populates="country_reports")

