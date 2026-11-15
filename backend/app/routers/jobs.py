"""
Router Tra cứu, Tìm kiếm & Khai thác Dữ liệu Tin tuyển dụng (/api/v1/jobs)
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import JobPosting, Industry, Location, SkillESCO, JobSkill

router = APIRouter(prefix="/api/v1/jobs", tags=["Job Postings Explorer"])


@router.get("")
def search_jobs(
    q: Optional[str] = Query(None, description="Từ khóa chức danh, công ty hoặc kỹ năng"),
    industry_code: Optional[str] = Query(None),
    location_code: Optional[str] = Query(None),
    experience_level: Optional[str] = Query(None),
    work_mode: Optional[str] = Query(None),
    skill_name: Optional[str] = Query(None),
    min_salary: Optional[float] = Query(None),
    sort_by: str = Query("newest", description="newest, salary_desc, salary_asc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=5, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(JobPosting)

    if q and q.strip():
        cleaned_q = q.strip().replace("%", "").replace("_", "").strip()
        if cleaned_q:
            kw = f"%{cleaned_q}%"
            query = query.filter(
                or_(
                    JobPosting.title.ilike(kw),
                    JobPosting.normalized_title.ilike(kw),
                    JobPosting.company_name.ilike(kw),
                    JobPosting.description_raw.ilike(kw)
                )
            )

    if industry_code and industry_code != "ALL":
        ind = db.query(Industry).filter(Industry.code == industry_code).first()
        if ind:
            query = query.filter(JobPosting.industry_id == ind.id)

    if location_code and location_code != "ALL":
        loc = db.query(Location).filter(Location.code == location_code).first()
        if loc:
            query = query.filter(JobPosting.location_id == loc.id)

    if experience_level and experience_level != "ALL":
        query = query.filter(JobPosting.experience_level == experience_level)

    if work_mode and work_mode != "ALL":
        query = query.filter(JobPosting.work_mode == work_mode)

    if min_salary is not None and min_salary > 0:
        query = query.filter(JobPosting.salary_max_vnd >= min_salary)

    if skill_name and skill_name != "ALL":
        sk = db.query(SkillESCO).filter(SkillESCO.name == skill_name).first()
        if sk:
            query = query.join(JobSkill, JobSkill.job_id == JobPosting.id).filter(JobSkill.skill_id == sk.id)

    total = query.count()

    if sort_by == "salary_desc":
        query = query.order_by(JobPosting.salary_avg_vnd.desc())
    elif sort_by == "salary_asc":
        query = query.order_by(JobPosting.salary_avg_vnd.asc())
    else:
        query = query.order_by(JobPosting.posted_date.desc(), JobPosting.id.desc())

    items = (
        query.options(joinedload(JobPosting.skill_links))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    industries_map = {i.id: i for i in db.query(Industry).all()}
    locations_map = {l.id: l for l in db.query(Location).all()}
    skills_map = {s.id: s for s in db.query(SkillESCO).all()}

    results = []
    for job in items:
        ind_obj = industries_map.get(job.industry_id)
        loc_obj = locations_map.get(job.location_id)
        job_skills_list = []
        for link in job.skill_links:
            sk_obj = skills_map.get(link.skill_id)
            if sk_obj:
                job_skills_list.append({
                    "esco_code": sk_obj.esco_code,
                    "name": sk_obj.name,
                    "name_vi": sk_obj.name_vi,
                    "category": sk_obj.category
                })

        results.append({
            "id": job.id,
            "job_code": job.job_code,
            "title": job.title,
            "normalized_title": job.normalized_title,
            "company_name": job.company_name,
            "company_size": job.company_size,
            "industry_name": ind_obj.name_vi if ind_obj else "Công nghệ Thông tin",
            "industry_code": ind_obj.code if ind_obj else "IND-IT",
            "location_name": loc_obj.name if loc_obj else "TP. Hồ Chí Minh",
            "location_code": loc_obj.code if loc_obj else "VN-SG",
            "experience_level": job.experience_level,
            "years_of_experience": job.years_of_experience,
            "work_mode": job.work_mode,
            "salary_min_vnd": job.salary_min_vnd,
            "salary_max_vnd": job.salary_max_vnd,
            "salary_avg_vnd": job.salary_avg_vnd,
            "source_platform": job.source_platform,
            "posted_date": str(job.posted_date),
            "posted_month": job.posted_month,
            "data_quality_score": job.data_quality_score,
            "description_raw": job.description_raw,
            "skills": job_skills_list
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
        "items": results
    }

