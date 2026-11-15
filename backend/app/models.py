"""
SQLAlchemy ORM Models - Thiết kế Cơ sở dữ liệu Quan hệ (Chương 2.3 Đề cương)
Chuẩn hóa 3NF kết hợp Phân loại Kỹ năng Châu Âu (ESCO)
"""
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text, Date, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from .database import Base


class Industry(Base):
    __tablename__ = "industries"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(32), unique=True, nullable=False, index=True)
    name_vi = Column(String(150), nullable=False)
    name_en = Column(String(150), nullable=False)
    sector = Column(String(80), nullable=False)  # Kinh tế số, Tài nguyên & Môi trường Xanh, Tài chính, Sản xuất, Dịch vụ
    growth_rate_yoy = Column(Float, default=0.0)
    ai_exposure_score = Column(Float, default=0.0)  # Theo nghiên cứu của ILO tại Việt Nam (0-100)
    description = Column(Text, nullable=True)

    jobs = relationship("JobPosting", back_populates="industry")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    region = Column(String(80), nullable=False)
    economic_zone = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    avg_cost_of_living_index = Column(Float, default=1.0)
    industrial_parks_count = Column(Integer, default=5)

    jobs = relationship("JobPosting", back_populates="location")


class SkillESCO(Base):
    __tablename__ = "skills_esco"

    id = Column(Integer, primary_key=True, index=True)
    esco_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(120), nullable=False, index=True)
    name_vi = Column(String(150), nullable=False)
    category = Column(String(60), nullable=False)  # Digital & AI, Technical / Hard Skill, Green & ESG, Soft & Management
    subcategory = Column(String(80), nullable=True)
    demand_growth_yoy = Column(Float, default=0.0)
    salary_premium_pct = Column(Float, default=0.0)
    is_emerging = Column(Boolean, default=False)

    job_links = relationship("JobSkill", back_populates="skill")


class Company(Base):
    """
    Thực thể Doanh nghiệp Tuyển dụng độc lập nhằm đảm bảo chuẩn 3NF tuyệt đối
    (loại bỏ phụ thuộc hàm bắc cầu job_id -> company_name -> company_size).
    """
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(40), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False, index=True)
    normalized_name = Column(String(200), nullable=False, index=True)
    company_size = Column(String(60), default="100-499 nhân sự")
    industry_id = Column(Integer, ForeignKey("industries.id"), nullable=True)
    headquarter_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    esg_compliance_score = Column(Float, default=82.0)


class MarketMonthlySnapshot(Base):
    """
    Bảng tổng hợp sẵn (OLAP Snapshot) các chỉ số phân vị lương P25-P50-P75-P90 theo tháng,
    giúp Dashboard truy xuất tức thì mà không bị nghẽn cổ chai khi dữ liệu lớn.
    """
    __tablename__ = "market_monthly_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    month = Column(String(10), nullable=False, index=True)
    industry_code = Column(String(32), default="ALL", index=True)
    location_code = Column(String(20), default="ALL", index=True)
    job_count = Column(Integer, default=0)
    avg_salary_vnd = Column(Float, default=0.0)
    p25_salary_vnd = Column(Float, default=0.0)
    p50_salary_vnd = Column(Float, default=0.0)
    p75_salary_vnd = Column(Float, default=0.0)
    p90_salary_vnd = Column(Float, default=0.0)
    updated_at = Column(DateTime, default=datetime.utcnow)


class ChatSessionLog(Base):
    """
    Bảng lưu trữ lịch sử phiên trò chuyện và thực thể ngữ cảnh kế thừa (Multi-turn Memory)
    của Trợ lý AI Tư vấn Thị trường Lao động.
    """
    __tablename__ = "chat_session_logs"

    id = Column(Integer, primary_key=True, index=True)
    session_code = Column(String(64), nullable=False, index=True)
    user_question = Column(Text, nullable=False)
    ai_topic = Column(String(200), nullable=True)
    detected_entities_json = Column(Text, nullable=True)
    ai_mode = Column(String(80), default="Local Expert Engine")
    created_at = Column(DateTime, default=datetime.utcnow)



class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(Integer, primary_key=True, index=True)
    job_code = Column(String(40), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    normalized_title = Column(String(150), nullable=False, index=True)
    company_name = Column(String(200), nullable=False)
    company_size = Column(String(60), default="100-499 nhân sự")
    industry_id = Column(Integer, ForeignKey("industries.id"), index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), index=True)
    experience_level = Column(String(50), nullable=False, index=True)
    years_of_experience = Column(Float, default=1.0)
    education_level = Column(String(60), default="Đại học")
    work_mode = Column(String(40), default="On-site")
    salary_min_vnd = Column(Float, nullable=False)  # Triệu VNĐ / tháng
    salary_max_vnd = Column(Float, nullable=False)
    salary_avg_vnd = Column(Float, nullable=False, index=True)
    currency = Column(String(10), default="VND")
    source_platform = Column(String(60), nullable=False, index=True)
    source_url = Column(String(500), nullable=True)
    posted_date = Column(Date, default=date.today, index=True)
    posted_month = Column(String(7), nullable=False, index=True)  # YYYY-MM
    description_raw = Column(Text, nullable=True)
    data_quality_score = Column(Float, default=0.95)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    industry = relationship("Industry", back_populates="jobs")
    location = relationship("Location", back_populates="jobs")
    skill_links = relationship("JobSkill", back_populates="job", cascade="all, delete-orphan")


class JobSkill(Base):
    __tablename__ = "job_skills"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("job_postings.id", ondelete="CASCADE"), index=True)
    skill_id = Column(Integer, ForeignKey("skills_esco.id", ondelete="CASCADE"), index=True)
    importance_weight = Column(Float, default=1.0)
    is_mandatory = Column(Boolean, default=True)

    job = relationship("JobPosting", back_populates="skill_links")
    skill = relationship("SkillESCO", back_populates="job_links")


class ETLPipelineRun(Base):
    __tablename__ = "etl_pipeline_runs"

    id = Column(Integer, primary_key=True, index=True)
    run_code = Column(String(40), unique=True, nullable=False)
    source_platform = Column(String(80), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
    status = Column(String(30), default="SUCCESS")
    records_crawled = Column(Integer, default=0)
    records_duplicated = Column(Integer, default=0)
    records_cleaned = Column(Integer, default=0)
    skills_extracted = Column(Integer, default=0)
    avg_processing_ms = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)

