"""
Router Công cụ Trí tuệ Nhân tạo, Xử lý Ngôn ngữ Tự nhiên Tiếng Việt & Học máy (/api/v1/ai)
"""
import base64
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session

from ..database import get_db
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


@router.post("/chat")
def api_ai_economist_chat(payload: AIChatRequest, db: Session = Depends(get_db)):
    """
    Trợ lý AI Phân tích Kinh tế Lao động trả lời dựa trên số liệu thực tế trong CSDL,
    tích hợp bộ nhớ ngữ cảnh hội thoại nhiều lượt (Multi-turn Memory) và chế độ Hybrid RAG (Local + Gemini API).
    """
    return answer_labor_market_question(
        db=db,
        question=payload.question,
        history=payload.history or [],
        gemini_api_key=payload.gemini_api_key
    )


@router.post("/evaluate-profile")
def api_evaluate_candidate_profile(payload: JDAnalyzeRequest, db: Session = Depends(get_db)):
    """
    Chấm điểm mức độ sẵn sàng của Hồ sơ năng lực / CV ứng viên theo quy trình ATS & HR 4 trụ cột
    và định giá khung lương đàm phán.
    """
    return evaluate_candidate_profile(
        db=db,
        resume_text=payload.raw_text,
        target_location=payload.location_hint or "TP. Hồ Chí Minh",
        target_role=payload.target_role,
    )


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
    return {
        "file_parse_result": parsed_doc,
        "evaluation": eval_res,
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
