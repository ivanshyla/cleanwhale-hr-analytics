import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv


# 1) Загружаем переменные окружения
# - Сначала из backend/.env (если есть)
# - Затем из hr-analytics-dashboard/.env.local (если запускаем из корня)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"), override=False)

# Пытаемся дополнительно загрузить .env.local из фронта
front_env = os.path.join(os.path.dirname(__file__), "..", "hr-analytics-dashboard", ".env.local")
if os.path.exists(front_env):
    load_dotenv(dotenv_path=front_env, override=False)


DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set. Please add it to backend/.env or hr-analytics-dashboard/.env.local")


# 2) Создаем engine и фабрику сессий
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# 3) Базовый класс моделей
Base = declarative_base()


def get_db():
    """Dependency: отдает SQLAlchemy Session и корректно закрывает ее."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


