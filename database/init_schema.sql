-- ============================================================================
-- ĐỒ ÁN CHUYÊN NGÀNH: XÂY DỰNG HỆ THỐNG PHÂN TÍCH VÀ ĐÁNH GIÁ NHU CẦU VIỆC LÀM
-- TRÊN THỊ TRƯỜNG VIỆT NAM
-- Sinh viên thực hiện: Huỳnh Quốc Huy - MSSV: 1250080069 - Lớp: 12_ĐH_THMT
-- Giảng viên hướng dẫn: ThS. Đinh Thị Hồng Loan
-- Hệ quản trị CSDL: PostgreSQL 16 (Chuẩn hóa 3NF + Tham chiếu khung kỹ năng ESCO)
-- ============================================================================

CREATE TABLE IF NOT EXISTS industries (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    name_vi VARCHAR(150) NOT NULL,
    name_en VARCHAR(150) NOT NULL,
    sector VARCHAR(80) NOT NULL, -- Digital Economy, Green & Environment, Finance, Manufacturing, Services
    growth_rate_yoy FLOAT DEFAULT 0.0,
    ai_exposure_score FLOAT DEFAULT 0.0, -- Theo báo cáo ILO về mức độ ảnh hưởng GenAI
    description TEXT
);

CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    region VARCHAR(60) NOT NULL, -- Đông Nam Bộ, Đồng bằng Sông Hồng, Bắc Trung Bộ & Duyên hải miền Trung, ĐBSCL...
    economic_zone VARCHAR(80),
    latitude FLOAT,
    longitude FLOAT,
    avg_cost_of_living_index FLOAT DEFAULT 1.0
);

CREATE TABLE IF NOT EXISTS skills_esco (
    id SERIAL PRIMARY KEY,
    esco_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    name_vi VARCHAR(150) NOT NULL,
    category VARCHAR(60) NOT NULL, -- Digital & AI, Technical / Hard Skill, Green & ESG, Management & Soft Skill
    subcategory VARCHAR(80),
    demand_growth_yoy FLOAT DEFAULT 0.0,
    salary_premium_pct FLOAT DEFAULT 0.0,
    is_emerging BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS job_postings (
    id SERIAL PRIMARY KEY,
    job_code VARCHAR(40) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    normalized_title VARCHAR(150) NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    company_size VARCHAR(60) DEFAULT '100-499 nhân sự',
    industry_id INTEGER REFERENCES industries(id) ON DELETE SET NULL,
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    experience_level VARCHAR(50) NOT NULL, -- Intern/Fresher, Junior (1-2 năm), Mid-level (2-4 năm), Senior (5+ năm), Lead/Manager
    years_of_experience FLOAT DEFAULT 1.0,
    education_level VARCHAR(60) DEFAULT 'Đại học',
    work_mode VARCHAR(40) DEFAULT 'On-site', -- On-site, Hybrid, Remote
    salary_min_vnd FLOAT NOT NULL, -- Đơn vị: Triệu VNĐ / tháng
    salary_max_vnd FLOAT NOT NULL,
    salary_avg_vnd FLOAT NOT NULL,
    currency VARCHAR(10) DEFAULT 'VND',
    source_platform VARCHAR(60) NOT NULL, -- TopCV, VietnamWorks, JobsGO, ITviec, CareerViet
    source_url VARCHAR(500),
    posted_date DATE NOT NULL,
    posted_month VARCHAR(7) NOT NULL, -- YYYY-MM
    description_raw TEXT,
    data_quality_score FLOAT DEFAULT 0.95,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_skills (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES job_postings(id) ON DELETE CASCADE,
    skill_id INTEGER REFERENCES skills_esco(id) ON DELETE CASCADE,
    importance_weight FLOAT DEFAULT 1.0,
    is_mandatory BOOLEAN DEFAULT TRUE,
    UNIQUE(job_id, skill_id)
);

CREATE TABLE IF NOT EXISTS etl_pipeline_runs (
    id SERIAL PRIMARY KEY,
    run_code VARCHAR(40) UNIQUE NOT NULL,
    source_platform VARCHAR(80) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    finished_at TIMESTAMP,
    status VARCHAR(30) NOT NULL, -- SUCCESS, RUNNING, WARNING
    records_crawled INTEGER DEFAULT 0,
    records_duplicated INTEGER DEFAULT 0,
    records_cleaned INTEGER DEFAULT 0,
    skills_extracted INTEGER DEFAULT 0,
    avg_processing_ms FLOAT DEFAULT 0.0,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_industry ON job_postings(industry_id);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON job_postings(location_id);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_month ON job_postings(posted_month);
CREATE INDEX IF NOT EXISTS idx_jobs_normalized_title ON job_postings(normalized_title);
CREATE INDEX IF NOT EXISTS idx_job_skills_job ON job_skills(job_id);
CREATE INDEX IF NOT EXISTS idx_job_skills_skill ON job_skills(skill_id);

