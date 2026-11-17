"""
Entrypoint chính của Hệ thống RESTful API (FastAPI)
VN-LaborInsights — Hệ thống Phân tích và Đánh giá Nhu cầu Việc làm trên Thị trường Việt Nam
Đã gia cố Bảo mật (Security Headers, Safe CORS, Global Exception Shield).
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.database import engine, SessionLocal, Base, ACTIVE_DB_ENGINE
from app.seed_data import seed_database_if_empty
from app.services.ml_predictor import ml_engine
from app.routers import analytics, jobs, ai_tools, etl, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database_if_empty(db)
        ml_engine.fit_if_needed(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="VN-LaborInsights API — Hệ thống Phân tích & Đánh giá Nhu cầu Việc làm Việt Nam",
    description=(
        "RESTful API phân tích thị trường lao động Việt Nam. "
        "Tích hợp Thu thập dữ liệu đa nguồn, Chuẩn hóa kỹ năng ESCO, Dự báo lương và Hệ thống Trợ lý AI RAG."
    ),
    version="2.7.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.exception_handler(Exception)
async def global_exception_shield(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "status": "ERROR",
            "message": "Hệ thống đang xử lý yêu cầu, vui lòng thử lại sau giây lát.",
            "detail": str(exc)[:200]
        }
    )


app.include_router(analytics.router)
app.include_router(jobs.router)
app.include_router(ai_tools.router)
app.include_router(etl.router)
app.include_router(auth.router)


@app.get("/")
def root_health():
    return {
        "system": "VN-LaborInsights National Labor Market Observatory",
        "database_engine": ACTIVE_DB_ENGINE,
        "status": "ONLINE",
        "version": "2.7.0",
        "docs_url": "/docs"
    }
