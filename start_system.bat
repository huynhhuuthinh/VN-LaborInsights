@echo off
chcp 65001 >nul
echo ============================================================================
echo   VN-LABORINSIGHTS: HỆ THỐNG PHÂN TÍCH & ĐÁNH GIÁ NHU CẦU VIỆC LÀM VIỆT NAM
echo ============================================================================
echo.
echo [1/2] Đang khởi động Backend FastAPI (Cổng 8000)...
start "VN-LaborInsights Backend (FastAPI)" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --host 127.0.0.1 --port 8000"

echo [2/2] Đang khởi động Giao diện Web React (Cổng 5173)...
start "VN-LaborInsights Frontend (React Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Hệ thống đang được khởi chạy:
echo   - Giao diện Web chính:     http://localhost:5173
echo   - Tài liệu FastAPI Swagger: http://127.0.0.1:8000/docs
echo ============================================================================
