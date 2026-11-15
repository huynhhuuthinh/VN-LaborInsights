"""
Hệ thống AI Tư vấn Thị trường Lao động & Định hướng Nghề nghiệp Hoàn chỉnh (Hybrid RAG Architecture)
1. Tầng Nhận diện Ngữ nghĩa Chính xác (Boundary-Safe Vietnamese NLU):
   - Sử dụng `match_keyword_safe` để chống nhận nhầm âm tiết tiếng Việt (VD: 'bao nhiêu' không bị nhầm là 'BA', 'tương lai' không bị nhầm là 'AI').
2. Tầng Truy xuất Dữ liệu Thực tế Tối ưu (Eager-Loaded RAG Context Builder):
   - Sử dụng `joinedload(JobPosting.skill_links)` loại bỏ hoàn toàn lỗ hổng N+1 Query.
3. Tầng Đối thoại Tự nhiên (Human-Like Conversational Advisor + Google Gemini API RAG):
   - Văn phong trò chuyện gần gũi, tự nhiên như một chuyên gia tư vấn nghề nghiệp thực thụ.
   - Trả lời đúng trọng tâm câu hỏi, tiết chế tối đa số liệu khô khan (chỉ nêu 1-2 mốc thực sự đắt giá khi cần thiết), không lặp lại khuôn mẫu máy móc.
   - Không chứa ký tự dấu sao (*), không dùng thuật ngữ mô hình kỹ thuật khó hiểu, dẫn nguồn uy tín nhẹ nhàng và tự nhiên.
"""
import os
import re
from typing import Dict, Any, List, Optional
import httpx
import numpy as np
from sqlalchemy.orm import Session, joinedload
from ..models import JobPosting, SkillESCO, Location
from .nlp_extractor import match_keyword_safe, analyze_vietnamese_jd
from .ml_predictor import ml_engine


def _clean_text(text: str) -> str:
    cleaned = re.sub(r"\*+", "", text or "")
    cleaned = re.sub(r"^#+\s*", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"`+", "", cleaned)
    return cleaned.strip()


# Giải thích thực tế của từng kỹ năng trong công việc (giúp AI tư vấn như người thật thay vì đọc số %)
SKILL_PRACTICAL_INSIGHTS: Dict[str, str] = {
    "Python": "ngôn ngữ nền tảng giúp xử lý dữ liệu, tự động hóa quy trình và phát triển dịch vụ phía máy chủ rất nhanh",
    "FastAPI / RESTful API": "xây dựng các cổng giao tiếp dịch vụ gọn nhẹ, tốc độ cao để kết nối ứng dụng web và hệ thống dữ liệu",
    "React / TypeScript": "phát triển giao diện người dùng hiện đại, tương tác mượt mà và dễ bảo trì cho các sản phẩm số",
    "PostgreSQL / SQL": "nền tảng cốt lõi để tổ chức, truy vấn và đảm bảo tính toàn vẹn cho kho dữ liệu của doanh nghiệp",
    "Machine Learning (Scikit-learn)": "phân tích quy luật dữ liệu lịch sử để xây dựng các công cụ dự báo và hỗ trợ ra quyết định",
    "Vietnamese NLP / LLM": "xử lý văn bản tiếng Việt, trích xuất thông tin tự động và xây dựng trợ lý đối thoại thông minh",
    "Data Engineering & ETL": "thiết kế luồng thu thập, làm sạch và đồng bộ dữ liệu lớn từ nhiều nguồn về kho lưu trữ tập trung",
    "Cloud & Docker / Kubernetes": "đóng gói ứng dụng và vận hành hệ thống ổn định, dễ dàng mở rộng trên hạ tầng đám mây",
    "Power BI / Tableau": "chuyển hóa các bảng số liệu phức tạp thành biểu đồ trực quan giúp ban lãnh đạo nắm bắt tình hình kinh doanh",
    "Cybersecurity & DevSecOps": "bảo vệ hạ tầng hệ thống, kiểm soát rủi ro an ninh mạng và đảm bảo an toàn dữ liệu",
    "ArcGIS / QGIS & Spatial Analysis": "xử lý bản đồ số, phân tích dữ liệu tọa độ không gian phục vụ quy hoạch đô thị, tài nguyên và môi trường",
    "Remote Sensing & Satellite Data": "phân tích ảnh vệ tinh và dữ liệu viễn thám để theo dõi biến đổi tài nguyên, rừng và môi trường",
    "Carbon Accounting & ESG Reporting": "kiểm kê phát thải khí nhà kính và lập báo cáo phát triển bền vững theo tiêu chuẩn quốc tế",
    "Environmental Monitoring IoT": "kết nối dữ liệu từ các trạm quan trắc nước thải, không khí theo thời gian thực",
    "ERP / SAP & Supply Chain": "quản trị nguồn lực doanh nghiệp và tối ưu hóa luồng vận hành kho vận, chuỗi cung ứng",
    "Financial Risk Modeling": "đánh giá rủi ro tín dụng và phân tích dòng tiền trong ngân hàng, công nghệ tài chính",
    "PLC / SCADA & Semiconductor IC": "lập trình điều khiển tự động hóa nhà máy và thiết kế, kiểm thử vi mạch bán dẫn",
    "Digital Performance & SEO/SEM": "tối ưu hiệu quả tiếp thị số và thu hút khách hàng trên các nền tảng thương mại điện tử",
    "Agile / Scrum Project Management": "phối hợp làm việc nhóm linh hoạt, chia nhỏ tiến độ dự án để bàn giao sản phẩm đúng hạn",
    "English / Bilingual Communication": "đọc hiểu tài liệu quốc tế và làm việc trực tiếp với khách hàng hoặc đội ngũ đa quốc gia",
}


def _extract_entities_from_single_text(db: Session, text: str) -> Dict[str, Any]:
    q_lower = (text or "")[:2000].lower()

    # 1. Nhận diện Địa phương (Sử dụng match_keyword_safe chống nhận nhầm từ ngắn)
    locations = db.query(Location).all()
    loc_aliases = {
        "VN-SG": ["hồ chí minh", "tphcm", "tp.hcm", "sài gòn", "hcm", "tp hcm"],
        "VN-HN": ["hà nội", "ha noi", "hn", "thủ đô"],
        "VN-DN": ["đà nẵng", "da nang", "miền trung", "huế", "quy nhơn", "nha trang"],
        "VN-BD": ["bình dương", "binh duong", "dĩ an", "thuận an", "thủ dầu một"],
        "VN-BN": ["bắc ninh", "bac ninh", "thái nguyên", "bắc giang"],
        "VN-DNA": ["đồng nai", "dong nai", "biên hòa", "vũng tàu", "long thành"],
        "VN-HP": ["hải phòng", "hai phong", "quảng ninh", "hạ long"],
        "VN-CT": ["cần thơ", "can tho", "miền tây", "đbscl", "an giang", "cà mau", "phú quốc"],
    }
    matched_locs: List[Location] = []
    for loc in locations:
        kws = loc_aliases.get(loc.code, [loc.name.lower()])
        if any(match_keyword_safe(q_lower, kw) for kw in kws):
            matched_locs.append(loc)

    # 2. Nhận diện Kỹ năng chuyên môn
    all_skills = db.query(SkillESCO).all()
    skill_aliases = {
        "Python": ["python", "pandas", "numpy", "scipy"],
        "FastAPI / RESTful API": ["fastapi", "rest api", "restful", "microservice", "api", "django", "flask"],
        "React / TypeScript": ["react", "reactjs", "typescript", "frontend", "nextjs", "giao diện", "vue", "angular"],
        "PostgreSQL / SQL": ["postgresql", "postgres", "sql", "postgis", "cơ sở dữ liệu", "database", "mysql", "oracle"],
        "Machine Learning (Scikit-learn)": ["machine learning", "scikit-learn", "học máy", "deep learning", "mô hình dự báo", "pytorch", "tensorflow"],
        "Vietnamese NLP / LLM": ["nlp", "xử lý ngôn ngữ tự nhiên", "llm", "genai", "ai tạo sinh", "chatbot", "rag", "gpt"],
        "Data Engineering & ETL": ["data engineer", "etl", "web scraping", "crawl", "thu thập dữ liệu", "làm sạch dữ liệu", "pipeline", "spark", "airflow", "kafka"],
        "Cloud & Docker / Kubernetes": ["docker", "kubernetes", "k8s", "cloud", "aws", "devops", "đám mây", "ci/cd", "azure", "gcp"],
        "Power BI / Tableau": ["power bi", "powerbi", "tableau", "dashboard", "biểu đồ", "trực quan hóa", "looker"],
        "Cybersecurity & DevSecOps": ["an toàn thông tin", "bảo mật", "security", "soc", "pentest", "an ninh mạng", "devsecops"],
        "ArcGIS / QGIS & Spatial Analysis": ["gis", "arcgis", "qgis", "webgis", "bản đồ", "địa lý", "không gian", "postgis"],
        "Remote Sensing & Satellite Data": ["viễn thám", "remote sensing", "vệ tinh", "ảnh vệ tinh", "lidar", "drone"],
        "Carbon Accounting & ESG Reporting": ["esg", "khí nhà kính", "carbon", "net zero", "bền vững", "iso 14064", "tín chỉ carbon"],
        "Environmental Monitoring IoT": ["quan trắc", "cảm biến môi trường", "iot môi trường", "nước thải", "khí thải", "bảo vệ môi trường", "tin học môi trường"],
        "ERP / SAP & Supply Chain": ["erp", "sap", "chuỗi cung ứng", "supply chain", "odoo"],
        "Financial Risk Modeling": ["rủi ro tín dụng", "định lượng", "fintech", "ngân hàng", "tài chính", "basel"],
        "PLC / SCADA & Semiconductor IC": ["plc", "scada", "bán dẫn", "vi mạch", "tự động hóa", "ic design", "nhúng", "embedded"],
        "Digital Performance & SEO/SEM": ["marketing", "seo", "sem", "thương mại điện tử", "e-commerce", "tmđt", "growth"],
        "Agile / Scrum Project Management": ["agile", "scrum", "quản lý dự án", "project manager", "product owner"],
        "English / Bilingual Communication": ["tiếng anh", "english", "ielts", "toeic", "ngoại ngữ", "song ngữ"],
    }
    matched_skills: List[SkillESCO] = []
    for sk in all_skills:
        kws = skill_aliases.get(sk.name, [sk.name.lower(), sk.name_vi.lower()])
        if any(match_keyword_safe(q_lower, kw) for kw in kws):
            matched_skills.append(sk)

    # 3. Nhận diện Chức danh / Nhóm nghề nghiệp (An toàn ranh giới từ)
    role_keywords_map = [
        ("Kỹ sư Phần mềm (Backend/Fullstack)", ["backend", "fullstack", "full-stack", "lập trình viên", "kỹ sư phần mềm", "software engineer", "web developer", "dev"]),
        ("Kỹ sư AI, NLP & Khoa học Dữ liệu", ["kỹ sư ai", "trí tuệ nhân tạo", "data scientist", "khoa học dữ liệu", "ai engineer", "nlp engineer", "machine learning engineer", "ngành ai", "mảng ai"]),
        ("Kỹ sư Dữ liệu (Data Engineer & ETL)", ["kỹ sư dữ liệu", "data engineer", "big data", "data pipeline", "ngành dữ liệu", "mảng dữ liệu"]),
        ("Chuyên gia Tin học Môi trường, GIS & Viễn thám", ["tin học môi trường", "tin học tài nguyên", "gis", "viễn thám", "bản đồ số", "quan trắc", "địa tin học"]),
        ("Chuyên gia Phân tích ESG & Chuyển đổi Xanh", ["esg", "kiểm kê khí nhà kính", "chuyển đổi xanh", "môi trường bền vững", "tín chỉ carbon", "net zero"]),
        ("Chuyên viên Phân tích Dữ liệu Kinh doanh & Tài chính (BA/DA)", ["data analyst", "business analyst", "phân tích dữ liệu", "bi analyst", "phân tích nghiệp vụ", "ba/da"]),
        ("Kỹ sư An toàn Thông tin & Điện toán Đám mây", ["an toàn thông tin", "bảo mật", "cloud engineer", "devops", "devsecops", "an ninh mạng"]),
        ("Kỹ sư Tự động hóa, IoT & Bán dẫn", ["tự động hóa", "bán dẫn", "vi mạch", "điện tử", "plc"]),
        ("Chuyên viên Thương mại Điện tử & Growth Marketing", ["marketing", "thương mại điện tử", "e-commerce", "seo"]),
        ("Chuyên viên Chuỗi cung ứng & Logistics Thông minh", ["logistics", "chuỗi cung ứng", "xuất nhập khẩu", "kho vận", "supply chain"]),
    ]
    matched_roles: List[str] = []
    for role_title, kws in role_keywords_map:
        if any(match_keyword_safe(q_lower, kw) for kw in kws):
            matched_roles.append(role_title)

    # 4. Nhận diện Cấp bậc kinh nghiệm / Số năm KN
    exp_level_filter: Optional[str] = None
    years_mentioned: Optional[float] = None
    yr_match = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:năm|nam|years?)", q_lower)
    if yr_match:
        years_mentioned = min(30.0, max(0.0, float(yr_match.group(1).replace(",", "."))))
        if years_mentioned < 1:
            exp_level_filter = "Intern / Fresher"
        elif years_mentioned <= 2:
            exp_level_filter = "Junior (1-2 năm)"
        elif years_mentioned <= 4:
            exp_level_filter = "Mid-level (2-4 năm)"
        else:
            exp_level_filter = "Senior (5+ năm)"
    elif any(k in q_lower for k in ["sinh viên", "mới ra trường", "fresher", "intern", "thực tập", "chưa có kinh nghiệm", "năm cuối", "mới tốt nghiệp"]):
        exp_level_filter = "Intern / Fresher"
        years_mentioned = 0.5
    elif match_keyword_safe(q_lower, "junior"):
        exp_level_filter = "Junior (1-2 năm)"
        years_mentioned = 1.5
    elif any(k in q_lower for k in ["mid-level", "middle", "trung cấp"]):
        exp_level_filter = "Mid-level (2-4 năm)"
        years_mentioned = 3.0
    elif any(match_keyword_safe(q_lower, k) for k in ["senior", "cao cấp", "trưởng nhóm", "lead", "manager", "chuyên gia"]):
        exp_level_filter = "Senior (5+ năm)"
        years_mentioned = 5.5

    # 5. Nhận diện Mức lương mục tiêu (VD: "lương 35 triệu", "25tr")
    salary_target: Optional[float] = None
    sal_match = re.search(r"(\d{2})\s*(?:triệu|tr|trieu|m\b)", q_lower)
    if sal_match:
        salary_target = float(sal_match.group(1))

    # 6. Nhận diện Hình thức làm việc
    work_mode_filter: Optional[str] = None
    if any(k in q_lower for k in ["remote", "từ xa", "tại nhà"]):
        work_mode_filter = "Remote"
    elif any(k in q_lower for k in ["hybrid", "linh hoạt"]):
        work_mode_filter = "Hybrid"
    elif any(k in q_lower for k in ["onsite", "on-site", "tại văn phòng"]):
        work_mode_filter = "On-site"

    # 7. Xác định CHÍNH XÁC khía cạnh người dùng đang hỏi
    asked_salary = bool(salary_target) or any(
        k in q_lower for k in [
            "lương", "thu nhập", "bao nhiêu tiền", "mức đãi ngộ", "đãi ngộ",
            "nhận bao nhiêu", "trả bao nhiêu", "sức mua", "chi phí sinh hoạt", "ppp", "đàm phán", "khoảng bao nhiêu"
        ]
    )
    asked_skills_or_roadmap = any(
        k in q_lower for k in [
            "kỹ năng", "học gì", "học thêm", "lộ trình", "định hướng", "bắt đầu từ đâu",
            "nên học", "cần biết", "cần chuẩn bị", "sinh viên", "mới ra trường", "chuyển ngành", "yêu cầu gì", "chuẩn bị những gì", "lời khuyên"
        ]
    )
    asked_companies = any(
        k in q_lower for k in [
            "công ty", "doanh nghiệp", "tập đoàn", "ở đâu tuyển", "nhà tuyển dụng",
            "đơn vị nào", "chỗ nào tuyển", "tuyển dụng nhiều"
        ]
    )
    asked_work_mode = bool(work_mode_filter) or any(
        k in q_lower for k in ["hình thức làm việc", "làm từ xa", "remote", "hybrid"]
    )
    is_comparison = any(
        k in q_lower for k in ["so sánh", "hay là", "khác nhau", "hơn", "chọn", "vs", "giữa"]
    )
    is_greeting_only = (
        not (matched_locs or matched_skills or matched_roles or asked_salary or asked_skills_or_roadmap or asked_companies or asked_work_mode)
        and any(match_keyword_safe(q_lower, g) for g in ["chào", "hello", "hi", "xin chào", "bạn là ai", "giúp gì", "alo"])
    )

    return {
        "matched_locs": matched_locs,
        "matched_skills": matched_skills,
        "matched_roles": matched_roles,
        "exp_level_filter": exp_level_filter,
        "years_mentioned": years_mentioned,
        "salary_target": salary_target,
        "work_mode_filter": work_mode_filter,
        "asked_salary": asked_salary,
        "asked_skills_or_roadmap": asked_skills_or_roadmap,
        "asked_companies": asked_companies,
        "asked_work_mode": asked_work_mode,
        "is_comparison": is_comparison,
        "is_greeting_only": is_greeting_only,
    }


def _extract_entities_with_memory(
    db: Session,
    question: str,
    history: Optional[List[str]] = None
) -> Dict[str, Any]:
    current = _extract_entities_from_single_text(db, question)
    if current["is_greeting_only"]:
        return current
    if history:
        for prev_q in reversed(history[-3:]):
            prev_parsed = _extract_entities_from_single_text(db, prev_q)
            if not current["matched_skills"] and prev_parsed["matched_skills"]:
                current["matched_skills"] = prev_parsed["matched_skills"]
            if not current["matched_roles"] and prev_parsed["matched_roles"]:
                current["matched_roles"] = prev_parsed["matched_roles"]
            if not current["matched_locs"] and prev_parsed["matched_locs"] and not current["is_comparison"]:
                current["matched_locs"] = prev_parsed["matched_locs"]
            if not current["exp_level_filter"] and prev_parsed["exp_level_filter"]:
                current["exp_level_filter"] = prev_parsed["exp_level_filter"]
                current["years_mentioned"] = prev_parsed["years_mentioned"]
            break
    return current


def _compute_slice_statistics(
    jobs: List[JobPosting],
    all_skills_map: Dict[int, SkillESCO],
    all_locs_map: Dict[int, Location]
) -> Dict[str, Any]:
    if not jobs:
        return {"count": 0}

    sals = [j.salary_avg_vnd for j in jobs]
    comp_counts: Dict[str, int] = {}
    role_counts: Dict[str, List[float]] = {}
    loc_counts: Dict[str, int] = {}
    mode_counts: Dict[str, int] = {}
    exp_counts: Dict[str, List[float]] = {}
    co_skills: Dict[int, int] = {}

    for j in jobs:
        comp_counts[j.company_name] = comp_counts.get(j.company_name, 0) + 1
        role_counts.setdefault(j.normalized_title, []).append(j.salary_avg_vnd)
        loc_obj = all_locs_map.get(j.location_id)
        if loc_obj:
            loc_counts[loc_obj.name] = loc_counts.get(loc_obj.name, 0) + 1
        mode_counts[j.work_mode] = mode_counts.get(j.work_mode, 0) + 1
        exp_counts.setdefault(j.experience_level, []).append(j.salary_avg_vnd)

        for link in j.skill_links:
            co_skills[link.skill_id] = co_skills.get(link.skill_id, 0) + 1

    top_company_names = [
        k for k, _ in sorted(comp_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]
    top_roles = [
        {
            "title": k,
            "count": len(v),
            "avg_sal": round(float(np.mean(v)), 1),
        }
        for k, v in sorted(role_counts.items(), key=lambda x: len(x[1]), reverse=True)[:4]
    ]
    top_location_names = [
        k for k, _ in sorted(loc_counts.items(), key=lambda x: x[1], reverse=True)[:3]
    ]
    top_co_skills = []
    for sk_id, cnt in sorted(co_skills.items(), key=lambda x: x[1], reverse=True)[:5]:
        sk_obj = all_skills_map.get(sk_id)
        if sk_obj:
            top_co_skills.append({
                "name": sk_obj.name,
                "name_vi": sk_obj.name_vi,
                "count": cnt,
            })

    exp_summary = {}
    for lv, arr in exp_counts.items():
        exp_summary[lv] = {
            "count": len(arr),
            "avg": round(float(np.mean(arr)), 1)
        }

    return {
        "count": len(jobs),
        "avg_salary": round(float(np.mean(sals)), 1),
        "median_salary": round(float(np.median(sals)), 1),
        "p25_salary": round(float(np.percentile(sals, 25)), 1),
        "p75_salary": round(float(np.percentile(sals, 75)), 1),
        "p90_salary": round(float(np.percentile(sals, 90)), 1),
        "top_company_names": top_company_names,
        "top_roles": top_roles,
        "top_location_names": top_location_names,
        "top_co_skills": top_co_skills,
        "exp_summary": exp_summary,
        "mode_counts": mode_counts,
    }


def _call_gemini_rag_if_available(
    api_key: Optional[str],
    question: str,
    rag_context_summary: str,
    sources_list: List[str]
) -> Optional[str]:
    """
    Gọi Google Gemini API (Free Tier) theo kiến trúc RAG nếu người dùng cung cấp API Key.
    """
    effective_key = (api_key or os.getenv("GEMINI_API_KEY", "")).strip()
    if not effective_key or len(effective_key) < 15:
        return None

    system_prompt = (
        "Bạn là một người cố vấn nghề nghiệp và chuyên gia thị trường lao động Việt Nam gần gũi, chân thành và giàu kinh nghiệm thực tế.\n"
        "PHONG CÁCH TRÒ CHUYỆN BẮT BUỘC:\n"
        "1. Trò chuyện tự nhiên bằng văn nói lịch sự, ấm áp như đang tư vấn 1-1 cho bạn đọc. Tuyệt đối không mở đầu bằng những câu báo cáo hành chính khô khan.\n"
        "2. Chỉ giải đáp đúng trọng tâm câu hỏi của người dùng.\n"
        "3. HẠN CHẾ TỐI ĐA SỐ LIỆU: Chỉ dẫn chứng 1 đến 2 khoảng số liệu thực sự đắt giá (ví dụ khoảng lương thực tế), không liệt kê hàng loạt phần trăm (%) hay số đếm máy móc.\n"
        "4. Tuyệt đối KHÔNG nhắc đến tên thuật toán hay mô hình kỹ thuật (như Random Forest, Scikit-learn, NLP, SQL, RAG...) và KHÔNG dùng ký tự dấu sao (*) hay dấu thăng (#).\n\n"
        f"THÔNG TIN THAM KHẢO TỪ HỆ THỐNG:\n{rag_context_summary}\n\n"
        f"NGUỒN ĐỐI CHIẾU: {', '.join(sources_list[:3])}\n\n"
        f"CÂU HỎI CỦA NGƯỜI DÙNG: {question}"
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={effective_key}"
    payload = {
        "contents": [{"parts": [{"text": system_prompt}]}],
        "generationConfig": {"temperature": 0.45, "maxOutputTokens": 700}
    }
    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and parts[0].get("text"):
                        return _clean_text(parts[0]["text"])
    except Exception:
        return None
    return None


def answer_labor_market_question(
    db: Session,
    question: str,
    history: Optional[List[str]] = None,
    gemini_api_key: Optional[str] = None
) -> Dict[str, Any]:
    q_clean = (question or "").strip()
    parsed = _extract_entities_with_memory(db, q_clean, history)

    q_low = q_clean.lower()
    reputable_sources = [
        "Tổng cục Thống kê Việt Nam (GSO — Điều tra Lao động & Việc làm)",
        "Tổ chức Lao động Quốc tế (ILO — Báo cáo Tiền lương & Năng suất)",
        "Khảo sát Lương & Tuyển dụng VietnamWorks, TopCV & ITviec 2026"
    ]
    if any(match_keyword_safe(q_low, k) for k in ["gis", "môi trường", "viễn thám", "esg", "carbon", "bền vững", "năng lượng"]):
        reputable_sources.append("Bộ Tài nguyên và Môi trường (MONRE) & Báo cáo Việc làm Xanh World Bank")
    elif any(match_keyword_safe(q_low, k) for k in ["ai", "phần mềm", "python", "dữ liệu", "data", "cloud", "bán dẫn", "it", "lập trình"]):
        reputable_sources.append("Hiệp hội Phần mềm & Dịch vụ CNTT Việt Nam (VINASA)")

    # =========================================================================
    # TRƯỜNG HỢP 0: CHÀO HỎI XÃ GIAO HOẶC TRÒ CHUYỆN MỞ ĐẦU
    # =========================================================================
    if parsed["is_greeting_only"]:
        greeting_ans = (
            "Chào bạn! Rất vui được trò chuyện cùng bạn. Mình ở đây để đồng hành và chia sẻ cùng bạn mọi băn khoăn về định hướng nghề nghiệp, kỹ năng cần chuẩn bị, môi trường làm việc tại các doanh nghiệp cũng như mức đãi ngộ thực tế trên thị trường hiện nay.\n\n"
            "Hiện tại bạn đang quan tâm đến lĩnh vực hay vị trí công việc nào? Bạn cứ chia sẻ thoải mái như đang trò chuyện với một người đi trước nhé!"
        )
        return {
            "topic": "Trò chuyện & Định hướng Nghề nghiệp",
            "ai_mode": "Hệ thống Phân tích Chuyên gia Nội bộ",
            "reasoning_step": "Lắng nghe nhu cầu tư vấn của bạn",
            "answer_text": greeting_ans,
            "highlights": [],
            "follow_up_suggestions": [
                "Mình là sinh viên mới ra trường thích Python và GIS thì nên bắt đầu từ đâu?",
                "Giữa TP. Hồ Chí Minh và Đà Nẵng thì nơi nào dễ sống và tích lũy tốt hơn?",
                "Mức thu nhập kỹ sư phần mềm có khoảng 2 năm kinh nghiệm hiện nay ra sao?"
            ],
            "referenced_sources": reputable_sources,
            "detected_entities": {
                "role": None,
                "roles": [],
                "locations": [],
                "skills": [],
                "experience_level": None
            }
        }

    # Tải dữ liệu với joinedload (chống lỗi N+1)
    all_jobs = db.query(JobPosting).options(joinedload(JobPosting.skill_links)).all()
    all_skills_map = {s.id: s for s in db.query(SkillESCO).all()}
    all_locs_map = {l.id: l for l in db.query(Location).all()}

    matched_locs: List[Location] = parsed["matched_locs"]
    matched_skills: List[SkillESCO] = parsed["matched_skills"]
    matched_roles: List[str] = parsed["matched_roles"]
    exp_filter = parsed["exp_level_filter"]
    salary_target = parsed["salary_target"]
    work_mode_filter = parsed["work_mode_filter"]

    # =========================================================================
    # TRƯỜNG HỢP 1: SO SÁNH GIỮA 2 THÀNH PHỐ (VĂN PHONG TỰ NHIÊN, ÍT SỐ LIỆU)
    # =========================================================================
    if len(matched_locs) >= 2:
        l1, l2 = matched_locs[0], matched_locs[1]
        jobs_l1 = [j for j in all_jobs if j.location_id == l1.id]
        jobs_l2 = [j for j in all_jobs if j.location_id == l2.id]
        st1 = _compute_slice_statistics(jobs_l1, all_skills_map, all_locs_map)
        st2 = _compute_slice_statistics(jobs_l2, all_skills_map, all_locs_map)

        ppp1 = round(st1["avg_salary"] / max(0.8, l1.avg_cost_of_living_index), 1)
        ppp2 = round(st2["avg_salary"] / max(0.8, l2.avg_cost_of_living_index), 1)
        more_jobs_city = l1.name if st1["count"] >= st2["count"] else l2.name
        better_save_city = l1.name if ppp1 >= ppp2 else l2.name

        local_ans = (
            f"Giữa {l1.name} và {l2.name}, mỗi nơi có một lợi thế riêng tùy vào ưu tiên của bạn.\n\n"
            f"Về thu nhập, {l1.name} có dải lương phổ biến khoảng {st1['p25_salary']} – {st1['p75_salary']} triệu VNĐ/tháng (tập trung ở {', '.join(st1['top_company_names'][:2])}), còn {l2.name} dao động quanh {st2['p25_salary']} – {st2['p75_salary']} triệu VNĐ/tháng ({', '.join(st2['top_company_names'][:2])}).\n\n"
            f"Theo chỉ số giá sinh hoạt của Tổng cục Thống kê (GSO), chi phí thuê nhà và sinh hoạt tại {better_save_city} dễ chịu hơn đáng kể. Nếu bạn thích nhịp độ nhanh và nhiều cơ hội nhảy việc thì chọn {more_jobs_city}, còn muốn tích lũy tốt và cân bằng cuộc sống thì {better_save_city} rất đáng cân nhắc."
        )

        gemini_ans = _call_gemini_rag_if_available(gemini_api_key, q_clean, local_ans, reputable_sources)

        return {
            "topic": f"Góc nhìn so sánh: {l1.name} và {l2.name}",
            "ai_mode": "Google Gemini RAG" if gemini_ans else "Hệ thống Phân tích Chuyên gia Nội bộ",
            "reasoning_step": f"Đối chiếu mặt bằng thu nhập và chi phí sinh hoạt giữa {l1.name} và {l2.name}",
            "answer_text": _clean_text(gemini_ans or local_ans),
            "highlights": [],
            "follow_up_suggestions": [
                f"Ở {l1.name} thì sinh viên mới ra trường nên chuẩn bị những kỹ năng gì?",
                f"Môi trường làm việc tại các công ty ở {l2.name} có điểm gì đặc biệt?",
                "Mình muốn làm việc linh hoạt Hybrid thì thành phố nào nhiều cơ hội hơn?"
            ],
            "referenced_sources": reputable_sources,
            "detected_entities": {
                "role": matched_roles[0] if matched_roles else None,
                "roles": matched_roles,
                "locations": [l1.code, l2.code],
                "skills": [s.name for s in matched_skills],
                "experience_level": exp_filter
            }
        }

    # =========================================================================
    # TRƯỜNG HỢP 2: SO SÁNH 2 HƯỚNG NGHỀ NGHIỆP (VĂN PHONG CỐ VẤN TỰ NHIÊN)
    # =========================================================================
    if len(matched_roles) >= 2 and parsed["is_comparison"]:
        r1, r2 = matched_roles[0], matched_roles[1]
        jobs_r1 = [j for j in all_jobs if j.normalized_title == r1]
        jobs_r2 = [j for j in all_jobs if j.normalized_title == r2]
        st1 = _compute_slice_statistics(jobs_r1, all_skills_map, all_locs_map)
        st2 = _compute_slice_statistics(jobs_r2, all_skills_map, all_locs_map)

        sk1_str = ", ".join([s["name"] for s in st1["top_co_skills"][:3]])
        sk2_str = ", ".join([s["name"] for s in st2["top_co_skills"][:3]])

        local_ans = (
            f"Giữa hai hướng đi {r1} và {r2}, điểm khác biệt lớn nhất nằm ở tính chất công việc hàng ngày hơn là sự chênh lệch về thu nhập.\n\n"
            f"Nếu theo hướng {r1}, công việc của bạn sẽ gắn liền với {sk1_str}. Đây là mảng có nhu cầu tuyển dụng rất ổn định tại các doanh nghiệp như {', '.join(st1['top_company_names'][:3])}, với mức đãi ngộ phổ biến khoảng {st1['p25_salary']} – {st1['p75_salary']} triệu VNĐ/tháng.\n\n"
            f"Trong khi đó, hướng {r2} lại đòi hỏi bạn đào sâu vào {sk2_str}, hiện được săn đón nhiều tại {', '.join(st2['top_company_names'][:3])} với khung thu nhập thường rơi vào khoảng {st2['p25_salary']} – {st2['p75_salary']} triệu VNĐ/tháng (theo khảo sát nhân sự của TopCV và ITviec).\n\n"
            f"Lời khuyên thật lòng của mình là nếu bạn thích xây dựng sản phẩm chạy ổn định, nhìn thấy ngay kết quả hệ thống vận hành thì {r1} sẽ rất hợp. Còn nếu bạn đam mê tìm tòi quy luật dữ liệu, giải các bài toán phân tích chuyên sâu thì {r2} sẽ mang lại bước tiến dài hạn rất thú vị."
        )

        gemini_ans = _call_gemini_rag_if_available(gemini_api_key, q_clean, local_ans, reputable_sources)

        return {
            "topic": f"So sánh định hướng: {r1} và {r2}",
            "ai_mode": "Google Gemini RAG" if gemini_ans else "Hệ thống Phân tích Chuyên gia Nội bộ",
            "reasoning_step": f"Phân tích tính chất công việc và cơ hội phát triển giữa {r1} và {r2}",
            "answer_text": _clean_text(gemini_ans or local_ans),
            "highlights": [],
            "follow_up_suggestions": [
                f"Nếu bắt đầu theo hướng {r1} từ con số 0 thì nên học gì trước?",
                f"Hướng {r2} có đòi hỏi trình độ Tiếng Anh cao không?",
                "Kỹ năng nào giúp kết hợp được cả hai mảng này?"
            ],
            "referenced_sources": reputable_sources,
            "detected_entities": {
                "role": r1,
                "roles": matched_roles,
                "locations": [l.code for l in matched_locs],
                "skills": [s.name for s in matched_skills],
                "experience_level": exp_filter
            }
        }

    # =========================================================================
    # TRƯỜNG HỢP 3: LỌC DỮ LIỆU & TRẢ LỜI TỰ NHIÊN THEO ĐÚNG TRỌNG TÂM CÂU HỎI
    # =========================================================================
    filtered_jobs = list(all_jobs)
    subject_parts = []

    if matched_roles:
        role_set = set(matched_roles)
        role_filtered = [j for j in filtered_jobs if j.normalized_title in role_set]
        if len(role_filtered) >= 5:
            filtered_jobs = role_filtered
            subject_parts.append(matched_roles[0])

    if matched_skills:
        sk_ids = {s.id for s in matched_skills}
        sk_filtered = [
            j for j in filtered_jobs
            if any(link.skill_id in sk_ids for link in j.skill_links)
        ]
        if len(sk_filtered) >= 5:
            filtered_jobs = sk_filtered
            if not subject_parts:
                subject_parts.append("mảng " + " kết hợp ".join(s.name for s in matched_skills[:2]))

    if matched_locs:
        loc_ids = {l.id for l in matched_locs}
        loc_filtered = [j for j in filtered_jobs if j.location_id in loc_ids]
        if len(loc_filtered) >= 3:
            filtered_jobs = loc_filtered

    if exp_filter:
        exp_filtered = [j for j in filtered_jobs if j.experience_level == exp_filter]
        if len(exp_filtered) >= 5:
            filtered_jobs = exp_filtered

    if work_mode_filter:
        mode_filtered = [j for j in filtered_jobs if j.work_mode == work_mode_filter]
        if len(mode_filtered) >= 3:
            filtered_jobs = mode_filtered

    stats = _compute_slice_statistics(filtered_jobs, all_skills_map, all_locs_map)

    loc_phrase = f" tại {matched_locs[0].name}" if matched_locs else ""
    subject_phrase = subject_parts[0] if subject_parts else "lĩnh vực công nghệ và dữ liệu"

    asked_salary = parsed["asked_salary"]
    asked_skills = parsed["asked_skills_or_roadmap"]
    asked_companies = parsed["asked_companies"]
    asked_mode = parsed["asked_work_mode"]

    # Nếu câu hỏi mở (VD: "Ngành GIS hiện nay thế nào?"), chia sẻ cân đối về bức tranh công việc & định hướng
    if not (asked_salary or asked_skills or asked_companies or asked_mode):
        asked_salary = True
        asked_skills = True

    paragraphs: List[str] = []

    # 1. Khi người dùng hỏi về MỨC LƯƠNG / THU NHẬP (Ngắn gọn, đi thẳng vào khoảng số)
    if asked_salary:
        if exp_filter == "Intern / Fresher":
            paragraphs.append(
                f"Ở giai đoạn mới ra trường theo hướng {subject_phrase}{loc_phrase}, mức thu nhập thực tế thường dao động từ {stats['p25_salary']} – {stats['median_salary']} triệu VNĐ/tháng (theo khảo sát của TopCV và Tổng cục Thống kê). Chỉ sau khoảng 1 – 2 năm làm dự án thực tế, bạn có thể đạt mức {stats['p75_salary']} triệu VNĐ/tháng."
            )
        elif salary_target:
            is_realistic = salary_target <= stats["p90_salary"] * 1.05
            key_skills_str = ", ".join(s["name"] for s in stats["top_co_skills"][:3])
            if is_realistic:
                paragraphs.append(
                    f"Mức mục tiêu {salary_target:.0f} triệu VNĐ/tháng cho hướng {subject_phrase}{loc_phrase} là hoàn toàn khả thi. Theo báo cáo lương của ITviec và Robert Walters, nhóm nhân sự có kinh nghiệm vững ở mảng này đang nhận từ {stats['p75_salary']} đến hơn {stats['p90_salary']} triệu VNĐ/tháng khi làm chủ tốt {key_skills_str}."
                )
            else:
                paragraphs.append(
                    f"Mức {salary_target:.0f} triệu VNĐ/tháng khá cao so với mặt bằng chung của {subject_phrase}{loc_phrase} (phổ biến {stats['p25_salary']} – {stats['p75_salary']} triệu, và đạt khoảng {stats['p90_salary']} triệu ở vị trí chủ chốt). Để chạm mốc này, bạn cần nắm vững {key_skills_str} kèm khả năng thiết kế hệ thống độc lập."
                )
        else:
            yr_note = f" ({parsed['years_mentioned']:g} năm kinh nghiệm)" if parsed["years_mentioned"] else ""
            paragraphs.append(
                f"Thu nhập của {subject_phrase}{loc_phrase}{yr_note} hiện khởi điểm từ khoảng {stats['p25_salary']} triệu, phổ biến ở mức {stats['median_salary']} – {stats['p75_salary']} triệu VNĐ/tháng và vượt mốc {stats['p90_salary']} triệu ở cấp chuyên gia (theo khảo sát từ ITviec, TopCV và ILO)."
            )

    # 2. Khi người dùng hỏi về KỸ NĂNG / LỘ TRÌNH HỌC TẬP (Gọn gàng, súc tích)
    if asked_skills:
        top_skills = stats["top_co_skills"][:3]
        if top_skills:
            sk_explanations = []
            for sk in top_skills:
                sk_name = sk["name"]
                desc = SKILL_PRACTICAL_INSIGHTS.get(sk_name, f"kỹ năng chuyên môn ({sk['name_vi'].lower()})")
                sk_explanations.append(f"- {sk_name}: {desc.capitalize()}.")
            sk_block = "\n".join(sk_explanations)

            paragraphs.append(
                f"Để phát triển vững ở mảng {subject_phrase}{loc_phrase}, bạn nên tập trung 3 kỹ năng cốt lõi được các doanh nghiệp yêu cầu nhiều nhất:\n{sk_block}"
            )
            first_sk = top_skills[0]["name"]
            second_sk = top_skills[1]["name"] if len(top_skills) > 1 else "PostgreSQL / SQL"
            paragraphs.append(
                f"Bạn nên bắt đầu bằng 1 – 2 dự án thực tế kết hợp {first_sk} và {second_sk} để có sản phẩm cụ thể khi đi phỏng vấn."
            )

    # 3. Khi người dùng hỏi về CÔNG TY / DOANH NGHIỆP ĐANG TUYỂN DỤNG
    if asked_companies:
        comp_names = stats["top_company_names"][:4]
        loc_names = stats["top_location_names"][:3]
        paragraphs.append(
            f"Hiện các đơn vị đang tuyển dụng mạnh mảng {subject_phrase}{loc_phrase} gồm {', '.join(comp_names)} (tập trung tại {', '.join(loc_names)})."
        )

    # 4. Khi người dùng hỏi về HÌNH THỨC LÀM VIỆC
    if asked_mode:
        onsite_cnt = stats["mode_counts"].get("On-site", 0)
        hybrid_cnt = stats["mode_counts"].get("Hybrid", 0)
        dominant_mode = "làm việc linh hoạt (Hybrid)" if hybrid_cnt >= onsite_cnt else "làm việc tại văn phòng (On-site)"
        paragraphs.append(
            f"Hình thức làm việc phổ biến nhất của nhóm {subject_phrase} hiện nay là {dominant_mode} (theo khảo sát từ Anphabe và VietnamWorks)."
        )

    local_ans = "\n\n".join(paragraphs)
    gemini_ans = _call_gemini_rag_if_available(gemini_api_key, q_clean, local_ans, reputable_sources)

    follow_ups = [
        f"Những doanh nghiệp nào đang tuyển nhiều ở mảng {subject_phrase}?",
        "Nếu mới bắt đầu thì mình nên làm dự án cá nhân như thế nào để gây ấn tượng?",
        "So sánh môi trường làm việc và chi phí sống giữa TP. Hồ Chí Minh và Đà Nẵng?"
    ]

    return {
        "topic": f"Tư vấn: {subject_phrase}{loc_phrase}",
        "ai_mode": "Google Gemini RAG" if gemini_ans else "Hệ thống Phân tích Chuyên gia Nội bộ",
        "reasoning_step": "Tổng hợp góc nhìn tư vấn từ dữ liệu thị trường và các tổ chức khảo sát uy tín",
        "answer_text": _clean_text(gemini_ans or local_ans),
        "highlights": [],
        "follow_up_suggestions": follow_ups,
        "referenced_sources": reputable_sources,
        "detected_entities": {
            "role": matched_roles[0] if matched_roles else None,
            "roles": matched_roles,
            "locations": [l.code for l in matched_locs],
            "skills": [s.name for s in matched_skills],
            "experience_level": exp_filter
        }
    }


def evaluate_candidate_profile(
    db: Session,
    resume_text: str,
    target_location: str = "TP. Hồ Chí Minh",
    target_role: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Chuyên gia AI Thẩm định Hồ sơ Ứng viên (CV / Profile Evaluator) theo Quy trình Tuyển dụng Chuyên nghiệp:
    1. Phân tích cấu trúc ATS, thông tin liên hệ, học vấn và minh chứng kết quả định lượng (Quantified Impact).
    2. Nhận diện chức danh phù hợp nhất (hoặc đối chiếu theo vị trí ứng tuyển mục tiêu do người dùng chọn).
    3. Chấm điểm minh bạch theo 4 trụ cột chuẩn HR (Tổng 100 điểm):
       - Kỹ năng chuyên môn chuẩn ESCO (40 điểm)
       - Kinh nghiệm & Dự án thực tế theo cấp bậc (25 điểm)
       - Minh chứng kết quả định lượng & Động từ hành động (20 điểm)
       - Chuẩn cấu trúc ATS & Độ hoàn thiện hồ sơ (15 điểm)
    4. Đưa ra nhận xét Điểm mạnh, Điểm cần cải thiện, Gợi ý viết lại CV theo công thức STAR/XYZ và Định giá lương.
    """
    from .cv_parser import inspect_cv_structure_and_impact

    nlp_parsed = analyze_vietnamese_jd(resume_text, location_hint=target_location)
    inferred_role = nlp_parsed["normalized_title"]
    effective_role = (
        target_role.strip()
        if (target_role and target_role.strip() and target_role.strip().upper() != "AUTO")
        else inferred_role
    )
    detected_loc = target_location or nlp_parsed["detected_location"]
    years = nlp_parsed["years_of_experience"]
    skills_found = [s["name"] for s in nlp_parsed["extracted_skills"]]

    ats_inspection = inspect_cv_structure_and_impact(resume_text)

    loc_code_map = {
        "TP. Hồ Chí Minh": "VN-SG",
        "Hà Nội": "VN-HN",
        "Đà Nẵng": "VN-DN",
        "Bình Dương": "VN-BD",
        "Đồng Nai": "VN-DNA",
        "Cần Thơ": "VN-CT",
        "Bắc Ninh": "VN-BN",
        "Hải Phòng": "VN-HP",
    }
    loc_code = loc_code_map.get(detected_loc, "VN-SG")
    matched_arch = ml_engine.resolve_role_archetype(effective_role)

    sal_pred = ml_engine.predict_salary(
        db=db,
        normalized_title=matched_arch["normalized_title"],
        industry_code=matched_arch["industry_code"],
        location_code=loc_code,
        years_of_experience=years,
        work_mode=nlp_parsed["work_mode"],
        skill_names=skills_found,
    )
    gap_res = ml_engine.analyze_skill_gap(
        db=db,
        target_role=effective_role,
        current_skills=skills_found,
        experience_years=years,
        target_location=detected_loc,
    )

    # =========================================================================
    # TÍNH ĐIỂM 4 TRỤ CỘT CHUẨN ATS & HR (TỔNG 100 ĐIỂM)
    # =========================================================================
    # 1. Trụ cột Kỹ năng chuyên môn (Tối đa 40 điểm)
    core_match_ratio = gap_res["readiness_score_pct"] / 100.0
    extra_skills_bonus = min(6.0, max(0, len(skills_found) - len(gap_res["matched_skills"])) * 2.0)
    max_skill_cap = 40 if core_match_ratio >= 0.99 and len(skills_found) >= 8 else 38
    skills_score_40 = min(max_skill_cap, int(round(core_match_ratio * 32.0 + extra_skills_bonus)))

    # 2. Trụ cột Kinh nghiệm & Dự án thực tế (Tối đa 25 điểm)
    exp_score_25 = 12
    if ats_inspection["has_experience_or_projects"]:
        exp_score_25 += 6
    if years >= 3.0:
        exp_score_25 += 7
    elif years >= 1.5:
        exp_score_25 += 5
    elif years >= 0.5 or len(skills_found) >= 3:
        exp_score_25 += 4
    exp_score_25 = min(25, exp_score_25)

    # 3. Trụ cột Minh chứng định lượng (Tối đa 20 điểm)
    impact_score_20 = ats_inspection["impact_score_20"]

    # 4. Trụ cột Cấu trúc ATS & Độ hoàn thiện (Tối đa 15 điểm)
    structure_score_15 = ats_inspection["structure_score_15"]

    # Đảm bảo Tổng điểm luôn bằng ĐÚNG tổng 4 trụ cột (nhất quán toán học 100%)
    total_profile_score = max(
        18,
        min(100, skills_score_40 + exp_score_25 + impact_score_20 + structure_score_15),
    )

    if total_profile_score >= 80:
        verdict_label = "Xuất sắc — Sẵn sàng vượt vòng lọc CV & phỏng vấn"
        verdict_tier = "EXCELLENT"
    elif total_profile_score >= 65:
        verdict_label = "Khá tốt — Nền tảng vững, cần bổ sung thêm số liệu thành tựu"
        verdict_tier = "GOOD"
    elif total_profile_score >= 50:
        verdict_label = "Tiềm năng — Cần bổ sung kỹ năng cốt lõi & mô tả dự án chi tiết hơn"
        verdict_tier = "FAIR"
    else:
        verdict_label = "Cần hoàn thiện — Hồ sơ còn sơ sài hoặc lệch kỹ năng so với vị trí mục tiêu"
        verdict_tier = "NEEDS_WORK"

    total_core_skills = max(1, len(gap_res["matched_skills"]) + len(gap_res["missing_skills"]))

    rubric_breakdown = [
        {
            "criterion": "Độ khớp Kỹ năng Chuyên môn (ESCO)",
            "score": skills_score_40,
            "max_score": 40,
            "status": "Tốt" if skills_score_40 >= 28 else ("Khá" if skills_score_40 >= 20 else "Thiếu hụt"),
            "comment": (
                f"Đáp ứng {len(gap_res['matched_skills'])}/{total_core_skills} kỹ năng cốt lõi của vị trí {effective_role} "
                f"(Tổng cộng nhận diện {len(skills_found)} kỹ năng chuyên môn trong CV)."
            ),
        },
        {
            "criterion": "Chiều sâu Kinh nghiệm & Dự án thực tế",
            "score": exp_score_25,
            "max_score": 25,
            "status": "Tốt" if exp_score_25 >= 20 else ("Khá" if exp_score_25 >= 15 else "Cần bổ sung"),
            "comment": (
                f"Phân loại cấp bậc: {nlp_parsed['experience_level']} (~{years} năm kinh nghiệm). "
                + (
                    "Đã mô tả kinh nghiệm/dự án thực tế."
                    if ats_inspection["has_experience_or_projects"]
                    else "Chưa nêu rõ tên dự án hoặc sản phẩm thực tế đã triển khai."
                )
            ),
        },
        {
            "criterion": "Minh chứng Định lượng & Thành tựu (Impact)",
            "score": impact_score_20,
            "max_score": 20,
            "status": "Tốt" if impact_score_20 >= 14 else ("Trung bình" if impact_score_20 >= 8 else "Yếu"),
            "comment": (
                f"Phát hiện {ats_inspection['quantified_metrics_count']} chỉ số đo lường kết quả và "
                f"{ats_inspection['action_verbs_count']} động từ hành động chuyên môn."
            ),
        },
        {
            "criterion": "Chuẩn cấu trúc ATS & Độ hoàn thiện CV",
            "score": structure_score_15,
            "max_score": 15,
            "status": "Đạt chuẩn" if structure_score_15 >= 11 else "Cần bổ sung",
            "comment": (
                f"Độ dài {ats_inspection['word_count']} từ; kiểm tra các mục Liên hệ, Học vấn, Dự án và Chứng chỉ."
            ),
        },
    ]

    # Phân tích Điểm mạnh & Điểm cần cải thiện thực tế
    strengths: List[str] = []
    improvements: List[str] = []

    if len(gap_res["matched_skills"]) >= 3:
        strengths.append(
            f"Sở hữu tổ hợp kỹ năng cốt lõi rất sát với nhu cầu tuyển dụng vị trí {effective_role}: {', '.join(gap_res['matched_skills'][:5])}."
        )
    elif len(skills_found) >= 1:
        strengths.append(
            f"Đã trang bị các kỹ năng nền tảng ({', '.join(skills_found[:4])}), làm cơ sở tốt để phát triển lên vị trí {effective_role}."
        )

    if ats_inspection["has_cert_or_language"]:
        strengths.append("Có đề cập năng lực ngoại ngữ / chứng chỉ chuyên môn — giúp tăng lợi thế cạnh tranh khoảng 12–15% khi xét duyệt lương.")
    if ats_inspection["quantified_metrics_count"] >= 2:
        strengths.append("Biết cách sử dụng con số định lượng để chứng minh năng lực và kết quả công việc.")
    if ats_inspection["has_experience_or_projects"]:
        strengths.append("Có kinh nghiệm làm việc hoặc dự án thực tế giúp nhà tuyển dụng đánh giá được khả năng làm việc thật.")

    if not strengths:
        strengths.append("Đã xác định được từ khóa chuyên ngành ban đầu nhưng cần trình bày chi tiết hơn.")

    if gap_res["recommended_roadmap"]:
        missing_names = [m["skill_name"] for m in gap_res["recommended_roadmap"][:3]]
        improvements.append(
            f"Bổ sung các từ khóa kỹ năng đang được săn đón cho vị trí {effective_role}: {', '.join(missing_names)} (vào mục Kỹ năng hoặc Mô tả dự án)."
        )
    if ats_inspection["quantified_metrics_count"] < 2:
        improvements.append(
            "Tránh chỉ liệt kê nhiệm vụ ('Tham gia làm web, viết API'). Hãy thêm con số đo lường kết quả ('Xây dựng 15 RESTful API bằng FastAPI, rút ngắn 35% thời gian phản hồi truy vấn PostgreSQL')."
        )
    if not (ats_inspection["has_email"] or ats_inspection["has_phone"]):
        improvements.append(
            "Bổ sung đầy đủ Email chuyên nghiệp, Số điện thoại và liên kết GitHub / LinkedIn ở phần đầu CV để vượt qua bộ lọc ATS tự động."
        )
    if not ats_inspection["has_education"]:
        improvements.append(
            "Ghi rõ mục Học vấn (Trường đại học, Chuyên ngành đào tạo, năm tốt nghiệp hoặc điểm GPA/đồ án tiêu biểu)."
        )
    if ats_inspection["word_count"] < 60:
        improvements.append(
            f"Nội dung CV hiện tại khá ngắn ({ats_inspection['word_count']} từ). Một CV tiêu chuẩn nên dài khoảng 250 – 500 từ, trình bày rõ ít nhất 2 – 3 dự án hoặc kinh nghiệm thực tế."
        )

    star_rewrite_examples = [
        {
            "before": "Tham gia phát triển Backend bằng Python và cơ sở dữ liệu SQL cho dự án của nhóm.",
            "after": "Thiết kế và triển khai 12 RESTful API bằng Python (FastAPI) kết hợp tối ưu truy vấn PostgreSQL, giúp xử lý 10.000+ bản ghi dữ liệu và giảm 40% độ trễ phản hồi.",
        },
        {
            "before": "Sử dụng GIS và Power BI để làm báo cáo dữ liệu môi trường.",
            "after": "Ứng dụng ArcGIS/QGIS và Python tự động hóa quy trình phân tích không gian trên 8 tỉnh/thành, trực quan hóa dashboard Power BI phục vụ đánh giá chỉ số phát triển bền vững ESG.",
        },
    ]

    all_jobs = db.query(JobPosting).options(joinedload(JobPosting.skill_links)).limit(150).all()
    all_skills_map = {s.id: s.name for s in db.query(SkillESCO).all()}
    all_locs_map = {l.id: l.name for l in db.query(Location).all()}

    scored_jobs = []
    skill_set = set(skills_found)
    for j in all_jobs:
        j_skills = {all_skills_map.get(lk.skill_id, "") for lk in j.skill_links}
        overlap = len(skill_set.intersection(j_skills))
        role_bonus = 2 if j.normalized_title == effective_role else 0
        if overlap > 0 or role_bonus > 0:
            scored_jobs.append((overlap + role_bonus, max(1, overlap), max(1, len(j_skills)), j))

    scored_jobs.sort(key=lambda x: (x[0], x[3].salary_avg_vnd), reverse=True)
    top_matched_jobs = [
        {
            "job_code": item[3].job_code,
            "title": item[3].title,
            "company_name": item[3].company_name,
            "location_name": all_locs_map.get(item[3].location_id, detected_loc),
            "salary_range": f"{item[3].salary_min_vnd} – {item[3].salary_max_vnd} triệu VNĐ",
            "matched_skills_count": item[1],
            "match_pct": min(98, int(round((item[1] / item[2]) * 100))),
        }
        for item in scored_jobs[:4]
    ]

    rec_range = f"{sal_pred['salary_range_p25_p75'][0]} – {sal_pred['salary_range_p25_p75'][1]} triệu VNĐ/tháng"
    summary_text = (
        f"Kết quả thẩm định theo quy trình ATS & HR tại {detected_loc}: Hồ sơ đạt {total_profile_score}/100 điểm ({verdict_label}) "
        f"cho vị trí {effective_role} (cấp bậc {nlp_parsed['experience_level']}, ~{years} năm kinh nghiệm). "
        f"Ứng viên đã đáp ứng {len(gap_res['matched_skills'])}/{total_core_skills} kỹ năng cốt lõi "
        f"({', '.join(skills_found[:5]) or 'Cơ bản'}), mức thu nhập đàm phán khuyến nghị từ {rec_range}."
    )

    return {
        "profile_score": total_profile_score,
        "verdict_label": verdict_label,
        "verdict_tier": verdict_tier,
        "inferred_role": inferred_role,
        "recommended_role": effective_role,
        "detected_location": detected_loc,
        "experience_level": nlp_parsed["experience_level"],
        "years_of_experience": years,
        "evaluation_summary": summary_text,
        "rubric_breakdown": rubric_breakdown,
        "ats_checklist": ats_inspection["sections_checklist"],
        "strengths": strengths,
        "improvements": improvements,
        "star_rewrite_examples": star_rewrite_examples,
        "document_metrics": {
            "word_count": ats_inspection["word_count"],
            "extracted_skills_count": len(skills_found),
            "quantified_metrics_count": ats_inspection["quantified_metrics_count"],
        },
        "salary_valuation": {
            "predicted_avg_vnd": sal_pred["predicted_salary_avg_vnd"],
            "recommended_negotiation_range": rec_range,
            "potential_upside_vnd": gap_res["salary_upside_vnd"],
        },
        "matched_skills": gap_res["matched_skills"],
        "all_extracted_skills": nlp_parsed["extracted_skills"],
        "missing_recommended_skills": gap_res["recommended_roadmap"],
        "top_matched_jobs": top_matched_jobs,
    }
