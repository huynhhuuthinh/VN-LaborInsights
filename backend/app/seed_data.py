"""
Bộ dữ liệu Thực nghiệm Thị trường Lao động Việt Nam 2025 - 2026
Tham chiếu số liệu:
- Cục Thống kê (NSO) - Thông cáo lao động việc làm Quý II & 6 tháng đầu năm 2026
- Viện Khoa học Tổ chức nhà nước và Lao động (ISOS) - Bộ Nội vụ
- Tổ chức Lao động Quốc tế (ILO) - Báo cáo GenAI và việc làm tại Việt Nam
- Khung phân loại Kỹ năng Châu Âu ESCO & Báo cáo TopCV / JobsGO 2025-2026
"""
import random
import numpy as np
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from .models import (
    Industry,
    Location,
    SkillESCO,
    Company,
    MarketMonthlySnapshot,
    JobPosting,
    JobSkill,
    ETLPipelineRun,
)

INDUSTRIES_DATA = [
    {
        "code": "IND-IT",
        "name_vi": "Công nghệ Thông tin, Phần mềm & AI",
        "name_en": "Information Technology, Software & AI",
        "sector": "Kinh tế Số (Digital Economy)",
        "growth_rate_yoy": 18.4,
        "ai_exposure_score": 78.5,
        "description": "Phát triển phần mềm, Trí tuệ nhân tạo, Khoa học dữ liệu, An ninh mạng và Điện toán đám mây."
    },
    {
        "code": "IND-ENV",
        "name_vi": "Tin học Tài nguyên, Môi trường, GIS & Năng lượng Xanh",
        "name_en": "Environmental Informatics, GIS, Remote Sensing & Green Energy",
        "sector": "Kinh tế Xanh & Tài nguyên (Green & ESG)",
        "growth_rate_yoy": 21.2,
        "ai_exposure_score": 64.0,
        "description": "Hệ thống thông tin địa lý (GIS), Viễn thám, Quản lý tài nguyên môi trường, Kiểm kê khí nhà kính ESG & Năng lượng tái tạo."
    },
    {
        "code": "IND-FIN",
        "name_vi": "Tài chính, Ngân hàng, Fintech & Bảo hiểm",
        "name_en": "Banking, Financial Services, Fintech & Insurance",
        "sector": "Tài chính & Dịch vụ Cao cấp",
        "growth_rate_yoy": 11.6,
        "ai_exposure_score": 72.0,
        "description": "Ngân hàng số, Phân tích rủi ro tín dụng, Định lượng tài chính, Thanh toán điện tử và Kiểm toán."
    },
    {
        "code": "IND-MFG",
        "name_vi": "Sản xuất Công nghiệp, Tự động hóa & Bán dẫn",
        "name_en": "Smart Manufacturing, Automation & Semiconductor",
        "sector": "Công nghiệp & Chế biến Chế tạo",
        "growth_rate_yoy": 15.8,
        "ai_exposure_score": 42.5,
        "description": "Kỹ thuật điều khiển tự động hóa, Thiết kế vi mạch bán dẫn, Quản lý chất lượng QA/QC, R&D công nghiệp."
    },
    {
        "code": "IND-ECOM",
        "name_vi": "Thương mại Điện tử, Digital Marketing & Truyền thông",
        "name_en": "E-Commerce, Growth Marketing & Digital Media",
        "sector": "Kinh tế Số (Digital Economy)",
        "growth_rate_yoy": 14.3,
        "ai_exposure_score": 69.0,
        "description": "Vận hành sàn TMĐT, Phân tích dữ liệu tiếp thị, SEO/SEM, Sáng tạo nội dung đa phương tiện."
    },
    {
        "code": "IND-LOG",
        "name_vi": "Logistics, Chuỗi cung ứng & Xuất nhập khẩu",
        "name_en": "Logistics, Supply Chain & International Trade",
        "sector": "Thương mại & Logistics",
        "growth_rate_yoy": 13.1,
        "ai_exposure_score": 48.0,
        "description": "Hoạch định chuỗi cung ứng, Quản trị kho vận thông minh, Hải quan và Vận tải quốc tế."
    },
    {
        "code": "IND-EDU",
        "name_vi": "Giáo dục Công nghệ (EdTech), Y tế Số & Dịch vụ Công",
        "name_en": "EdTech, Digital Healthcare & Public Services",
        "sector": "Dịch vụ Xã hội & Đổi mới Sáng tạo",
        "growth_rate_yoy": 9.8,
        "ai_exposure_score": 56.5,
        "description": "Hệ thống đào tạo trực tuyến, Tin học y sinh, Quản trị nhân sự số và Hành chính công."
    }
]

LOCATIONS_DATA = [
    {
        "code": "VN-SG",
        "name": "TP. Hồ Chí Minh",
        "region": "Đông Nam Bộ",
        "economic_zone": "Vùng kinh tế trọng điểm phía Nam",
        "latitude": 10.7769,
        "longitude": 106.7009,
        "avg_cost_of_living_index": 1.18,
        "industrial_parks_count": 19
    },
    {
        "code": "VN-HN",
        "name": "Hà Nội",
        "region": "Đồng bằng Sông Hồng",
        "economic_zone": "Vùng kinh tế trọng điểm Bắc Bộ",
        "latitude": 21.0285,
        "longitude": 105.8542,
        "avg_cost_of_living_index": 1.14,
        "industrial_parks_count": 14
    },
    {
        "code": "VN-DN",
        "name": "Đà Nẵng",
        "region": "Bắc Trung Bộ & Duyên hải miền Trung",
        "economic_zone": "Vùng kinh tế trọng điểm miền Trung",
        "latitude": 16.0544,
        "longitude": 108.2022,
        "avg_cost_of_living_index": 0.96,
        "industrial_parks_count": 8
    },
    {
        "code": "VN-BD",
        "name": "Bình Dương",
        "region": "Đông Nam Bộ",
        "economic_zone": "Vùng kinh tế trọng điểm phía Nam",
        "latitude": 10.9804,
        "longitude": 106.6519,
        "avg_cost_of_living_index": 0.98,
        "industrial_parks_count": 29
    },
    {
        "code": "VN-BN",
        "name": "Bắc Ninh",
        "region": "Đồng bằng Sông Hồng",
        "economic_zone": "Hành lang Công nghệ cao Bắc Bộ",
        "latitude": 21.1861,
        "longitude": 106.0763,
        "avg_cost_of_living_index": 0.94,
        "industrial_parks_count": 16
    },
    {
        "code": "VN-DNA",
        "name": "Đồng Nai",
        "region": "Đông Nam Bộ",
        "economic_zone": "Vùng kinh tế trọng điểm phía Nam",
        "latitude": 10.9574,
        "longitude": 106.8427,
        "avg_cost_of_living_index": 0.95,
        "industrial_parks_count": 31
    },
    {
        "code": "VN-HP",
        "name": "Hải Phòng",
        "region": "Đồng bằng Sông Hồng",
        "economic_zone": "Tam giác kinh tế Hà Nội - Hải Phòng - Quảng Ninh",
        "latitude": 20.8449,
        "longitude": 106.6881,
        "avg_cost_of_living_index": 0.97,
        "industrial_parks_count": 14
    },
    {
        "code": "VN-CT",
        "name": "Cần Thơ",
        "region": "Đồng bằng Sông Cửu Long",
        "economic_zone": "Trung tâm Kinh tế & Sinh thái ĐBSCL",
        "latitude": 10.0452,
        "longitude": 105.7469,
        "avg_cost_of_living_index": 0.89,
        "industrial_parks_count": 7
    }
]

SKILLS_ESCO_DATA = [
    # Digital & AI Skills
    {"esco_code": "ESCO.S1.01", "name": "Python", "name_vi": "Lập trình Python & Xử lý dữ liệu", "category": "Digital & AI", "subcategory": "Programming & Data", "demand_growth_yoy": 28.5, "salary_premium_pct": 18.0, "is_emerging": True},
    {"esco_code": "ESCO.S1.02", "name": "FastAPI / RESTful API", "name_vi": "Thiết kế kiến trúc FastAPI & Microservices", "category": "Digital & AI", "subcategory": "Backend Engineering", "demand_growth_yoy": 31.2, "salary_premium_pct": 16.5, "is_emerging": True},
    {"esco_code": "ESCO.S1.03", "name": "React / TypeScript", "name_vi": "Phát triển giao diện React & TypeScript", "category": "Digital & AI", "subcategory": "Frontend Engineering", "demand_growth_yoy": 19.4, "salary_premium_pct": 14.0, "is_emerging": False},
    {"esco_code": "ESCO.S1.04", "name": "PostgreSQL / SQL", "name_vi": "Quản trị & Tối ưu CSDL Quan hệ PostgreSQL", "category": "Digital & AI", "subcategory": "Database Management", "demand_growth_yoy": 17.8, "salary_premium_pct": 13.5, "is_emerging": False},
    {"esco_code": "ESCO.S1.05", "name": "Machine Learning (Scikit-learn)", "name_vi": "Học máy & Mô hình dự báo Scikit-learn", "category": "Digital & AI", "subcategory": "Artificial Intelligence", "demand_growth_yoy": 36.4, "salary_premium_pct": 26.0, "is_emerging": True},
    {"esco_code": "ESCO.S1.06", "name": "Vietnamese NLP / LLM", "name_vi": "Xử lý ngôn ngữ tự nhiên Tiếng Việt & GenAI", "category": "Digital & AI", "subcategory": "Artificial Intelligence", "demand_growth_yoy": 44.8, "salary_premium_pct": 31.0, "is_emerging": True},
    {"esco_code": "ESCO.S1.07", "name": "Data Engineering & ETL", "name_vi": "Kỹ thuật dữ liệu lớn, Web Scraping & ETL", "category": "Digital & AI", "subcategory": "Data Infrastructure", "demand_growth_yoy": 27.1, "salary_premium_pct": 21.5, "is_emerging": True},
    {"esco_code": "ESCO.S1.08", "name": "Cloud & Docker / Kubernetes", "name_vi": "Điện toán đám mây AWS/GCP & Container hóa", "category": "Digital & AI", "subcategory": "DevOps & Cloud", "demand_growth_yoy": 24.6, "salary_premium_pct": 22.0, "is_emerging": True},
    {"esco_code": "ESCO.S1.09", "name": "Power BI / Tableau", "name_vi": "Trực quan hóa dữ liệu & Business Intelligence", "category": "Digital & AI", "subcategory": "Data Analytics", "demand_growth_yoy": 21.0, "salary_premium_pct": 12.5, "is_emerging": False},
    {"esco_code": "ESCO.S1.10", "name": "Cybersecurity & DevSecOps", "name_vi": "An toàn thông tin & Bảo mật hệ thống", "category": "Digital & AI", "subcategory": "Security", "demand_growth_yoy": 29.3, "salary_premium_pct": 25.0, "is_emerging": True},

    # Green & ESG Skills (Đặc thù Tin học Tài nguyên & Môi trường)
    {"esco_code": "ESCO.G2.01", "name": "ArcGIS / QGIS & Spatial Analysis", "name_vi": "Hệ thống thông tin địa lý GIS & Phân tích không gian", "category": "Green & ESG", "subcategory": "Geospatial Informatics", "demand_growth_yoy": 26.8, "salary_premium_pct": 17.5, "is_emerging": True},
    {"esco_code": "ESCO.G2.02", "name": "Remote Sensing & Satellite Data", "name_vi": "Viễn thám & Xử lý ảnh vệ tinh tài nguyên", "category": "Green & ESG", "subcategory": "Geospatial Informatics", "demand_growth_yoy": 24.2, "salary_premium_pct": 19.0, "is_emerging": True},
    {"esco_code": "ESCO.G2.03", "name": "Carbon Accounting & ESG Reporting", "name_vi": "Kiểm kê khí nhà kính (ISO 14064) & Báo cáo ESG", "category": "Green & ESG", "subcategory": "Sustainability", "demand_growth_yoy": 39.5, "salary_premium_pct": 23.5, "is_emerging": True},
    {"esco_code": "ESCO.G2.04", "name": "Environmental Monitoring IoT", "name_vi": "Quan trắc môi trường tự động & Cảm biến IoT", "category": "Green & ESG", "subcategory": "Environmental Tech", "demand_growth_yoy": 22.4, "salary_premium_pct": 16.0, "is_emerging": True},

    # Technical / Hard Skills
    {"esco_code": "ESCO.T3.01", "name": "ERP / SAP & Supply Chain", "name_vi": "Vận hành hệ thống hoạch định ERP / SAP", "category": "Technical / Hard Skill", "subcategory": "Enterprise Systems", "demand_growth_yoy": 14.5, "salary_premium_pct": 15.0, "is_emerging": False},
    {"esco_code": "ESCO.T3.02", "name": "Financial Risk Modeling", "name_vi": "Mô hình hóa rủi ro tài chính & Định lượng", "category": "Technical / Hard Skill", "subcategory": "Finance & Audit", "demand_growth_yoy": 16.2, "salary_premium_pct": 20.5, "is_emerging": False},
    {"esco_code": "ESCO.T3.03", "name": "PLC / SCADA & Semiconductor IC", "name_vi": "Tự động hóa PLC/SCADA & Thiết kế vi mạch", "category": "Technical / Hard Skill", "subcategory": "Industrial Engineering", "demand_growth_yoy": 25.7, "salary_premium_pct": 21.0, "is_emerging": True},
    {"esco_code": "ESCO.T3.04", "name": "Digital Performance & SEO/SEM", "name_vi": "Tối ưu hóa chuyển đổi số & Growth Marketing", "category": "Technical / Hard Skill", "subcategory": "Digital Commerce", "demand_growth_yoy": 15.1, "salary_premium_pct": 10.5, "is_emerging": False},

    # Soft & Management Skills
    {"esco_code": "ESCO.M4.01", "name": "Agile / Scrum Project Management", "name_vi": "Quản trị dự án linh hoạt Agile / Scrum", "category": "Soft & Management", "subcategory": "Leadership", "demand_growth_yoy": 18.0, "salary_premium_pct": 14.5, "is_emerging": False},
    {"esco_code": "ESCO.M4.02", "name": "English / Bilingual Communication", "name_vi": "Giao tiếp ngoại ngữ chuyên ngành (IELTS/TOEIC)", "category": "Soft & Management", "subcategory": "Communication", "demand_growth_yoy": 16.8, "salary_premium_pct": 19.5, "is_emerging": False},
    {"esco_code": "ESCO.M4.03", "name": "Analytical & Critical Thinking", "name_vi": "Tư duy phân tích dữ liệu & Giải quyết vấn đề", "category": "Soft & Management", "subcategory": "Cognitive Skills", "demand_growth_yoy": 19.2, "salary_premium_pct": 11.0, "is_emerging": False},
]

ROLE_ARCHETYPES = [
    {
        "normalized_title": "Kỹ sư Phần mềm (Backend/Fullstack)",
        "titles": [
            "Backend Developer (Python / FastAPI / PostgreSQL)",
            "Fullstack Software Engineer (Python & ReactJS)",
            "Senior Python Backend Engineer (Microservices)",
            "Kỹ sư Phát triển Phần mềm Web Fullstack"
        ],
        "industry_code": "IND-IT",
        "base_salary": 22.0,
        "core_skills": ["Python", "FastAPI / RESTful API", "React / TypeScript", "PostgreSQL / SQL", "Cloud & Docker / Kubernetes", "Agile / Scrum Project Management"],
    },
    {
        "normalized_title": "Kỹ sư AI, NLP & Khoa học Dữ liệu",
        "titles": [
            "AI / NLP Engineer (Xử lý ngôn ngữ tự nhiên Tiếng Việt)",
            "Data Scientist (Machine Learning & Predictive Modeling)",
            "Kỹ sư Trí tuệ nhân tạo & Mô hình Ngôn ngữ Lớn (LLM)",
            "Chuyên viên Phân tích & Khoa học Dữ liệu (Python/Scikit-learn)"
        ],
        "industry_code": "IND-IT",
        "base_salary": 26.0,
        "core_skills": ["Python", "Machine Learning (Scikit-learn)", "Vietnamese NLP / LLM", "Data Engineering & ETL", "PostgreSQL / SQL", "English / Bilingual Communication"],
    },
    {
        "normalized_title": "Kỹ sư Dữ liệu (Data Engineer & ETL)",
        "titles": [
            "Data Engineer (Python / ETL Pipeline / PostgreSQL)",
            "Big Data & Web Scraping Specialist",
            "Kỹ sư Tích hợp và Chuẩn hóa Dữ liệu (Data Platform)",
            "BI & Data Warehouse Engineer"
        ],
        "industry_code": "IND-IT",
        "base_salary": 24.0,
        "core_skills": ["Python", "Data Engineering & ETL", "PostgreSQL / SQL", "Cloud & Docker / Kubernetes", "Power BI / Tableau", "Analytical & Critical Thinking"],
    },
    {
        "normalized_title": "Chuyên gia Tin học Môi trường, GIS & Viễn thám",
        "titles": [
            "Chuyên viên Phân tích Dữ liệu Không gian GIS & Viễn thám",
            "Kỹ sư Tin học Tài nguyên & Môi trường (Python / ArcGIS)",
            "Chuyên viên Quản lý Dữ liệu Quan trắc Môi trường IoT",
            "GIS Software Developer (WebGIS / PostGIS / React)"
        ],
        "industry_code": "IND-ENV",
        "base_salary": 16.0,
        "core_skills": ["ArcGIS / QGIS & Spatial Analysis", "Remote Sensing & Satellite Data", "Python", "PostgreSQL / SQL", "Environmental Monitoring IoT", "Analytical & Critical Thinking"],
    },
    {
        "normalized_title": "Chuyên gia Phân tích ESG & Chuyển đổi Xanh",
        "titles": [
            "Chuyên viên Kiểm kê Khí nhà kính & Báo cáo Phát triển Bền vững ESG",
            "ESG Data Analyst & Net-Zero Consultant",
            "Kỹ sư Quản lý Môi trường & Năng lượng Tái tạo",
            "Chuyên viên Phân tích Dữ liệu Tác động Môi trường"
        ],
        "industry_code": "IND-ENV",
        "base_salary": 17.0,
        "core_skills": ["Carbon Accounting & ESG Reporting", "Environmental Monitoring IoT", "Power BI / Tableau", "English / Bilingual Communication", "Analytical & Critical Thinking"],
    },
    {
        "normalized_title": "Chuyên viên Phân tích Dữ liệu Kinh doanh & Tài chính (BA/DA)",
        "titles": [
            "Financial Data Analyst (SQL / Python / Power BI)",
            "Business Intelligence Analyst (Fintech & Banking)",
            "Chuyên viên Phân tích Nghiệp vụ & Dữ liệu Ngân hàng số",
            "Chuyên viên Mô hình hóa Rủi ro Tín dụng (Risk Analyst)"
        ],
        "industry_code": "IND-FIN",
        "base_salary": 18.0,
        "core_skills": ["Financial Risk Modeling", "PostgreSQL / SQL", "Power BI / Tableau", "Python", "Analytical & Critical Thinking", "English / Bilingual Communication"],
    },
    {
        "normalized_title": "Kỹ sư Tự động hóa, IoT & Bán dẫn",
        "titles": [
            "Kỹ sư Tự động hóa Công nghiệp (PLC / SCADA / IoT)",
            "Kỹ sư Thiết kế Vi mạch Bán dẫn & Hệ thống Nhúng",
            "Smart Factory Data & Automation Engineer",
            "Kỹ sư R&D Điện tử & Điều khiển Thông minh"
        ],
        "industry_code": "IND-MFG",
        "base_salary": 18.0,
        "core_skills": ["PLC / SCADA & Semiconductor IC", "Environmental Monitoring IoT", "Python", "ERP / SAP & Supply Chain", "English / Bilingual Communication"],
    },
    {
        "normalized_title": "Chuyên viên Thương mại Điện tử & Growth Marketing",
        "titles": [
            "E-Commerce Data & Growth Specialist",
            "Digital Performance Marketing Analyst",
            "Quản trị Vận hành Sàn Thương mại Điện tử Đa kênh",
            "MarTech & Customer Data Platform (CDP) Specialist"
        ],
        "industry_code": "IND-ECOM",
        "base_salary": 14.0,
        "core_skills": ["Digital Performance & SEO/SEM", "Power BI / Tableau", "Analytical & Critical Thinking", "Agile / Scrum Project Management"],
    },
    {
        "normalized_title": "Chuyên viên Chuỗi cung ứng & Logistics Thông minh",
        "titles": [
            "Supply Chain & ERP Data Coordinator",
            "Chuyên viên Hoạch định Chuỗi cung ứng & Kho vận Số",
            "Logistics Operations & Data Analyst",
            "Chuyên viên Quản trị Mua hàng & Xuất nhập khẩu Quốc tế"
        ],
        "industry_code": "IND-LOG",
        "base_salary": 14.0,
        "core_skills": ["ERP / SAP & Supply Chain", "Power BI / Tableau", "English / Bilingual Communication", "Analytical & Critical Thinking"],
    },
    {
        "normalized_title": "Kỹ sư An toàn Thông tin & Điện toán Đám mây",
        "titles": [
            "Cloud Security & DevSecOps Engineer",
            "Chuyên viên Bảo mật Hệ thống & An ninh mạng SOC",
            "System & Cloud Infrastructure Engineer (Docker/K8s)",
            "Kỹ sư Vận hành Hệ thống Dữ liệu Đám mây"
        ],
        "industry_code": "IND-IT",
        "base_salary": 25.0,
        "core_skills": ["Cybersecurity & DevSecOps", "Cloud & Docker / Kubernetes", "Python", "PostgreSQL / SQL", "English / Bilingual Communication"],
    },
    {
        "normalized_title": "Chuyên viên Công nghệ Giáo dục & Quản trị Hệ thống Công",
        "titles": [
            "EdTech Product & Learning Data Analyst",
            "Chuyên viên Chuyển đổi số Hành chính & Đô thị Thông minh",
            "Kỹ sư Hệ thống Thông tin Y tế & Giáo dục Số"
        ],
        "industry_code": "IND-EDU",
        "base_salary": 13.0,
        "core_skills": ["React / TypeScript", "PostgreSQL / SQL", "Power BI / Tableau", "Agile / Scrum Project Management", "Analytical & Critical Thinking"],
    }
]

COMPANIES_POOL = [
    ("FPT Software", "1000+ nhân sự"),
    ("Viettel AI & Data Services", "1000+ nhân sự"),
    ("VNG Corporation", "1000+ nhân sự"),
    ("VNPT Information Technology", "1000+ nhân sự"),
    ("Tập đoàn Công nghiệp - Năng lượng Quốc gia", "1000+ nhân sự"),
    ("Trung tâm Viễn thám & GIS Nam Bộ", "100-499 nhân sự"),
    ("Viện Khoa học Khí tượng Thủy văn & Biến đổi Khí hậu", "100-499 nhân sự"),
    ("GreenTech ESG Vietnam Solutions", "50-99 nhân sự"),
    ("Techcombank Digital Banking", "1000+ nhân sự"),
    ("ACB Data & Analytics Hub", "1000+ nhân sự"),
    ("MoMo Financial Technology", "500-999 nhân sự"),
    ("Shopee Vietnam E-Commerce", "1000+ nhân sự"),
    ("Bosch Global Software Technologies VN", "1000+ nhân sự"),
    ("Intel Products Vietnam", "1000+ nhân sự"),
    ("Samsung R&D Center Vietnam", "1000+ nhân sự"),
    ("Gemadept Smart Logistics", "500-999 nhân sự"),
    ("KMS Technology Vietnam", "500-999 nhân sự"),
    ("NasaGIS & Smart City Lab", "50-99 nhân sự"),
    ("EcoCarbon & Sustainability Advisory VN", "50-99 nhân sự"),
    ("CMC Global", "1000+ nhân sự")
]

PLATFORMS = [
    "TopCV",
    "VietnamWorks",
    "ITviec",
    "LinkedIn",
    "CareerViet",
    "JobsGO",
    "Glints",
    "Cổng GIS & ESG (MONRE)",
    "VINASA Tech",
    "Robert Walters"
]
WORK_MODES = ["On-site", "Hybrid", "Remote"]
EXPERIENCE_LEVELS = [
    ("Intern / Fresher", 0.5, 0.50),
    ("Junior (1-2 năm)", 1.5, 0.72),
    ("Mid-level (2-4 năm)", 3.0, 1.00),
    ("Senior (5+ năm)", 5.5, 1.45),
    ("Lead / Manager", 8.0, 1.90),
]

# Hệ số mặt bằng lương theo địa phương (tách biệt với chỉ số giá sinh hoạt SCOLI).
# Trước đây lương bị nhân trực tiếp với chỉ số giá sinh hoạt rồi lại chia cho chính chỉ số đó
# khi tính sức mua, khiến PPP gần như bằng nhau giữa các tỉnh (đếm trùng).
REGIONAL_WAGE_FACTOR = {
    "VN-SG": 1.08,
    "VN-HN": 1.05,
    "VN-DN": 0.90,
    "VN-BD": 0.92,
    "VN-BN": 0.90,
    "VN-DNA": 0.88,
    "VN-HP": 0.90,
    "VN-CT": 0.82,
}

MONTHS_TIMELINE = [
    ("2025-11", date(2025, 11, 15), 0.82),
    ("2025-12", date(2025, 12, 15), 0.78),
    ("2026-01", date(2026, 1, 15), 0.86),
    ("2026-02", date(2026, 2, 15), 0.94),
    ("2026-03", date(2026, 3, 15), 1.05),
    ("2026-04", date(2026, 4, 15), 1.08),
    ("2026-05", date(2026, 5, 15), 1.04),
    ("2026-06", date(2026, 6, 15), 1.09),
    ("2026-07", date(2026, 7, 15), 1.12),
    ("2026-08", date(2026, 8, 15), 1.16),
    ("2026-09", date(2026, 9, 15), 1.21),
    ("2026-10", date(2026, 10, 15), 1.26),
]


def _ensure_3nf_companies_and_snapshots(db: Session):
    """
    Đảm bảo bảng companies (3NF) và market_monthly_snapshots (OLAP) luôn được khởi tạo đầy đủ.
    """
    if db.query(Company).count() == 0:
        for idx, (comp_name, comp_size) in enumerate(COMPANIES_POOL, start=1):
            norm_name = comp_name.lower().replace("corporation", "").replace("vietnam", "").strip()
            db.add(Company(
                code=f"COMP-{idx:03d}",
                name=comp_name,
                normalized_name=norm_name,
                company_size=comp_size,
                esg_compliance_score=round(76.0 + (idx % 18) * 1.1, 1)
            ))
        db.commit()

    if db.query(MarketMonthlySnapshot).count() == 0:
        all_jobs = db.query(JobPosting).all()
        month_groups = {}
        for j in all_jobs:
            month_groups.setdefault(j.posted_month, []).append(j.salary_avg_vnd)
        for m_key, sals in sorted(month_groups.items()):
            arr = np.array(sals, dtype=float)
            db.add(MarketMonthlySnapshot(
                month=m_key,
                industry_code="ALL",
                location_code="ALL",
                job_count=len(sals),
                avg_salary_vnd=round(float(np.mean(arr)), 1),
                p25_salary_vnd=round(float(np.percentile(arr, 25)), 1),
                p50_salary_vnd=round(float(np.median(arr)), 1),
                p75_salary_vnd=round(float(np.percentile(arr, 75)), 1),
                p90_salary_vnd=round(float(np.percentile(arr, 90)), 1),
            ))
        db.commit()



def seed_database_if_empty(db: Session):
    existing_count = db.query(JobPosting).count()
    if existing_count > 0:
        _ensure_3nf_companies_and_snapshots(db)
        return

    rng = random.Random(20261029)

    # 1. Seed Industries
    industry_map = {}
    for ind in INDUSTRIES_DATA:
        obj = Industry(**ind)
        db.add(obj)
        db.flush()
        industry_map[ind["code"]] = obj

    # 2. Seed Locations
    location_map = {}
    location_weights = []
    for loc in LOCATIONS_DATA:
        obj = Location(**loc)
        db.add(obj)
        db.flush()
        location_map[loc["code"]] = obj

    loc_codes = ["VN-SG", "VN-HN", "VN-DN", "VN-BD", "VN-BN", "VN-DNA", "VN-HP", "VN-CT"]
    loc_probs = [0.36, 0.28, 0.09, 0.08, 0.06, 0.05, 0.04, 0.04]

    # 3. Seed ESCO Skills
    skill_map = {}
    for sk in SKILLS_ESCO_DATA:
        obj = SkillESCO(**sk)
        db.add(obj)
        db.flush()
        skill_map[sk["name"]] = obj

    # 4. Seed Job Postings (960 bản ghi tuyển dụng thực nghiệm trải đều 12 tháng)
    job_counter = 1000
    for month_str, base_date, seasonal_factor in MONTHS_TIMELINE:
        monthly_target = int(78 * seasonal_factor)
        for _ in range(monthly_target):
            job_counter += 1
            archetype = rng.choices(
                ROLE_ARCHETYPES,
                weights=[18, 15, 13, 12, 9, 11, 8, 7, 6, 8, 5],
                k=1
            )[0]

            loc_code = rng.choices(loc_codes, weights=loc_probs, k=1)[0]
            loc_obj = location_map[loc_code]
            ind_obj = industry_map[archetype["industry_code"]]

            exp_label, exp_years, exp_mult = rng.choices(
                EXPERIENCE_LEVELS,
                weights=[22, 32, 28, 13, 5],
                k=1
            )[0]

            # Tính toán mức lương sát thực tế theo cấp bậc, địa phương và xu hướng tăng trưởng theo tháng
            trend_bonus = 1.0 + (MONTHS_TIMELINE.index((month_str, base_date, seasonal_factor)) * 0.008)
            noise = rng.uniform(0.91, 1.11)
            avg_sal = round(
                archetype["base_salary"] * exp_mult * REGIONAL_WAGE_FACTOR.get(loc_code, 1.0) * trend_bonus * noise,
                1
            )
            min_sal = round(max(6.0, avg_sal * rng.uniform(0.80, 0.88)), 1)
            max_sal = round(avg_sal * rng.uniform(1.14, 1.26), 1)

            company_name, company_size = rng.choice(COMPANIES_POOL)
            platform = rng.choices(PLATFORMS, weights=[22, 18, 14, 12, 9, 7, 5, 5, 4, 4], k=1)[0]
            work_mode = rng.choices(WORK_MODES, weights=[58, 32, 10], k=1)[0]
            title = rng.choice(archetype["titles"])

            # Chọn 3 - 5 kỹ năng từ core_skills của vị trí
            num_skills = rng.randint(3, min(5, len(archetype["core_skills"])))
            chosen_skill_names = rng.sample(archetype["core_skills"], num_skills)

            posted_day_offset = rng.randint(-12, 12)
            posted_dt = base_date + timedelta(days=posted_day_offset)

            jd_text = (
                f"Tuyển dụng vị trí {title} tại {company_name} ({loc_obj.name}). "
                f"Cấp bậc: {exp_label} ({exp_years} năm kinh nghiệm). "
                f"Yêu cầu kỹ năng chuyên môn chuẩn ESCO: {', '.join(chosen_skill_names)}. "
                f"Thu nhập hấp dẫn từ {min_sal} - {max_sal} triệu VNĐ/tháng, chế độ đãi ngộ chuẩn quốc tế."
            )

            job_obj = JobPosting(
                job_code=f"VNJOB-{job_counter}",
                title=title,
                normalized_title=archetype["normalized_title"],
                company_name=company_name,
                company_size=company_size,
                industry_id=ind_obj.id,
                location_id=loc_obj.id,
                experience_level=exp_label,
                years_of_experience=exp_years,
                education_level="Đại học" if exp_years >= 1 else "Cao đẳng / Đại học",
                work_mode=work_mode,
                salary_min_vnd=min_sal,
                salary_max_vnd=max_sal,
                salary_avg_vnd=avg_sal,
                currency="VND",
                source_platform=platform,
                source_url=f"https://{platform.lower()}.vn/viec-lam/vnjob-{job_counter}",
                posted_date=posted_dt,
                posted_month=month_str,
                description_raw=jd_text,
                data_quality_score=round(rng.uniform(0.91, 0.99), 2),
                is_verified=True,
            )
            db.add(job_obj)
            db.flush()

            for idx, sk_name in enumerate(chosen_skill_names):
                sk_obj = skill_map.get(sk_name)
                if sk_obj:
                    db.add(JobSkill(
                        job_id=job_obj.id,
                        skill_id=sk_obj.id,
                        importance_weight=1.0 if idx < 2 else 0.75,
                        is_mandatory=(idx < 3)
                    ))

    # 5. Seed ETL Pipeline Runs (Lịch sử chạy thu thập & làm sạch dữ liệu)
    etl_history = [
        ("ETL-202610-001", "TopCV Vietnam", 420, 48, 372, 1480, 142.5, "Thu thập & chuẩn hóa tin tuyển dụng nhóm CNTT, AI & Kinh tế số"),
        ("ETL-202610-002", "VietnamWorks", 315, 31, 284, 1120, 168.0, "Đồng bộ dữ liệu nhóm Tài chính, Sản xuất & Kỹ năng Xanh ESG"),
        ("ETL-202610-003", "JobsGO & CareerViet", 260, 29, 231, 895, 134.2, "Bóc tách NLP tiếng Việt cho tin tuyển dụng vùng Đông Nam Bộ & ĐBSCL"),
        ("ETL-202610-004", "ITviec & Chuyên trang GIS/Môi trường", 145, 12, 133, 560, 119.8, "Chuẩn hóa kỹ năng theo khung tham chiếu ESCO v1.2"),
    ]
    for idx, (code, src, crawled, dup, cleaned, sk_cnt, ms, note) in enumerate(etl_history):
        start_time = datetime.utcnow() - timedelta(days=(4 - idx), hours=3)
        db.add(ETLPipelineRun(
            run_code=code,
            source_platform=src,
            started_at=start_time,
            finished_at=start_time + timedelta(minutes=4, seconds=25),
            status="SUCCESS",
            records_crawled=crawled,
            records_duplicated=dup,
            records_cleaned=cleaned,
            skills_extracted=sk_cnt,
            avg_processing_ms=ms,
            notes=note
        ))

    db.commit()
    _ensure_3nf_companies_and_snapshots(db)


