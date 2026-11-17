"""
Router Công cụ Trí tuệ Nhân tạo, Xử lý Ngôn ngữ Tự nhiên Tiếng Việt & Học máy (/api/v1/ai)
"""
import base64
import json
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ChatSessionLog, CVEvaluationHistory, UserAccount
from ..schemas import (
    JDAnalyzeRequest,
    CVFileParseRequest,
    SalaryPredictRequest,
    SkillGapRequest,
    AIChatRequest,
    CurriculumAuditRequest,
)
from ..services.nlp_extractor import analyze_vietnamese_jd, audit_university_curriculum
from ..services.ml_predictor import ml_engine
from ..services.ai_assistant import answer_labor_market_question, evaluate_candidate_profile
from ..services.cv_parser import parse_uploaded_cv_file

router = APIRouter(prefix="/api/v1/ai", tags=["AI, Vietnamese NLP & Machine Learning"])


@router.post("/analyze-jd")
def api_analyze_jd(payload: JDAnalyzeRequest):
    """
    Bóc tách tự động thông tin từ văn bản mô tả công việc (JD) tiếng Việt bằng NLP
    """
    return analyze_vietnamese_jd(
        raw_text=payload.raw_text,
        title_hint=payload.title or "",
        location_hint=payload.location_hint or "TP. Hồ Chí Minh"
    )


@router.post("/predict-salary")
def api_predict_salary(payload: SalaryPredictRequest, db: Session = Depends(get_db)):
    """
    Dự báo mức lương công bằng bằng mô hình RandomForestRegressor (Scikit-learn)
    """
    return ml_engine.predict_salary(
        db=db,
        normalized_title=payload.normalized_title,
        industry_code=payload.industry_code,
        location_code=payload.location_code,
        years_of_experience=payload.years_of_experience,
        work_mode=payload.work_mode,
        skill_names=payload.skill_names
    )


@router.post("/skill-gap")
def api_skill_gap(payload: SkillGapRequest, db: Session = Depends(get_db)):
    """
    Phân tích khoảng cách kỹ năng (Skill Gap Analysis) theo chuẩn ESCO và gợi ý lộ trình học tập
    """
    return ml_engine.analyze_skill_gap(
        db=db,
        target_role=payload.target_role,
        current_skills=payload.current_skills,
        experience_years=payload.experience_years,
        target_location=payload.target_location
    )


def _save_cv_history_if_distinct(
    db: Session,
    user_email: Optional[str],
    filename: str,
    eval_res: dict,
    target_location: str,
    resume_text: str,
):
    clean_email = (user_email or "demo@vnlabor.vn").strip().lower()
    total_score = int(eval_res.get("profile_score", 0))
    verdict = str(eval_res.get("verdict_label", ""))[:195]
    detected_role = str(eval_res.get("recommended_role") or eval_res.get("inferred_role") or "Ứng viên Công nghệ")[:175]
    sal_range = str((eval_res.get("salary_valuation") or {}).get("recommended_negotiation_range", ""))[:115]
    excerpt = " ".join((resume_text or "").split())[:220]

    latest = (
        db.query(CVEvaluationHistory)
        .filter(CVEvaluationHistory.user_email == clean_email)
        .order_by(CVEvaluationHistory.id.desc())
        .first()
    )
    if (
        latest
        and latest.total_score == total_score
        and latest.filename == filename
        and (latest.resume_excerpt or "")[:80] == excerpt[:80]
    ):
        return latest

    rec = CVEvaluationHistory(
        user_email=clean_email,
        filename=filename or "CV_Dan_Truc_Tiep.txt",
        target_role=detected_role,
        target_location=target_location or "TP. Hồ Chí Minh",
        total_score=total_score,
        verdict_label=verdict,
        recommended_salary_range=sal_range,
        resume_excerpt=excerpt,
    )
    db.add(rec)
    db.commit()
    return rec


@router.post("/chat")
def api_ai_economist_chat(payload: AIChatRequest, db: Session = Depends(get_db)):
    """
    Trợ lý AI Phân tích Kinh tế Lao động trả lời dựa trên số liệu thực tế trong CSDL,
    tích hợp bộ nhớ ngữ cảnh hội thoại nhiều lượt (Multi-turn Memory), lưu lịch sử DB và chế độ Hybrid RAG.
    """
    res = answer_labor_market_question(
        db=db,
        question=payload.question,
        history=payload.history or [],
        gemini_api_key=payload.gemini_api_key
    )
    try:
        user_id = None
        if payload.user_email:
            u = db.query(UserAccount).filter(UserAccount.email == payload.user_email.strip().lower()).first()
            if u:
                user_id = u.id
        log_entry = ChatSessionLog(
            user_id=user_id,
            session_code=(payload.session_code or "default-session")[:64],
            user_question=payload.question.strip(),
            ai_answer=res.get("answer_text", ""),
            ai_topic=str(res.get("topic", ""))[:195],
            detected_entities_json=json.dumps(res.get("detected_entities", {}), ensure_ascii=False),
            follow_ups_json=json.dumps(res.get("follow_up_suggestions", []), ensure_ascii=False),
            ai_mode=str(res.get("ai_mode", "Local Expert Engine"))[:75],
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        res["log_id"] = log_entry.id
    except Exception:
        db.rollback()
    return res


@router.get("/chat-history")
def api_get_ai_chat_history(
    session_code: Optional[str] = None,
    limit: int = 30,
    db: Session = Depends(get_db),
):
    """Truy xuất lịch sử trò chuyện cùng Cố vấn AI để xem lại hoặc tiếp tục hội thoại."""
    q = db.query(ChatSessionLog)
    if session_code:
        q = q.filter(ChatSessionLog.session_code == session_code)
    logs = q.order_by(ChatSessionLog.id.desc()).limit(limit).all()

    items = []
    for lg in logs:
        try:
            fups = json.loads(lg.follow_ups_json or "[]")
        except Exception:
            fups = []
        items.append({
            "id": lg.id,
            "session_code": lg.session_code,
            "user_question": lg.user_question,
            "ai_answer": lg.ai_answer or "",
            "ai_topic": lg.ai_topic or "",
            "ai_mode": lg.ai_mode or "Hệ thống Phân tích Chuyên gia Nội bộ",
            "follow_ups": fups if isinstance(fups, list) else [],
            "created_at": lg.created_at.isoformat() if lg.created_at else None,
        })
    return {"total": len(items), "items": items}


@router.delete("/chat-history/{log_id}")
def api_delete_chat_history_item(log_id: int, db: Session = Depends(get_db)):
    """Xóa một bản ghi lịch sử trò chuyện AI."""
    item = db.query(ChatSessionLog).filter(ChatSessionLog.id == log_id).first()
    if item:
        db.delete(item)
        db.commit()
    return {"status": "SUCCESS", "deleted_id": log_id}


@router.delete("/chat-history")
def api_clear_chat_history(db: Session = Depends(get_db)):
    """Xóa toàn bộ lịch sử trò chuyện AI."""
    deleted = db.query(ChatSessionLog).delete()
    db.commit()
    return {"status": "SUCCESS", "deleted_count": deleted}


@router.post("/evaluate-profile")
def api_evaluate_candidate_profile(payload: JDAnalyzeRequest, db: Session = Depends(get_db)):
    """
    Chấm điểm mức độ sẵn sàng của Hồ sơ năng lực / CV ứng viên theo quy trình ATS & HR 4 trụ cột
    và định giá khung lương đàm phán.
    """
    res = evaluate_candidate_profile(
        db=db,
        resume_text=payload.raw_text,
        target_location=payload.location_hint or "TP. Hồ Chí Minh",
        target_role=payload.target_role,
    )
    try:
        _save_cv_history_if_distinct(
            db=db,
            user_email=payload.user_email,
            filename=payload.filename or "CV_Van_Ban_Truc_Tiep.txt",
            eval_res=res,
            target_location=payload.location_hint or "TP. Hồ Chí Minh",
            resume_text=payload.raw_text,
        )
    except Exception:
        db.rollback()
    return res


@router.post("/parse-cv-file")
def api_parse_and_evaluate_cv_file(payload: CVFileParseRequest, db: Session = Depends(get_db)):
    """
    Tự động đọc file CV tải lên (.pdf, .docx, .txt, .md) qua Base64, trích xuất văn bản
    và thực hiện đánh giá hồ sơ chuyên nghiệp theo chuẩn ATS & HR.
    """
    raw_b64 = payload.file_base64.strip()
    if "," in raw_b64 and raw_b64.startswith("data:"):
        raw_b64 = raw_b64.split(",", 1)[1]
    file_bytes = base64.b64decode(raw_b64)
    parsed_doc = parse_uploaded_cv_file(payload.filename, file_bytes)
    text_for_eval = parsed_doc["extracted_text"]
    if len(text_for_eval.strip()) < 10:
        text_for_eval = f"Hồ sơ ứng viên từ tệp {payload.filename}. Cần bổ sung văn bản mô tả kinh nghiệm và kỹ năng."

    eval_res = evaluate_candidate_profile(
        db=db,
        resume_text=text_for_eval,
        target_location=payload.location_hint or "TP. Hồ Chí Minh",
        target_role=payload.target_role,
    )
    try:
        _save_cv_history_if_distinct(
            db=db,
            user_email=payload.user_email,
            filename=payload.filename,
            eval_res=eval_res,
            target_location=payload.location_hint or "TP. Hồ Chí Minh",
            resume_text=text_for_eval,
        )
    except Exception:
        db.rollback()
    return {
        "file_parse_result": parsed_doc,
        "evaluation": eval_res,
    }


@router.get("/cv-history")
def api_get_cv_history(
    email: Optional[str] = "demo@vnlabor.vn",
    limit: int = 15,
    db: Session = Depends(get_db),
):
    """Lấy lịch sử các lần chấm điểm CV ATS 4 trụ cột để theo dõi tiến độ cải thiện hồ sơ."""
    clean_email = (email or "demo@vnlabor.vn").strip().lower()
    rows = (
        db.query(CVEvaluationHistory)
        .filter(CVEvaluationHistory.user_email == clean_email)
        .order_by(CVEvaluationHistory.id.desc())
        .limit(limit)
        .all()
    )
    return {
        "total": len(rows),
        "items": [
            {
                "id": r.id,
                "filename": r.filename,
                "target_role": r.target_role,
                "target_location": r.target_location,
                "total_score": r.total_score,
                "verdict_label": r.verdict_label,
                "recommended_salary_range": r.recommended_salary_range,
                "resume_excerpt": r.resume_excerpt,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }


@router.post("/upload-cv-multipart")
async def api_upload_cv_multipart(
    file: UploadFile = File(...),
    location_hint: Optional[str] = Form("TP. Hồ Chí Minh"),
    target_role: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Nhận file CV trực tiếp qua multipart/form-data (.pdf, .docx, .txt, .md),
    tự động đọc nội dung và đánh giá toàn diện.
    """
    file_bytes = await file.read()
    parsed_doc = parse_uploaded_cv_file(file.filename or "cv.pdf", file_bytes)
    text_for_eval = parsed_doc["extracted_text"]
    if len(text_for_eval.strip()) < 10:
        text_for_eval = f"Hồ sơ ứng viên từ tệp {file.filename}. Cần bổ sung văn bản mô tả kinh nghiệm và kỹ năng."

    eval_res = evaluate_candidate_profile(
        db=db,
        resume_text=text_for_eval,
        target_location=location_hint or "TP. Hồ Chí Minh",
        target_role=target_role,
    )
    return {
        "file_parse_result": parsed_doc,
        "evaluation": eval_res,
    }


@router.post("/audit-curriculum")
def api_audit_curriculum(payload: CurriculumAuditRequest):
    """
    Kiểm toán Chương trình Đào tạo Đại học / Đề cương môn học (Curriculum Gap Audit):
    Bóc tách kỹ năng ESCO trong đề cương và đối sánh với nhu cầu thị trường để phát hiện khoảng trống đào tạo.
    """
    return audit_university_curriculum(
        syllabus_text=payload.syllabus_text,
        program_name=payload.program_name or "Đề cương học phần Đại học"
    )
