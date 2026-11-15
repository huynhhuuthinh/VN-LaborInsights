"""
Pydantic Schemas cho RESTful API (FastAPI) — Đã gia cố kiểm tra an toàn đầu vào (Input Validation & Bounds)
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class JDAnalyzeRequest(BaseModel):
    title: Optional[str] = Field(default="", max_length=300, description="Tiêu đề vị trí tuyển dụng (nếu có)")
    raw_text: str = Field(..., min_length=5, max_length=25000, description="Nội dung mô tả công việc (JD) hoặc CV ứng viên")
    location_hint: Optional[str] = Field(default="TP. Hồ Chí Minh", max_length=120)
    target_role: Optional[str] = Field(default=None, max_length=200, description="Vị trí ứng tuyển mục tiêu (tùy chọn, mặc định tự nhận diện)")


class CVFileParseRequest(BaseModel):
    filename: str = Field(..., max_length=255, description="Tên file CV (.pdf, .docx, .txt, .md)")
    file_base64: str = Field(..., description="Nội dung file mã hóa Base64")
    location_hint: Optional[str] = Field(default="TP. Hồ Chí Minh", max_length=120)
    target_role: Optional[str] = Field(default=None, max_length=200)


class SalaryPredictRequest(BaseModel):
    normalized_title: str = Field(default="Kỹ sư Phần mềm (Backend/Fullstack)", max_length=200)
    industry_code: str = Field(default="IND-IT", max_length=50)
    location_code: str = Field(default="VN-SG", max_length=50)
    experience_level: str = Field(default="Mid-level (2-4 năm)", max_length=80)
    years_of_experience: float = Field(default=3.0, ge=0.0, le=35.0)
    work_mode: str = Field(default="Hybrid", max_length=40)
    skill_names: List[str] = Field(default_factory=lambda: ["Python", "FastAPI", "PostgreSQL", "React"], max_length=30)


class SkillGapRequest(BaseModel):
    target_role: str = Field(..., max_length=200, description="Chức danh mục tiêu người dùng hướng tới")
    current_skills: List[str] = Field(default_factory=list, max_length=30, description="Danh sách kỹ năng hiện có")
    experience_years: float = Field(default=1.0, ge=0.0, le=35.0)
    target_location: str = Field(default="TP. Hồ Chí Minh", max_length=120)


class AIChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1500, description="Câu hỏi của người dùng")
    history: Optional[List[str]] = Field(default_factory=list, max_length=20, description="Lịch sử câu hỏi trong phiên trò chuyện")
    gemini_api_key: Optional[str] = Field(default=None, max_length=200, description="Khóa Google Gemini API miễn phí (tùy chọn)")
    context_filter: Optional[Dict[str, Any]] = None


class ETLTriggerRequest(BaseModel):
    source_platform: str = Field(default="TopCV & VietnamWorks", max_length=120)
    sample_size: int = Field(default=25, ge=5, le=200)
    custom_url: Optional[str] = Field(default=None, max_length=500)
    raw_html_or_text: Optional[str] = Field(default=None, max_length=8000)


class CurriculumAuditRequest(BaseModel):
    program_name: Optional[str] = Field(default="Chương trình Đào tạo Đại học ngành CNTT & Dữ liệu", max_length=250)
    syllabus_text: str = Field(..., min_length=10, max_length=10000)


class GrossToNetRequest(BaseModel):
    gross_salary_vnd: float = Field(default=22.0, ge=5.0, le=250.0, description="Mức lương Gross (triệu VNĐ/tháng)")
    dependents: int = Field(default=0, ge=0, le=10, description="Số người phụ thuộc giảm trừ gia cảnh")
    location_code: str = Field(default="VN-SG", max_length=30)
