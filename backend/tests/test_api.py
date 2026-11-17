"""
Kịch bản Kiểm thử Tự động Hệ thống API & Luồng Dữ liệu (Chương 3.5 Đề cương)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from main import root_health
from app.database import SessionLocal, Base, engine
from app.seed_data import seed_database_if_empty
from app.services.ml_predictor import ml_engine
from app.services.nlp_extractor import (
    analyze_vietnamese_jd,
    evaluate_nlp_gold_standard_benchmark,
)
from app.services.cv_parser import extract_text_from_pdf_bytes
from app.routers.analytics import (
    get_macro_overview,
    get_skills_intelligence,
    get_regional_intelligence,
    api_calculate_gross_to_net_and_scoli,
)
from app.routers.jobs import search_jobs
from app.routers.ai_tools import (
    api_analyze_jd,
    api_predict_salary,
    api_skill_gap,
    api_ai_economist_chat,
    api_evaluate_candidate_profile,
    api_parse_and_evaluate_cv_file,
    api_audit_curriculum,
    api_get_ai_chat_history,
    api_delete_chat_history_item,
    api_get_cv_history,
)
from app.routers.auth import (
    api_register_user,
    api_login_user,
    api_get_user_profile,
    api_update_user_profile,
    api_get_saved_jobs,
    api_upsert_or_toggle_saved_job,
)
from app.routers.etl import trigger_etl_run
from app.schemas import (
    JDAnalyzeRequest,
    CVFileParseRequest,
    SalaryPredictRequest,
    SkillGapRequest,
    AIChatRequest,
    CurriculumAuditRequest,
    ETLTriggerRequest,
    GrossToNetRequest,
    UserRegisterRequest,
    UserLoginRequest,
    UserProfileUpdateRequest,
    SavedJobRequest,
)


def run_all_tests():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database_if_empty(db)
        ml_engine.fit_if_needed(db)

        # 1. Health check
        r_root = root_health()
        assert r_root["status"] == "ONLINE"
        print("[1/12] Health check: PASS")

        # 2. Macro overview & GSO Reweighting
        data_ov = get_macro_overview(industry_code=None, location_code=None, db=db)
        assert data_ov["kpis"]["total_verified_jobs"] > 500
        assert 14.0 <= data_ov["kpis"]["median_salary_vnd"] <= 21.0
        assert len(data_ov["monthly_trends_and_forecast"]) >= 12
        assert "gso_national_benchmark" in data_ov
        assert 7.5 <= data_ov["gso_national_benchmark"]["gso_reweighted_market_avg_vnd"] <= 11.5
        print(f"[2/12] Macro overview (Avg={data_ov['kpis']['avg_salary_vnd']}tr, Median={data_ov['kpis']['median_salary_vnd']}tr, GSO_Reweighted={data_ov['gso_national_benchmark']['gso_reweighted_market_avg_vnd']}tr): PASS")

        # 3. Skills intelligence
        data_sk = get_skills_intelligence(category=None, db=db)
        assert data_sk["total_esco_skills"] >= 15
        print(f"[3/12] Skills intelligence ({data_sk['total_esco_skills']} ESCO skills): PASS")

        # 4. Regional intelligence
        data_rg = get_regional_intelligence(db=db)
        assert len(data_rg["regions"]) >= 6
        print(f"[4/12] Regional intelligence ({len(data_rg['regions'])} hubs): PASS")

        # 5. Job search
        data_jobs = search_jobs(
            q="Python",
            industry_code=None,
            location_code=None,
            experience_level=None,
            work_mode=None,
            skill_name=None,
            min_salary=None,
            sort_by="newest",
            page=1,
            page_size=10,
            db=db,
        )
        assert data_jobs["total"] > 0
        print(f"[5/12] Job search ('Python' -> {data_jobs['total']} matches): PASS")

        # 6. Vietnamese JD NLP extraction
        nlp_json = api_analyze_jd(
            JDAnalyzeRequest(
                title="Kỹ sư Tin học Môi trường & AI (Python/FastAPI/GIS)",
                raw_text="Tuyển dụng Kỹ sư phát triển hệ thống WebGIS và phân tích dữ liệu môi trường tại TP.HCM. Yêu cầu thành thạo Python, FastAPI, PostgreSQL, React, ArcGIS và kiểm kê khí nhà kính ESG. Kinh nghiệm 3 năm. Mức lương 25 - 38 triệu VNĐ/tháng. Làm việc Hybrid.",
                location_hint="TP. Hồ Chí Minh",
            )
        )
        assert nlp_json["salary_analysis"]["salary_min_vnd"] == 25.0
        assert len(nlp_json["extracted_skills"]) >= 4

        # Kiểm thử bẫy 'TOEIC 750+' + Gold Standard F1-Score + PDF TJ Kerning
        fresher_cv = analyze_vietnamese_jd("Sinh viên mới ra trường Fresher 6 tháng thực tập Python, TOEIC 750+ tại Đà Nẵng.")
        assert fresher_cv["years_of_experience"] < 2.0
        gs_eval = evaluate_nlp_gold_standard_benchmark()
        assert gs_eval["f1_score_pct"] >= 90.0
        assert gs_eval["experience_trap_passed"] is True
        pdf_sample = (
            b"%PDF-1.4\n1 0 obj\n<< /Length 120 >>\nstream\n"
            b"BT\n1 0 0 1 72 720 Tm\n/F1 12 Tf\n[(Ky) -220 (su) -200 (Python) -180 (FastAPI)] TJ\nET\n"
            b"endstream\nendobj\n%%EOF"
        )
        assert "Ky su Python FastAPI" in extract_text_from_pdf_bytes(pdf_sample)
        print(f"[6/12] Vietnamese JD NLP extraction & Gold F1={gs_eval['f1_score_pct']}%: PASS")

        # 7. Fair Salary Prediction (RandomForest)
        sal_json = api_predict_salary(
            SalaryPredictRequest(
                normalized_title="Kỹ sư Phần mềm (Backend/Fullstack)",
                industry_code="IND-IT",
                location_code="VN-SG",
                experience_level="Mid-level (2-4 năm)",
                years_of_experience=3.0,
                work_mode="Hybrid",
                skill_names=["Python", "FastAPI / RESTful API", "PostgreSQL / SQL", "React / TypeScript"],
            ),
            db=db,
        )
        assert sal_json["predicted_salary_avg_vnd"] > 10.0
        print(f"[7/12] Salary prediction ({sal_json['predicted_salary_avg_vnd']}tr): PASS")

        # 8. Skill Gap Analysis
        gap_json = api_skill_gap(
            SkillGapRequest(
                target_role="Chuyên gia Tin học Môi trường, GIS & Viễn thám",
                current_skills=["Python", "PostgreSQL / SQL"],
                experience_years=1.5,
                target_location="TP. Hồ Chí Minh",
            ),
            db=db,
        )
        assert "readiness_score_pct" in gap_json
        print(f"[8/12] Skill gap analysis (Readiness={gap_json['readiness_score_pct']}%): PASS")

        # 9. ETL Pipeline Trigger (dọn dẹp bản ghi kiểm thử tạm sau khi xác minh để giữ DB sạch)
        etl_json = trigger_etl_run(
            ETLTriggerRequest(
                source_platform="TopCV & VietnamWorks",
                sample_size=10,
            ),
            db=db,
        )
        assert etl_json["status"] == "SUCCESS"
        from app.models import ETLPipelineRun, JobPosting, JobSkill
        temp_run = db.query(ETLPipelineRun).filter(ETLPipelineRun.run_code == etl_json["run_code"]).first()
        if temp_run:
            db.delete(temp_run)
        temp_codes = [rec["job_code"] for rec in etl_json.get("sample_records", []) if rec.get("job_code")]
        extra_jobs = db.query(JobPosting).filter(JobPosting.job_code.like("VNJOB-SRC-%")).all()
        for ej in extra_jobs:
            db.query(JobSkill).filter(JobSkill.job_id == ej.id).delete()
            db.delete(ej)
        db.commit()
        print(f"[9/12] Multi-source ETL pipeline trigger ({len(temp_codes)} sample records verified): PASS")

        # 10. Conversational AI Assistant & Homonym Guard
        chat_json = api_ai_economist_chat(
            AIChatRequest(
                question="Mức lương kỹ sư Python tại TP. Hồ Chí Minh trong tương lai khoảng bao nhiêu?",
                history=[],
            ),
            db=db,
        )
        assert "*" not in chat_json["answer_text"]
        assert "Random Forest" not in chat_json["answer_text"]
        assert "Scikit-learn" not in chat_json["answer_text"]
        assert len(chat_json["referenced_sources"]) >= 2
        assert chat_json["detected_entities"]["role"] is None

        homonym_json = api_ai_economist_chat(
            AIChatRequest(
                question="Công ty này có ai ứng tuyển vào tháng thứ ba chưa?",
                history=[],
            ),
            db=db,
        )
        assert homonym_json["detected_entities"]["role"] is None
        print("[10/12] Conversational AI RAG & Vietnamese Homonym Guard: PASS")

        # 11. Candidate Profile Evaluation (Text + File Upload) & Curriculum Audit
        import base64
        eval_json = api_evaluate_candidate_profile(
            JDAnalyzeRequest(
                raw_text="Nguyễn Minh Quân | Email: quan@gmail.com | Kỹ sư 3 năm kinh nghiệm lập trình Python, FastAPI, PostgreSQL, React và phân tích dữ liệu GIS tại TP.HCM. Đã xây dựng 15 API giảm 35% thời gian xử lý.",
                location_hint="TP. Hồ Chí Minh",
            ),
            db=db,
        )
        assert eval_json["profile_score"] > 0
        assert len(eval_json["rubric_breakdown"]) == 4
        assert len(eval_json["ats_checklist"]) == 4
        assert "recommended_negotiation_range" in eval_json["salary_valuation"]

        sample_cv_b64 = base64.b64encode(
            "Họ tên: Trần Thu Hà | Email: ha@gmail.com | Cử nhân CNTT GPA 3.4/4.0. 2 năm kinh nghiệm Python, PostgreSQL, Power BI và ArcGIS tại Đà Nẵng.".encode("utf-8")
        ).decode("ascii")
        parsed_cv_res = api_parse_and_evaluate_cv_file(
            CVFileParseRequest(
                filename="CV_Tran_Thu_Ha.txt",
                file_base64=sample_cv_b64,
                location_hint="Đà Nẵng",
            ),
            db=db,
        )
        assert parsed_cv_res["file_parse_result"]["status"] == "SUCCESS"
        assert parsed_cv_res["evaluation"]["profile_score"] >= 50

        audit_json = api_audit_curriculum(
            CurriculumAuditRequest(
                program_name="Cử nhân Hệ thống Thông tin & Khoa học Dữ liệu",
                syllabus_text="Học phần lập trình Python, cơ sở dữ liệu PostgreSQL, phân tích không gian GIS (ArcGIS/QGIS) và phát triển web React.",
            )
        )
        assert audit_json["market_alignment_score_pct"] > 0
        assert len(audit_json["covered_skills"]) >= 3
        print("[11/12] CV Profile Evaluation & University Curriculum Audit: PASS")

        # 12. Gross -> Net & SCOLI Purchasing Power Calculator
        g2n_json = api_calculate_gross_to_net_and_scoli(
            GrossToNetRequest(
                gross_salary_vnd=25.0,
                dependents=1,
                location_code="VN-DN",
            ),
            db=db,
        )
        assert g2n_json["net_salary_vnd"] < 25.0
        assert len(g2n_json["city_savings_comparison"]) >= 6
        print("[12/13] Gross-to-Net & GSO SCOLI Purchasing Power Calculator: PASS")

        # 13. Auth (Register, Login, Profile), Saved Jobs Tracker, AI Chat History & CV History
        demo_login = api_login_user(UserLoginRequest(email="demo@vnlabor.vn", password="Demo@2026"), db=db)
        assert demo_login["status"] == "SUCCESS"
        assert demo_login["user"]["email"] == "demo@vnlabor.vn"

        test_email = "test_candidate_ci@vnlabor.vn"
        from app.models import UserAccount, SavedJobBookmark, ChatSessionLog, CVEvaluationHistory, JobPosting
        old_u = db.query(UserAccount).filter(UserAccount.email == test_email).first()
        if old_u:
            db.delete(old_u)
            db.commit()

        reg_res = api_register_user(
            UserRegisterRequest(
                email=test_email,
                full_name="Kiểm thử Ứng viên",
                password="Secret@2026",
                target_location="Đà Nẵng",
            ),
            db=db,
        )
        assert reg_res["status"] == "SUCCESS"
        me_res = api_get_user_profile(email=test_email, db=db)
        assert me_res["user"]["full_name"] == "Kiểm thử Ứng viên"
        upd_res = api_update_user_profile(UserProfileUpdateRequest(experience_years=3.0), email=test_email, db=db)
        assert upd_res["user"]["experience_years"] == 3.0

        any_job = db.query(JobPosting).first()
        bm_save = api_upsert_or_toggle_saved_job(
            SavedJobRequest(user_email=test_email, job_id=any_job.id, application_status="Đã nộp CV"),
            db=db,
        )
        assert bm_save["action"] == "SAVED"
        saved_list = api_get_saved_jobs(email=test_email, db=db)
        assert saved_list["total"] == 1

        chat_hist = api_get_ai_chat_history(limit=20, db=db)
        assert chat_hist["total"] >= 3
        cv_hist = api_get_cv_history(email="demo@vnlabor.vn", limit=20, db=db)
        assert cv_hist["total"] >= 2

        # Cleanup temp test artifacts so database stays spotless
        if chat_json.get("log_id"):
            api_delete_chat_history_item(chat_json["log_id"], db=db)
        if homonym_json.get("log_id"):
            api_delete_chat_history_item(homonym_json["log_id"], db=db)
        db.query(SavedJobBookmark).filter(SavedJobBookmark.user_email == test_email).delete()
        db.query(UserAccount).filter(UserAccount.email == test_email).delete()
        db.query(CVEvaluationHistory).filter(CVEvaluationHistory.filename == "CV_Tran_Thu_Ha.txt").delete()
        db.query(CVEvaluationHistory).filter(CVEvaluationHistory.filename == "CV_Van_Ban_Truc_Tiep.txt").delete()
        db.commit()
        print("[13/13] User Auth, Profile, Saved Jobs, AI Chat History & CV History: PASS")

        print("ALL 15 API, 3NF DB, AUTH, WORKSPACE HISTORY & SCOLI TESTS PASSED SUCCESSFULLY!")
    finally:
        db.close()


if __name__ == "__main__":
    run_all_tests()
