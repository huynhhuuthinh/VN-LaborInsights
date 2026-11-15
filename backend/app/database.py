"""
Module kết nối Cơ sở dữ liệu (Hỗ trợ PostgreSQL & tự động fallback sang SQLite)
Hệ thống Phân tích và Đánh giá Nhu cầu Việc làm trên Thị trường Việt Nam (VN-LaborInsights)
"""
import os
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

BASE_DIR = Path(__file__).resolve().parent.parent
SQLITE_DB_PATH = BASE_DIR / "vn_labor_market.db"

POSTGRES_DEFAULT_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:labor_password_2026@localhost:5432/vn_labor_market_db"
)

ACTIVE_DB_ENGINE = "SQLite3 / PostgreSQL-Compatible ORM"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{SQLITE_DB_PATH}"

if os.getenv("USE_POSTGRES", "false").lower() in ("true", "1"):
    try:
        test_engine = create_engine(POSTGRES_DEFAULT_URL, connect_args={"connect_timeout": 2})
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        SQLALCHEMY_DATABASE_URL = POSTGRES_DEFAULT_URL
        ACTIVE_DB_ENGINE = "PostgreSQL 16 (Relational DB)"
    except Exception:
        SQLALCHEMY_DATABASE_URL = f"sqlite:///{SQLITE_DB_PATH}"
        ACTIVE_DB_ENGINE = "SQLite3 / PostgreSQL-Compatible ORM"

connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args,
    future=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
