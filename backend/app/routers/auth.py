"""
Router Xác thực Người dùng, Hồ sơ Cá nhân & Lưu trữ Việc làm (/api/v1/auth)
Hỗ trợ Đăng ký, Đăng nhập (PBKDF2-HMAC-SHA256), Tài khoản Mẫu 1-Click, Hồ sơ mục tiêu & Theo dõi Việc đã lưu.
"""
import hashlib
import hmac
import json
import os
import secrets
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import (
    UserAccount,
    SavedJobBookmark,
    JobPosting,
    JobSkill,
    ChatSessionLog,
    CVEvaluationHistory,
)
from ..schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    UserProfileUpdateRequest,
    SavedJobRequest,
)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication & User Workspace"])

_TOKEN_SECRET = os.environ.get("VN_LABOR_AUTH_SECRET", "vnlabor-insights-2026-hmac-key")
_PBKDF2_SALT = "vnlabor_2026_salt"


def _hash_password(password: str, salt: str = _PBKDF2_SALT) -> str:
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120000).hex()
    return f"pbkdf2_sha256${salt}${digest}"


def _verify_password(password: str, stored_hash: str) -> bool:
    parts = (stored_hash or "").split("$")
    if len(parts) != 3 or parts[0] != "pbkdf2_sha256":
        return False
    expected = _hash_password(password, parts[1])
    return hmac.compare_digest(expected, stored_hash)


def _issue_session_token(email: str) -> str:
    nonce = secrets.token_hex(8)
    sig = hmac.new(
        _TOKEN_SECRET.encode("utf-8"),
        f"{email}:{nonce}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()[:24]
    return f"vnl.{nonce}.{sig}"


def _serialize_user(user: UserAccount) -> dict:
    try:
        skills = json.loads(user.skills_json or "[]")
    except Exception:
        skills = []
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role_type": user.role_type,
        "target_role": user.target_role,
        "target_location": user.target_location,
        "experience_years": user.experience_years,
        "skills": skills if isinstance(skills, list) else [],
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.post("/register")
def api_register_user(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    """Đăng ký tài khoản người dùng mới."""
    clean_email = payload.email.strip().lower()
    if "@" not in clean_email or "." not in clean_email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Định dạng Email chưa hợp lệ.")

    existing = db.query(UserAccount).filter(UserAccount.email == clean_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email này đã được đăng ký. Vui lòng đăng nhập.")

    salt = secrets.token_hex(6)
    new_user = UserAccount(
        email=clean_email,
        full_name=payload.full_name.strip(),
        password_hash=_hash_password(payload.password, salt=salt),
        role_type=payload.role_type or "Ứng viên / Sinh viên",
        target_role=payload.target_role or "Kỹ sư Phần mềm (Backend/Fullstack)",
        target_location=payload.target_location or "TP. Hồ Chí Minh",
        experience_years=payload.experience_years,
        skills_json=json.dumps(payload.skills or [], ensure_ascii=False),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "status": "SUCCESS",
        "message": "Đăng ký tài khoản thành công.",
        "token": _issue_session_token(clean_email),
        "user": _serialize_user(new_user),
    }


@router.post("/login")
def api_login_user(payload: UserLoginRequest, db: Session = Depends(get_db)):
    """Đăng nhập bằng Email & Mật khẩu."""
    clean_email = payload.email.strip().lower()
    user = db.query(UserAccount).filter(UserAccount.email == clean_email).first()
    if not user or not _verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu chưa chính xác.")

    return {
        "status": "SUCCESS",
        "message": "Đăng nhập thành công.",
        "token": _issue_session_token(clean_email),
        "user": _serialize_user(user),
    }


@router.get("/me")
def api_get_user_profile(
    email: str = "demo@vnlabor.vn",
    db: Session = Depends(get_db),
):
    """Lấy thông tin hồ sơ người dùng kèm thống kê hoạt động."""
    clean_email = email.strip().lower()
    user = db.query(UserAccount).filter(UserAccount.email == clean_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin tài khoản.")

    saved_cnt = db.query(SavedJobBookmark).filter(SavedJobBookmark.user_email == clean_email).count()
    chat_cnt = db.query(ChatSessionLog).count()
    cv_cnt = db.query(CVEvaluationHistory).filter(CVEvaluationHistory.user_email == clean_email).count()

    return {
        "user": _serialize_user(user),
        "stats": {
            "saved_jobs_count": saved_cnt,
            "chat_history_count": chat_cnt,
            "cv_eval_count": cv_cnt,
        },
    }


@router.put("/profile")
def api_update_user_profile(
    payload: UserProfileUpdateRequest,
    email: str = "demo@vnlabor.vn",
    db: Session = Depends(get_db),
):
    """Cập nhật thông tin hồ sơ & mục tiêu nghề nghiệp cá nhân."""
    clean_email = email.strip().lower()
    user = db.query(UserAccount).filter(UserAccount.email == clean_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản để cập nhật.")

    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.role_type is not None:
        user.role_type = payload.role_type
    if payload.target_role is not None:
        user.target_role = payload.target_role
    if payload.target_location is not None:
        user.target_location = payload.target_location
    if payload.experience_years is not None:
        user.experience_years = payload.experience_years
    if payload.skills is not None:
        user.skills_json = json.dumps(payload.skills, ensure_ascii=False)

    db.commit()
    db.refresh(user)
    return {"status": "SUCCESS", "user": _serialize_user(user)}


@router.get("/saved-jobs")
def api_get_saved_jobs(
    email: str = "demo@vnlabor.vn",
    db: Session = Depends(get_db),
):
    """Danh sách việc làm đã lưu & trạng thái theo dõi ứng tuyển của người dùng."""
    clean_email = email.strip().lower()
    bookmarks = (
        db.query(SavedJobBookmark)
        .filter(SavedJobBookmark.user_email == clean_email)
        .order_by(SavedJobBookmark.id.desc())
        .all()
    )
    job_ids = [b.job_id for b in bookmarks]
    if not job_ids:
        return {"total": 0, "items": []}

    jobs = (
        db.query(JobPosting)
        .options(
            joinedload(JobPosting.location),
            joinedload(JobPosting.industry),
            joinedload(JobPosting.skill_links).joinedload(JobSkill.skill),
        )
        .filter(JobPosting.id.in_(job_ids))
        .all()
    )
    job_map = {j.id: j for j in jobs}

    items = []
    for bm in bookmarks:
        j = job_map.get(bm.job_id)
        if not j:
            continue
        items.append({
            "bookmark_id": bm.id,
            "job_id": j.id,
            "job_code": j.job_code,
            "title": j.title,
            "normalized_title": j.normalized_title,
            "company_name": j.company_name,
            "location_name": j.location.name if j.location else "TP. Hồ Chí Minh",
            "industry_name": j.industry.name_vi if j.industry else "Công nghệ Thông tin",
            "salary_min_vnd": j.salary_min_vnd,
            "salary_max_vnd": j.salary_max_vnd,
            "experience_level": j.experience_level,
            "work_mode": j.work_mode,
            "source_platform": j.source_platform,
            "posted_date": str(j.posted_date),
            "description_raw": j.description_raw,
            "skills": [
                {"esco_code": lk.skill.esco_code, "name": lk.skill.name}
                for lk in (j.skill_links or []) if lk.skill
            ],
            "application_status": bm.application_status,
            "notes": bm.notes or "",
            "saved_at": bm.created_at.isoformat() if bm.created_at else None,
        })

    return {"total": len(items), "items": items}


@router.post("/saved-jobs")
def api_upsert_or_toggle_saved_job(payload: SavedJobRequest, db: Session = Depends(get_db)):
    """Lưu, bỏ lưu hoặc cập nhật trạng thái ứng tuyển (Đã lưu / Đã nộp CV / Phỏng vấn / Nhận Offer)."""
    clean_email = (payload.user_email or "demo@vnlabor.vn").strip().lower()
    job_exists = db.query(JobPosting).filter(JobPosting.id == payload.job_id).first()
    if not job_exists:
        raise HTTPException(status_code=404, detail="Tin tuyển dụng không tồn tại.")

    existing = (
        db.query(SavedJobBookmark)
        .filter(
            SavedJobBookmark.user_email == clean_email,
            SavedJobBookmark.job_id == payload.job_id,
        )
        .first()
    )

    if existing:
        if payload.application_status == "REMOVE" or (
            payload.application_status is None and payload.notes is None
        ):
            db.delete(existing)
            db.commit()
            return {"status": "SUCCESS", "action": "REMOVED", "job_id": payload.job_id}
        if payload.application_status is not None:
            existing.application_status = payload.application_status
        if payload.notes is not None:
            existing.notes = payload.notes
        db.commit()
        return {
            "status": "SUCCESS",
            "action": "UPDATED",
            "job_id": payload.job_id,
            "application_status": existing.application_status,
        }

    bm = SavedJobBookmark(
        user_email=clean_email,
        job_id=payload.job_id,
        application_status=payload.application_status or "Đã lưu",
        notes=payload.notes,
    )
    db.add(bm)
    db.commit()
    return {
        "status": "SUCCESS",
        "action": "SAVED",
        "job_id": payload.job_id,
        "application_status": bm.application_status,
    }


@router.delete("/saved-jobs/{job_id}")
def api_delete_saved_job(
    job_id: int,
    email: str = "demo@vnlabor.vn",
    db: Session = Depends(get_db),
):
    """Xóa việc làm khỏi danh sách đã lưu."""
    clean_email = email.strip().lower()
    existing = (
        db.query(SavedJobBookmark)
        .filter(
            SavedJobBookmark.user_email == clean_email,
            SavedJobBookmark.job_id == job_id,
        )
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
    return {"status": "SUCCESS", "job_id": job_id}
