# VN-LaborInsights — Hệ Thống Phân Tích và Đánh Giá Nhu Cầu Việc Làm Trên Thị Trường Việt Nam

> **Đồ án Chuyên ngành Tin học Tài nguyên và Môi trường**  
> **Trường Đại học Tài nguyên và Môi trường TP. Hồ Chí Minh — Khoa Công nghệ Thông tin**  
> - **Sinh viên thực hiện:** Huỳnh Quốc Huy (`1250080069`) — Lớp: `12_ĐH_THMT` — Khóa: `2023-2027`  
> - **Giảng viên hướng dẫn:** ThS. Đinh Thị Hồng Loan

---

## 1. Giới thiệu Tổng quan

**VN-LaborInsights** là hệ thống thu thập, xử lý chuẩn hóa (ETL), phân tích thống kê và dự báo nhu cầu việc làm, kỹ năng trên thị trường lao động Việt Nam dựa trên dữ liệu tin tuyển dụng trực tuyến kết hợp các khung tham chiếu quốc tế (**Cục Thống kê NSO 2026, Tổ chức Lao động Quốc tế ILO, OECD và Khung Phân loại Kỹ năng Châu Âu ESCO v1.2**).

### Các Phân hệ Chức năng Chính:
1. **Executive Dashboard (Tổng quan Vĩ mô & Dự báo):** Trực quan hóa số lượng việc làm, dải phân bổ lương (`P25 - Median - P75 - P90`), xu hướng biến động theo tháng kèm dự báo 4 tháng tiếp theo bằng mô hình học máy `scikit-learn`, và đánh giá mức độ ảnh hưởng của AI Tạo sinh (GenAI Exposure).
2. **Skill Intelligence (Phân tích Kỹ năng ESCO & Tiền lương):** Xếp hạng kỹ năng theo tần suất xuất hiện, ma trận tương quan giữa tốc độ tăng trưởng cầu (`YoY Growth %`) và mức phụ cấp tiền lương (`Salary Premium %`), tích hợp nhóm **Kỹ năng Xanh (Green & ESG / GIS / Viễn thám)**.
3. **Regional & Spatial Analysis (Phân tích Địa lý & Vùng Kinh tế):** So sánh nhu cầu nhân lực, mức lương danh nghĩa và sức mua thực tế (đã điều chỉnh chỉ số chi phí sinh hoạt COLI) tại TP.HCM, Hà Nội, Đà Nẵng, Bình Dương, Bắc Ninh, Đồng Nai, Hải Phòng, Cần Thơ.
4. **Job Repository Explorer (Tra cứu Dữ liệu Tuyển dụng Đã Làm sạch):** Công cụ tìm kiếm đa tiêu chí và kiểm tra chi tiết từng hồ sơ tin tuyển dụng sau khi bóc tách NLP.
5. **AI & Vietnamese NLP Studio (Phòng Thí nghiệm AI):**
   - **Bóc tách JD Tiếng Việt tự động:** Nhận diện chức danh chuẩn hóa, khoảng lương (VNĐ/USD), số năm kinh nghiệm và trích xuất kỹ năng ánh xạ chuẩn ESCO từ văn bản mô tả công việc thô.
   - **Dự báo Mức lương (`RandomForestRegressor`) & Tư vấn Khoảng cách Kỹ năng (`Skill Gap Advisor`):** Ước lượng mức lương công bằng và gợi ý lộ trình bổ sung kỹ năng.
   - **Trợ lý AI Phân tích Kinh tế Lao động:** Hỏi đáp thông minh trực tiếp trên số liệu thống kê thực tế của hệ thống.
6. **Web Scraping & ETL Pipeline Monitor:** Giám sát và kích hoạt trực tiếp quy trình thu thập dữ liệu (`BeautifulSoup4`), khử trùng lặp và chuẩn hóa CSDL.

---

## 2. Công nghệ Sử dụng (Tech Stack)

- **Ngôn ngữ & Xử lý dữ liệu:** `Python 3.13`, `Pandas`, `NumPy`, `Scikit-learn`, `BeautifulSoup4`
- **Backend RESTful API:** `FastAPI`, `SQLAlchemy 2.0`, `Pydantic v2`, `Uvicorn` (tài liệu OpenAPI tại `/docs`)
- **Cơ sở dữ liệu:** Thiết kế chuẩn 3NF trên **PostgreSQL 16** (`docker-compose.yml` + `database/init_schema.sql`), hỗ trợ cơ chế tự động chuyển đổi dự phòng sang **SQLite** cục bộ (`vn_labor_market.db`) để chạy độc lập ngay lập tức.
- **Frontend:** `React 18`, `TypeScript`, `Vite`, `Tailwind CSS`, `Recharts`, `Lucide Icons`

---

## 3. Hướng dẫn Khởi chạy Nhanh

### Bước 1: Khởi chạy Backend FastAPI (Cổng `8000`)
```powershell
cd d:\ĐACN2\backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
- Trang tài liệu Swagger UI kiểm thử API: http://127.0.0.1:8000/docs

### Bước 2: Khởi chạy Giao diện Web React (Cổng `5173`)
```powershell
cd d:\ĐACN2\frontend
npm install
npm run dev
```
- Truy cập hệ thống Web tại: http://localhost:5173

### Bước 3 (Tùy chọn): Chạy PostgreSQL bằng Docker
```powershell
cd d:\ĐACN2
docker compose up -d
```
- Chạy kiểm thử tự động toàn bộ API (Chương 3.5 Đề cương):
```powershell
cd d:\ĐACN2\backend
python tests/test_api.py
```

