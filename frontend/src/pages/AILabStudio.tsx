import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  FileText,
  MessageSquare,
  CheckCircle2,
  Send,
  Play,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Bot,
  User,
  Trash2,
  ArrowRight
} from 'lucide-react';
import {
  analyzeVietnameseJD,
  predictSalaryML,
  analyzeSkillGap,
  askAIEconomist,
  evaluateCandidateProfile,
  uploadAndEvaluateCVFile,
  auditUniversityCurriculum
} from '../services/api';
import { useSettings } from '../context/SettingsContext';

const SAMPLE_JDS = [
  {
    label: 'Mẫu #1: GIS & ESG',
    title: 'Kỹ sư Phân tích Dữ liệu Không gian GIS & Môi trường (Python / FastAPI / ESG)',
    text: `Tuyển dụng Kỹ sư Tin học Tài nguyên & Môi trường làm việc tại Quận Tân Bình, TP. Hồ Chí Minh (Hình thức Hybrid).
Mô tả công việc:
- Xây dựng hệ thống WebGIS quản lý tài nguyên, xử lý ảnh vệ tinh Viễn thám (Remote Sensing) và dữ liệu trạm quan trắc môi trường IoT.
- Phát triển Backend RESTful API bằng ngôn ngữ Python (FastAPI), tối ưu hóa cơ sở dữ liệu PostgreSQL / PostGIS và giao diện React, TypeScript.
- Hỗ trợ tính toán kiểm kê khí nhà kính (Carbon Accounting ISO 14064) và lập báo cáo phát triển bền vững ESG bằng Power BI.
Yêu cầu: Tối thiểu 3 năm kinh nghiệm, tư duy phân tích dữ liệu và giao tiếp Tiếng Anh tốt.
Quyền lợi: Mức lương hấp dẫn từ 26 - 38 triệu VNĐ/tháng + thưởng dự án.`
  },
  {
    label: 'Mẫu #2: AI & NLP',
    title: 'Kỹ sư Trí tuệ Nhân tạo & Xử lý Ngôn ngữ Tự nhiên (Machine Learning / LLM)',
    text: `Trung tâm AI & Dữ liệu lớn tại Cầu Giấy, Hà Nội tuyển dụng Kỹ sư AI / Xử lý ngôn ngữ tự nhiên (NLP).
Yêu cầu chuyên môn:
- Có từ 2 năm kinh nghiệm lập trình Python, Pandas, NumPy và xây dựng mô hình học máy với Scikit-learn.
- Kinh nghiệm triển khai hệ thống thu thập dữ liệu tự động (Web Scraping, ETL pipeline), bóc tách thực thể tiếng Việt và tích hợp LLM/RAG.
- Thành thạo Docker, Kubernetes, PostgreSQL và thiết kế microservice bằng FastAPI.
Thu nhập: $1200 - $2000 USD/tháng, làm việc linh hoạt Hybrid.`
  },
  {
    label: 'Mẫu #3: Data Tài chính',
    title: 'Chuyên viên Phân tích Dữ liệu & Mô hình hóa Rủi ro Tín dụng',
    text: `Ngân hàng số tại TP.HCM tìm kiếm Chuyên viên Phân tích Dữ liệu & Mô hình hóa Rủi ro Tín dụng.
Yêu cầu: 2 năm kinh nghiệm truy vấn SQL, PostgreSQL, lập trình Python phân tích thống kê và xây dựng dashboard trực quan hóa bằng Power BI / Tableau. Có kỹ năng quản lý dự án Agile / Scrum và Tiếng Anh TOEIC 750+. Lương thỏa thuận theo năng lực.`
  }
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  fullText?: string;
  isStreaming?: boolean;
  followUps?: string[];
  sources?: string[];
}

const ROLE_OPTIONS = [
  { title: 'Kỹ sư Phần mềm (Backend/Fullstack)', industry_code: 'IND-IT' },
  { title: 'Kỹ sư AI, NLP & Khoa học Dữ liệu', industry_code: 'IND-IT' },
  { title: 'Kỹ sư Dữ liệu (Data Engineer & ETL)', industry_code: 'IND-IT' },
  { title: 'Chuyên gia Tin học Môi trường, GIS & Viễn thám', industry_code: 'IND-ENV' },
  { title: 'Chuyên gia Phân tích ESG & Chuyển đổi Xanh', industry_code: 'IND-ENV' },
  { title: 'Chuyên viên Phân tích Dữ liệu Kinh doanh & Tài chính (BA/DA)', industry_code: 'IND-FIN' },
  { title: 'Kỹ sư An toàn Thông tin & Điện toán Đám mây', industry_code: 'IND-IT' },
  { title: 'Kỹ sư Tự động hóa, IoT & Bán dẫn', industry_code: 'IND-MFG' },
  { title: 'Chuyên viên Thương mại Điện tử & Growth Marketing', industry_code: 'IND-ECOM' },
  { title: 'Chuyên viên Chuỗi cung ứng & Logistics Thông minh', industry_code: 'IND-LOG' },
  { title: 'Chuyên viên Công nghệ Giáo dục & Quản trị Hệ thống Công', industry_code: 'IND-EDU' },
];

const LOCATION_OPTIONS = [
  { code: 'VN-SG', name: 'TP. Hồ Chí Minh' },
  { code: 'VN-HN', name: 'Hà Nội' },
  { code: 'VN-DN', name: 'Đà Nẵng' },
  { code: 'VN-BD', name: 'Bình Dương' },
  { code: 'VN-BN', name: 'Bắc Ninh' },
  { code: 'VN-DNA', name: 'Đồng Nai' },
  { code: 'VN-HP', name: 'Hải Phòng' },
  { code: 'VN-CT', name: 'Cần Thơ' },
];

export const AILabStudioView: React.FC = () => {
  const { t, expertMode } = useSettings();
  const [subTab, setSubTab] = useState<'nlp' | 'salary-gap' | 'economist' | 'cv-eval' | 'curriculum'>('economist');
  const [showNlpLogs, setShowNlpLogs] = useState(false);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');

  // State 5: University Curriculum / Syllabus Gap Audit
  const [programName, setProgramName] = useState(
    'Hệ thống Thông tin, Khoa học Dữ liệu & Tin học Môi trường'
  );
  const [syllabusText, setSyllabusText] = useState(
    `- Cơ sở lập trình & Xử lý dữ liệu với Python (Pandas, NumPy).
- Quản trị Cơ sở dữ liệu Quan hệ SQL & PostgreSQL / PostGIS.
- Hệ thống Thông tin Địa lý (GIS) với ArcGIS, QGIS và Viễn thám (Remote Sensing).
- Phát triển Ứng dụng Web với React, TypeScript và thiết kế RESTful API.
- Phân tích Trực quan hóa Dữ liệu Kinh doanh với Power BI.`
  );
  const [auditResult, setAuditResult] = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // State 4: CV / Candidate Profile Evaluator (with File Upload & 4-Pillar ATS Rubric)
  const [cvText, setCvText] = useState(
    `HỌ VÀ TÊN: Nguyễn Minh Quân
Email: minhquan.dev@gmail.com | SĐT: 0908 123 456 | GitHub: github.com/minhquan-gis
VỊ TRÍ ỨNG TUYỂN: Kỹ sư Phần mềm Backend & Phân tích Dữ liệu GIS tại TP. Hồ Chí Minh

HỌC VẤN & CHỨNG CHỈ:
- Cử nhân Công nghệ Thông tin (Hệ thống Thông tin & Tin học Môi trường) — Tốt nghiệp loại Giỏi (GPA 3.45/4.0).
- Chứng chỉ Tiếng Anh TOEIC 785; Hoàn thành khóa học Data Engineering & Cloud.

KINH NGHIỆM LÀM VIỆC & DỰ ÁN THỰC TẾ (2.5 năm kinh nghiệm):
1. Kỹ sư Backend Python & WebGIS (2024 – 2026):
- Xây dựng và tối ưu 18 RESTful API bằng Python (FastAPI) kết hợp PostgreSQL / PostGIS, giúp giảm 38% thời gian truy vấn dữ liệu không gian trên 120.000 bản ghi.
- Phát triển giao diện bản đồ tương tác bằng React, TypeScript và dashboard Power BI theo dõi chỉ số môi trường.
2. Chuyên viên Phân tích Dữ liệu Không gian & ESG (2023 – 2024):
- Ứng dụng ArcGIS / QGIS, xử lý ảnh vệ tinh Viễn thám (Remote Sensing) và tự động hóa quy trình ETL bằng Pandas, NumPy theo mô hình Agile / Scrum.`
  );
  const [cvLocation, setCvLocation] = useState('TP. Hồ Chí Minh');
  const [cvTargetRole, setCvTargetRole] = useState('AUTO');
  const [cvUploadedFileInfo, setCvUploadedFileInfo] = useState<{
    filename: string;
    fileFormat: string;
    wordCount: number;
    fileSizeKb?: number;
    message: string;
    status: string;
  } | null>(null);
  const [isDraggingCvFile, setIsDraggingCvFile] = useState(false);
  const cvFileInputRef = useRef<HTMLInputElement>(null);
  const [cvEvalResult, setCvEvalResult] = useState<any>(null);
  const [cvLoading, setCvLoading] = useState(false);

  // State 1: NLP JD Extractor
  const [jdTitle, setJdTitle] = useState(SAMPLE_JDS[0].title);
  const [jdText, setJdText] = useState(SAMPLE_JDS[0].text);
  const [nlpResult, setNlpResult] = useState<any>(null);
  const [nlpLoading, setNlpLoading] = useState(false);

  // State 2: ML Salary Predictor & Skill Gap
  const [predRole, setPredRole] = useState('Kỹ sư Phần mềm (Backend/Fullstack)');
  const [predLocation, setPredLocation] = useState('VN-SG');
  const [predYears, setPredYears] = useState(2.5);
  const [predWorkMode] = useState('Hybrid');
  const [predSkills, setPredSkills] = useState<string[]>([
    'Python',
    'FastAPI / RESTful API',
    'PostgreSQL / SQL',
    'React / TypeScript'
  ]);
  const [salaryResult, setSalaryResult] = useState<any>(null);
  const [gapResult, setGapResult] = useState<any>(null);
  const [mlLoading, setMlLoading] = useState(false);

  // State 3: Natural Streaming AI Economist Chat
  const [chatQuestion, setChatQuestion] = useState('');
  const [thinkingStatus, setThinkingStatus] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const initialGreeting: ChatMessage = {
    id: 'init-1',
    role: 'assistant',
    text: 'Chào bạn! Mình là Cố vấn AI thị trường lao động. Bạn muốn tìm hiểu về mức lương, kỹ năng cần học hay so sánh cơ hội giữa các thành phố?',
    followUps: [
      'Lộ trình học Python và GIS cho người mới?',
      'So sánh TP. Hồ Chí Minh và Đà Nẵng?',
      'Lương Python & FastAPI 2 năm kinh nghiệm ở TP.HCM?',
      'Công ty nào tuyển AI & Dữ liệu tại Hà Nội?'
    ]
  };

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([initialGreeting]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, thinkingStatus]);

  // Handoff from JobExplorer CTA ("Đưa JD này sang Phòng AI để Chấm điểm CV")
  useEffect(() => {
    const rawCta = sessionStorage.getItem('vn_labor_cta_job');
    if (rawCta) {
      try {
        const parsed = JSON.parse(rawCta);
        setSubTab('cv-eval');
        if (parsed.role) setCvTargetRole(parsed.role);
        if (parsed.location) setCvLocation(parsed.location);
        if (parsed.title) setJdTitle(parsed.title);
        if (parsed.jd) setJdText(parsed.jd);
      } catch {
        // Ignore malformed handoff payload
      } finally {
        sessionStorage.removeItem('vn_labor_cta_job');
      }
    }
  }, []);

  const runNlpAnalysis = async () => {
    setNlpLoading(true);
    try {
      const res = await analyzeVietnameseJD({
        title: jdTitle,
        raw_text: jdText,
        location_hint: 'TP. Hồ Chí Minh'
      });
      setNlpResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setNlpLoading(false);
    }
  };

  const runMlPredictionAndGap = async () => {
    setMlLoading(true);
    const resolvedInd = ROLE_OPTIONS.find((r) => r.title === predRole)?.industry_code || 'IND-IT';
    const resolvedLocName = LOCATION_OPTIONS.find((l) => l.code === predLocation)?.name || 'TP. Hồ Chí Minh';
    try {
      const [salRes, gapRes] = await Promise.all([
        predictSalaryML({
          normalized_title: predRole,
          industry_code: resolvedInd,
          location_code: predLocation,
          experience_level: predYears < 1 ? 'Intern / Fresher' : predYears < 2 ? 'Junior (1-2 năm)' : predYears <= 4 ? 'Mid-level (2-4 năm)' : 'Senior (5+ năm)',
          years_of_experience: predYears,
          work_mode: predWorkMode,
          skill_names: predSkills
        }),
        analyzeSkillGap({
          target_role: predRole,
          current_skills: predSkills,
          experience_years: predYears,
          target_location: resolvedLocName
        })
      ]);
      setSalaryResult(salRes);
      setGapResult(gapRes);
    } catch (e) {
      console.error(e);
    } finally {
      setMlLoading(false);
    }
  };

  const handleSendQuestion = async (presetQ?: string) => {
    const q = (presetQ ?? chatQuestion).trim();
    if (!q || thinkingStatus) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: q
    };

    const prevUserQuestions = chatHistory
      .filter((m) => m.role === 'user')
      .map((m) => m.text);

    setChatHistory((prev) => [...prev, userMsg]);
    if (!presetQ) setChatQuestion('');

    setThinkingStatus('Đang phân tích...');

    try {
      const [res] = await Promise.all([
        askAIEconomist(q, prevUserQuestions, geminiApiKey),
        new Promise((resolve) => setTimeout(resolve, 400))
      ]);

      setThinkingStatus(null);

      const cleanFullText = String(res.answer_text || res.answer_markdown || '').replace(/\*+/g, '').trim();
      const msgId = `ai-${Date.now()}`;

      setChatHistory((prev) => [
        ...prev,
        {
          id: msgId,
          role: 'assistant',
          text: '',
          fullText: cleanFullText,
          isStreaming: true,
          followUps: res.follow_up_suggestions || [],
          sources: res.referenced_sources || []
        }
      ]);

      const words = cleanFullText.split(' ');
      let currentIdx = 0;
      const chunkSize = 3;

      const timer = setInterval(() => {
        currentIdx += chunkSize;
        if (currentIdx >= words.length) {
          clearInterval(timer);
          setChatHistory((prev) =>
            prev.map((m) =>
              m.id === msgId ? { ...m, text: cleanFullText, isStreaming: false } : m
            )
          );
        } else {
          const partial = words.slice(0, currentIdx).join(' ');
          setChatHistory((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, text: partial } : m))
          );
        }
      }, 28);
    } catch (e) {
      console.error(e);
      setThinkingStatus(null);
    }
  };

  const SAMPLE_CVS = [
    {
      label: 'Mẫu #1: CV chuẩn (2.5 năm KN)',
      filename: 'CV_Nguyen_Minh_Quan_Backend_GIS.pdf',
      location: 'TP. Hồ Chí Minh',
      role: 'AUTO',
      text: `HỌ VÀ TÊN: Nguyễn Minh Quân
Email: minhquan.dev@gmail.com | SĐT: 0908 123 456 | GitHub: github.com/minhquan-gis
VỊ TRÍ ỨNG TUYỂN: Kỹ sư Phần mềm Backend & Phân tích Dữ liệu GIS tại TP. Hồ Chí Minh

HỌC VẤN & CHỨNG CHỈ:
- Cử nhân Công nghệ Thông tin (Hệ thống Thông tin & Tin học Môi trường) — Tốt nghiệp loại Giỏi (GPA 3.45/4.0).
- Chứng chỉ Tiếng Anh TOEIC 785; Hoàn thành khóa học Data Engineering & Cloud.

KINH NGHIỆM LÀM VIỆC & DỰ ÁN THỰC TẾ (2.5 năm kinh nghiệm):
1. Kỹ sư Backend Python & WebGIS (2024 – 2026):
- Xây dựng và tối ưu 18 RESTful API bằng Python (FastAPI) kết hợp PostgreSQL / PostGIS, giúp giảm 38% thời gian truy vấn dữ liệu không gian trên 120.000 bản ghi.
- Phát triển giao diện bản đồ tương tác bằng React, TypeScript và dashboard Power BI theo dõi chỉ số môi trường.
2. Chuyên viên Phân tích Dữ liệu Không gian & ESG (2023 – 2024):
- Ứng dụng ArcGIS / QGIS, xử lý ảnh vệ tinh Viễn thám (Remote Sensing) và tự động hóa quy trình ETL bằng Pandas, NumPy theo mô hình Agile / Scrum.`
    },
    {
      label: 'Mẫu #2: Sinh viên mới ra trường (Fresher)',
      filename: 'CV_Tran_Thu_Ha_Fresher_Data_ESG.docx',
      location: 'Đà Nẵng',
      role: 'Chuyên gia Tin học Môi trường, GIS & Viễn thám',
      text: `HỌ VÀ TÊN: Trần Thu Hà
Email: thuha.env@gmail.com | SĐT: 0912 345 678 | LinkedIn: linkedin.com/in/thuha-gis
MỤC TIÊU NGHỀ NGHIỆP: Ứng tuyển vị trí Fresher Phân tích Dữ liệu Môi trường, GIS & ESG tại Đà Nẵng.

HỌC VẤN:
- Đại học Tài nguyên và Môi trường — Chuyên ngành Tin học Môi trường (GPA 3.32/4.0, tốt nghiệp 2026).
- Tiếng Anh giao tiếp tốt (IELTS 6.5).

ĐỒ ÁN & DỰ ÁN THỰC TẬP (1 năm thực tập & làm đồ án):
- Thực tập sinh Phân tích Không gian GIS (6 tháng): Sử dụng ArcGIS, QGIS và Python (Pandas) chuẩn hóa 15 bản đồ hiện trạng sử dụng đất và phân tích ảnh vệ tinh Remote Sensing.
- Đồ án tốt nghiệp: Thiết kế cơ sở dữ liệu PostgreSQL / SQL và biểu đồ Power BI theo dõi phát thải khí nhà kính Carbon Accounting & ESG cho 20 doanh nghiệp sản xuất.`
    },
    {
      label: 'Mẫu #3: CV sơ sài (Kiểm thử cảnh báo ATS)',
      filename: 'CV_So_Sai_Chua_Chuan_ATS.txt',
      location: 'Hà Nội',
      role: 'Kỹ sư Phần mềm (Backend/Fullstack)',
      text: `Tôi tên là Lê Văn B. Muốn xin việc lập trình viên Python hoặc làm web ở Hà Nội.
Biết dùng một chút Python, SQL và làm web cơ bản. Chăm chỉ, chịu khó học hỏi, mong muốn tìm môi trường làm việc tốt.`
    }
  ];

  const runCvEvaluation = async (customText?: string, customLoc?: string, customRole?: string) => {
    setCvLoading(true);
    try {
      const res = await evaluateCandidateProfile({
        raw_text: customText ?? cvText,
        location_hint: customLoc ?? cvLocation,
        target_role: (customRole ?? cvTargetRole) === 'AUTO' ? undefined : (customRole ?? cvTargetRole)
      });
      setCvEvalResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setCvLoading(false);
    }
  };

  const handleCvFileSelected = async (file: File) => {
    if (!file) return;
    setCvLoading(true);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      const res = await uploadAndEvaluateCVFile({
        filename: file.name,
        file_base64: base64Data,
        location_hint: cvLocation,
        target_role: cvTargetRole === 'AUTO' ? undefined : cvTargetRole
      });

      if (res?.file_parse_result) {
        const fp = res.file_parse_result;
        setCvUploadedFileInfo({
          filename: fp.filename,
          fileFormat: fp.file_format,
          wordCount: fp.word_count,
          fileSizeKb: fp.file_size_kb,
          message: fp.message,
          status: fp.status
        });
        if (fp.extracted_text && fp.extracted_text.trim().length > 0) {
          setCvText(fp.extracted_text);
        }
      }
      if (res?.evaluation) {
        setCvEvalResult(res.evaluation);
      }
    } catch (err) {
      console.error(err);
      // Fallback đọc trực tiếp trên trình duyệt nếu là file văn bản
      try {
        const rawTxt = await file.text();
        if (rawTxt && rawTxt.trim().length > 5) {
          setCvText(rawTxt);
          setCvUploadedFileInfo({
            filename: file.name,
            fileFormat: 'Tệp văn bản nội bộ',
            wordCount: rawTxt.trim().split(/\s+/).length,
            fileSizeKb: Math.round((file.size / 1024) * 10) / 10,
            message: `Đã đọc trực tiếp tệp ${file.name} trên trình duyệt.`,
            status: 'SUCCESS'
          });
          await runCvEvaluation(rawTxt, cvLocation, cvTargetRole);
        }
      } catch (innerErr) {
        console.error(innerErr);
      }
    } finally {
      setCvLoading(false);
    }
  };

  const runCurriculumAudit = async () => {
    setAuditLoading(true);
    try {
      const res = await auditUniversityCurriculum({
        program_name: programName,
        syllabus_text: syllabusText
      });
      setAuditResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    runNlpAnalysis();
    runMlPredictionAndGap();
    runCvEvaluation();
    runCurriculumAudit();
  }, []);

  const ALL_SKILL_CHIPS = [
    'Python',
    'FastAPI / RESTful API',
    'React / TypeScript',
    'PostgreSQL / SQL',
    'Machine Learning (Scikit-learn)',
    'Vietnamese NLP / LLM',
    'Data Engineering & ETL',
    'Cloud & Docker / Kubernetes',
    'Power BI / Tableau',
    'ArcGIS / QGIS & Spatial Analysis',
    'Remote Sensing & Satellite Data',
    'Carbon Accounting & ESG Reporting',
    'Environmental Monitoring IoT',
    'English / Bilingual Communication',
    'Agile / Scrum Project Management'
  ];

  const toggleSkillChip = (sk: string) => {
    setPredSkills((prev) =>
      prev.includes(sk) ? prev.filter((item) => item !== sk) : [...prev, sk]
    );
  };

  return (
    <div className="space-y-5">
      {/* Compact Top Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl px-5 py-3.5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">
            {t('Phòng thí nghiệm AI', 'AI Studio')}
          </h1>
          {expertMode && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-50 dark:bg-amber-500/15 text-indigo-700 dark:text-amber-300 border border-indigo-200 dark:border-amber-500/30">
              ESCO v1.2 • RF R²=0.989 • ATS 4-Pillar
            </span>
          )}
        </div>

        <div className="inline-flex shrink-0 flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          {[
            { id: 'economist', label: t('Cố vấn AI', 'AI Advisor'), icon: MessageSquare },
            { id: 'nlp', label: t('Phân tích JD', 'JD Parser'), icon: FileText },
            { id: 'salary-gap', label: t('Dự báo lương', 'Salary ML'), icon: Cpu },
            { id: 'cv-eval', label: t('Đánh giá CV', 'CV Check'), icon: CheckCircle2 },
            { id: 'curriculum', label: t('Kiểm toán đào tạo', 'Syllabus Audit'), icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  active
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-amber-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-TAB 1: CONVERSATIONAL AI ADVISOR */}
      {subTab === 'economist' && (
        <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs space-y-4">
          {/* Compact Chat Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('Cố vấn AI Nghề nghiệp', 'AI Career Advisor')}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {geminiApiKey.trim() ? 'Gemini RAG' : 'Local Expert'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowApiConfig(!showApiConfig)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 dark:text-amber-300 bg-indigo-50 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 flex items-center gap-1 transition"
              >
                <Sparkles className="w-3 h-3" />
                <span>API Key</span>
              </button>
              <button
                onClick={() => setChatHistory([initialGreeting])}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('Làm mới', 'Reset')}</span>
              </button>
            </div>
          </div>

          {showApiConfig && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <span className="text-slate-600 dark:text-slate-400">
                {t('Mặc định chạy miễn phí 100%. Nhập Gemini API Key nếu muốn dùng LLM đám mây:', 'Default 100% free local engine. Optional Gemini API Key:')}
              </span>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full sm:w-64 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
              />
            </div>
          )}

          {/* Chat Messages Stream Area */}
          <div
            ref={chatContainerRef}
            className="h-[460px] overflow-y-auto space-y-4 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 scroll-smooth"
          >
            {chatHistory.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div className={`max-w-3xl space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed shadow-2xs ${
                        isUser
                          ? 'bg-indigo-600 text-white font-medium rounded-tr-xs'
                          : 'bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs'
                      }`}
                    >
                      <div className="space-y-2.5">
                        {msg.text.split('\n\n').map((para, pIdx) => (
                          <div key={pIdx} className="whitespace-pre-line">
                            {para}
                            {msg.isStreaming && pIdx === msg.text.split('\n\n').length - 1 && (
                              <span className="inline-block w-1.5 h-3.5 ml-1 align-middle bg-indigo-600 dark:bg-amber-400 animate-pulse" />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Compact Source Line */}
                      {!isUser && !msg.isStreaming && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10.5px] text-slate-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span className="truncate">
                            {t('Nguồn:', 'Sources:')} {msg.sources.slice(0, 3).join(' • ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Follow-up Suggestions */}
                    {!isUser && !msg.isStreaming && msg.followUps && msg.followUps.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {msg.followUps.map((fq, fIdx) => (
                          <button
                            key={fIdx}
                            onClick={() => handleSendQuestion(fq)}
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-amber-500/15 text-indigo-700 dark:text-amber-300 border border-slate-200 dark:border-slate-800 transition flex items-center gap-1"
                          >
                            <span>{fq}</span>
                            <ArrowRight className="w-3 h-3 opacity-60" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-lg bg-slate-800 dark:bg-amber-500 text-white dark:text-slate-950 flex items-center justify-center shrink-0 mt-1">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {thinkingStatus && (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <div className="rounded-xl px-3.5 py-2 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  {thinkingStatus}
                </div>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="flex gap-2">
            <input
              type="text"
              value={chatQuestion}
              onChange={(e) => setChatQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendQuestion()}
              placeholder={t('Nhập câu hỏi về lương, kỹ năng, thành phố...', 'Ask about salaries, skills, or cities...')}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => handleSendQuestion()}
              disabled={Boolean(thinkingStatus)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-amber-500 text-white dark:text-slate-950 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t('Gửi', 'Send')}</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: VIETNAMESE NLP JD EXTRACTOR */}
      {subTab === 'nlp' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-6 bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('Văn bản tuyển dụng (JD)', 'Job Description Input')}
              </h3>
              <div className="flex gap-1.5">
                {SAMPLE_JDS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setJdTitle(s.title);
                      setJdText(s.text);
                    }}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-indigo-50 text-slate-700 dark:text-slate-300 transition"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={jdTitle}
              onChange={(e) => setJdTitle(e.target.value)}
              placeholder={t('Tiêu đề công việc...', 'Job title...')}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
            />

            <textarea
              rows={7}
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white leading-relaxed"
            />

            <button
              onClick={runNlpAnalysis}
              disabled={nlpLoading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-amber-500 text-white dark:text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{nlpLoading ? t('Đang phân tích...', 'Analyzing...') : t('Trích xuất thông tin & Kỹ năng', 'Extract Entities & Skills')}</span>
            </button>
          </div>

          <div className="xl:col-span-6 bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('Kết quả bóc tách tự động', 'Extracted Entities')}
              </h3>
              {nlpResult && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                  {Math.round(nlpResult.data_quality_score * 100)}%
                </span>
              )}
            </div>

            {nlpResult && (
              <>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-400">{t('Chức danh chuẩn', 'Standard Role')}</div>
                    <div className="font-bold text-indigo-600 dark:text-amber-400 mt-0.5 truncate">{nlpResult.normalized_title}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-400">{t('Mức lương', 'Salary')}</div>
                    <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {nlpResult.salary_analysis?.salary_min_vnd} – {nlpResult.salary_analysis?.salary_max_vnd} {t('triệu', 'M')}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-400">{t('Kinh nghiệm', 'Experience')}</div>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {nlpResult.experience_level} ({nlpResult.years_of_experience} {t('năm', 'yrs')})
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-400">{t('Khu vực & Hình thức', 'Location & Mode')}</div>
                    <div className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                      {nlpResult.detected_location} • {nlpResult.work_mode}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-500 mb-2">
                    {t('Kỹ năng nhận diện', 'Detected Skills')} ({nlpResult.extracted_skills?.length || 0})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {nlpResult.extracted_skills?.map((sk: any) => (
                      <span
                        key={sk.esco_code}
                        className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
                      >
                        {sk.name} <span className="text-emerald-600 font-mono text-[11px]">+{sk.salary_premium_pct}%</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setShowNlpLogs(!showNlpLogs)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-indigo-600"
                  >
                    <span>{t('Nhật ký xử lý NLP (4 bước)', 'NLP Pipeline Steps')}</span>
                    {showNlpLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showNlpLogs && (
                    <div className="mt-2 space-y-1 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px]">
                      {nlpResult.nlp_pipeline_steps?.map((st: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <span>✓ {st.step}</span>
                          <span className="text-slate-400">{st.detail}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SALARY PREDICTOR & SKILL GAP */}
      {subTab === 'salary-gap' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-5 bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('Thông số dự báo lương', 'Salary Prediction Inputs')}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-500 mb-1">
                  {t('Vị trí mục tiêu', 'Target Role')}
                </label>
                <select
                  value={predRole}
                  onChange={(e) => setPredRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.title} value={r.title}>{r.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">
                    {t('Thành phố', 'Location')}
                  </label>
                  <select
                    value={predLocation}
                    onChange={(e) => setPredLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                  >
                    {LOCATION_OPTIONS.map((loc) => (
                      <option key={loc.code} value={loc.code}>{loc.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-500 mb-1">
                    {t('Kinh nghiệm:', 'Exp:')} <strong className="text-indigo-600 dark:text-amber-400 font-mono">{predYears} {t('năm', 'yrs')}</strong>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={predYears}
                    onChange={(e) => setPredYears(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600 dark:accent-amber-500 mt-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-500 mb-1.5">
                  {t('Kỹ năng hiện có', 'Selected Skills')} ({predSkills.length}):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_SKILL_CHIPS.map((sk) => {
                    const active = predSkills.includes(sk);
                    return (
                      <button
                        key={sk}
                        type="button"
                        onClick={() => toggleSkillChip(sk)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition border ${
                          active
                            ? 'bg-indigo-50 dark:bg-amber-500/20 text-indigo-700 dark:text-amber-300 border-indigo-500 dark:border-amber-500 font-bold'
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}{sk}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={runMlPredictionAndGap}
                disabled={mlLoading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-amber-500 text-white dark:text-slate-950 font-bold text-xs transition"
              >
                {mlLoading ? t('Đang tính toán...', 'Calculating...') : t('Dự báo lương & Khoảng trống kỹ năng', 'Predict Salary & Skill Gap')}
              </button>
            </div>
          </div>

          <div className="xl:col-span-7 space-y-4">
            {salaryResult && (
              <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t('Mức lương dự báo', 'Predicted Salary')}
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Random Forest (R² = {salaryResult.model_metadata?.r2_accuracy_score})
                    </span>
                  </div>
                  <span className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                    {salaryResult.predicted_salary_avg_vnd} {t('triệu/tháng', 'M/mo')}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2.5 text-center font-mono text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 font-sans">P25</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {salaryResult.percentile_benchmarks?.p25_entry}tr
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-amber-500/10 border border-indigo-200 dark:border-amber-500/40">
                    <div className="text-[10px] text-indigo-700 dark:text-amber-300 font-bold font-sans">P50</div>
                    <div className="text-sm font-bold text-indigo-700 dark:text-amber-400 mt-0.5">
                      {salaryResult.percentile_benchmarks?.p50_median}tr
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 font-sans">P75</div>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {salaryResult.percentile_benchmarks?.p75_competitive}tr
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 font-sans">P90</div>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                      {salaryResult.percentile_benchmarks?.p90_top_tier}tr
                    </div>
                  </div>
                </div>

                {/* Compact Single-Line XAI Waterfall */}
                {salaryResult.xai_waterfall && salaryResult.xai_waterfall.length > 0 && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="text-xs font-bold text-slate-500">
                      {t('Cấu thành mức lương (XAI):', 'Salary Breakdown (XAI):')}
                    </div>
                    {salaryResult.xai_waterfall.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{item.factor}</span>
                        <span
                          className={`font-mono font-bold ${
                            item.type === 'base'
                              ? 'text-slate-800 dark:text-slate-200'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {item.type === 'base' ? `${item.delta_vnd}tr` : `+${item.delta_vnd}tr`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {gapResult && (
              <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t('Độ khớp kỹ năng:', 'Skill Match:')} <span className="text-indigo-600 dark:text-amber-400 font-mono">{gapResult.readiness_score_pct}%</span>
                  </h3>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                    +{gapResult.salary_upside_vnd}tr {t('khi bổ sung', 'upside')}
                  </span>
                </div>

                {gapResult.recommended_roadmap?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {gapResult.recommended_roadmap.map((item: any) => (
                      <div
                        key={item.skill_name}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <strong className="text-slate-900 dark:text-white truncate">{item.skill_name}</strong>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold shrink-0 ml-2">
                          +{item.salary_boost_pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                    ✓ {t('Đã đáp ứng 100% kỹ năng cốt lõi.', '100% core skills matched.')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: CV EVALUATOR (FILE UPLOAD + 4-PILLAR ATS & HR RUBRIC) */}
      {subTab === 'cv-eval' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Left Column: File Upload Zone + CV Text Editor + Target Filters */}
          <div className="xl:col-span-5 bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs space-y-4 h-fit">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {t('Tải lên File CV & Thẩm định Hồ sơ Chuyên nghiệp', 'Upload CV File & Professional ATS Audit')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t(
                  'Tải trực tiếp file CV (.pdf, .docx, .txt, .md) hoặc dán nội dung để hệ thống tự động đọc và chấm điểm theo 4 tiêu chuẩn HR & ATS.',
                  'Upload your CV file (.pdf, .docx, .txt, .md) or paste text for automated 4-pillar ATS & HR evaluation.'
                )}
              </p>
            </div>

            {/* Drag and Drop File Upload Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingCvFile(true);
              }}
              onDragLeave={() => setIsDraggingCvFile(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingCvFile(false);
                const droppedFile = e.dataTransfer.files?.[0];
                if (droppedFile) {
                  handleCvFileSelected(droppedFile);
                }
              }}
              onClick={() => cvFileInputRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-4 text-center transition-all ${
                isDraggingCvFile
                  ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30'
                  : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-amber-400 bg-slate-50/70 dark:bg-slate-900/60'
              }`}
            >
              <input
                ref={cvFileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleCvFileSelected(f);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {t('Bấm để chọn File CV từ máy tính hoặc Kéo-thả vào đây', 'Click to browse CV file or Drag & Drop here')}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {t('Hỗ trợ tự động đọc: PDF (.pdf), Word (.docx), Văn bản (.txt, .md)', 'Supports: PDF (.pdf), Word (.docx), Text (.txt, .md)')}
              </div>
            </div>

            {/* Uploaded File Status Badge */}
            {cvUploadedFileInfo && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-2 ${
                  cvUploadedFileInfo.status === 'SUCCESS'
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-200'
                    : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/70 text-amber-900 dark:text-amber-200'
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="font-bold truncate">
                    📄 {cvUploadedFileInfo.filename} ({cvUploadedFileInfo.fileFormat})
                  </div>
                  <div className="text-[11px] opacity-90">
                    {cvUploadedFileInfo.message}
                    {cvUploadedFileInfo.fileSizeKb ? ` • ${cvUploadedFileInfo.fileSizeKb} KB` : ''}
                  </div>
                </div>
                <button
                  onClick={() => setCvUploadedFileInfo(null)}
                  className="text-[11px] font-bold underline shrink-0 opacity-75 hover:opacity-100"
                >
                  {t('Ẩn', 'Hide')}
                </button>
              </div>
            )}

            {/* Quick Sample CVs */}
            <div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                {t('Hoặc thử nhanh với 3 mẫu CV thực tế:', 'Or test with 3 realistic CV templates:')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_CVS.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCvText(sample.text);
                      setCvLocation(sample.location);
                      setCvTargetRole(sample.role);
                      setCvUploadedFileInfo({
                        filename: sample.filename,
                        fileFormat: sample.filename.endsWith('.pdf')
                          ? 'Adobe PDF (.pdf)'
                          : sample.filename.endsWith('.docx')
                          ? 'Microsoft Word (.docx)'
                          : 'Văn bản (.txt)',
                        wordCount: sample.text.trim().split(/\s+/).length,
                        message: `Đã nạp mẫu hồ sơ ${sample.label}`,
                        status: 'SUCCESS'
                      });
                      runCvEvaluation(sample.text, sample.location, sample.role);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/90 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 transition"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Role & Location Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  {t('Vị trí ứng tuyển mục tiêu:', 'Target Job Role:')}
                </label>
                <select
                  value={cvTargetRole}
                  onChange={(e) => setCvTargetRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="AUTO">{t('✨ Tự động nhận diện từ CV', '✨ Auto-detect from CV')}</option>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.title} value={r.title}>{r.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  {t('Khu vực làm việc:', 'Target Location:')}
                </label>
                <select
                  value={cvLocation}
                  onChange={(e) => setCvLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  {LOCATION_OPTIONS.map((loc) => (
                    <option key={loc.code} value={loc.name}>{loc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Extracted / Editable CV Content */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {t('Nội dung CV đã trích xuất (có thể chỉnh sửa thêm):', 'Extracted CV Text (editable):')}
                </label>
                <span className="text-[11px] font-mono text-slate-400">
                  {cvText.trim() ? cvText.trim().split(/\s+/).length : 0} {t('từ', 'words')}
                </span>
              </div>
              <textarea
                rows={8}
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                placeholder={t('Nội dung CV sau khi tải file lên sẽ hiển thị tại đây...', 'Extracted CV text will appear here...')}
                className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white leading-relaxed font-sans"
              />
            </div>

            <button
              onClick={() => runCvEvaluation()}
              disabled={cvLoading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-amber-500 text-white dark:text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {cvLoading
                  ? t('Đang phân tích cấu trúc CV & đối chiếu thị trường...', 'Analyzing CV structure & market data...')
                  : t('Phân tích & Chấm điểm CV theo Quy trình HR', 'Evaluate CV with 4-Pillar HR Process')}
              </span>
            </button>
          </div>

          {/* Right Column: Comprehensive 5-Stage Professional Evaluation Report */}
          <div className="xl:col-span-7 space-y-4">
            {cvEvalResult && (
              <>
                {/* 1. Score, Verdict & Salary Valuation Header Card */}
                <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-mono font-extrabold shrink-0 border ${
                          cvEvalResult.profile_score >= 80
                            ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
                            : cvEvalResult.profile_score >= 65
                            ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-amber-400'
                            : 'bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        <span className="text-2xl leading-none">{cvEvalResult.profile_score}</span>
                        <span className="text-[10px] opacity-75">/100</span>
                      </div>

                      <div>
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            cvEvalResult.profile_score >= 80
                              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                              : cvEvalResult.profile_score >= 65
                              ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300'
                              : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {cvEvalResult.verdict_label || t('Đánh giá tổng hợp', 'Overall Verdict')}
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                          {cvEvalResult.recommended_role}
                        </h3>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {cvEvalResult.experience_level} (~{cvEvalResult.years_of_experience} {t('năm KN', 'yrs exp')}) • {cvEvalResult.detected_location}
                        </div>
                      </div>
                    </div>

                    <div className="sm:text-right bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl px-4 py-2.5 shrink-0">
                      <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                        {t('Khung lương đàm phán đề xuất', 'Recommended Salary Range')}
                      </div>
                      <div className="text-base font-extrabold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {cvEvalResult.salary_valuation?.recommended_negotiation_range}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t('Kỳ vọng TB:', 'Expected Avg:')} <strong>{cvEvalResult.salary_valuation?.predicted_avg_vnd} triệu/tháng</strong>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {cvEvalResult.evaluation_summary}
                  </p>

                  {/* 2. 4-Pillar ATS & HR Scoring Rubric */}
                  {cvEvalResult.rubric_breakdown?.length > 0 && (
                    <div className="space-y-2.5 pt-2">
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {t('Chi tiết chấm điểm 4 Trụ cột Chuẩn Tuyển dụng (Tổng 100 điểm):', '4-Pillar Professional HR & ATS Scoring Breakdown (100 pts):')}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {cvEvalResult.rubric_breakdown.map((item: any, idx: number) => {
                          const pct = Math.min(100, Math.round((item.score / item.max_score) * 100));
                          return (
                            <div
                              key={idx}
                              className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-800 dark:text-slate-100">{item.criterion}</span>
                                <span className="font-mono font-extrabold text-indigo-600 dark:text-amber-400">
                                  {item.score}/{item.max_score}đ
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    pct >= 75 ? 'bg-emerald-500' : pct >= 55 ? 'bg-indigo-600' : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                {item.comment}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. ATS Structure Checklist & Strengths / Actionable Improvements */}
                <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs space-y-4">
                  {cvEvalResult.ats_checklist?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white mb-2.5">
                        {t('Kiểm tra Cấu trúc Hồ sơ Vượt vòng Lọc ATS Tự động:', 'Automated ATS Structure Checklist:')}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {cvEvalResult.ats_checklist.map((chk: any) => (
                          <div
                            key={chk.key}
                            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                              chk.passed
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/60'
                                : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/60'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${
                                chk.passed
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-amber-500 text-white'
                              }`}
                            >
                              {chk.passed ? '✓' : '!'}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">{chk.label}</div>
                              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{chk.detail}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strengths & Actionable Improvements */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="space-y-2">
                      <h4 className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                        ✓ {t('Điểm mạnh nổi bật của Hồ sơ', 'Key Profile Strengths')}
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                        {cvEvalResult.strengths?.map((st: string, i: number) => (
                          <li key={i} className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-slate-900 border border-emerald-200/60 dark:border-slate-800 leading-relaxed">
                            {st}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-extrabold text-amber-700 dark:text-amber-400">
                        ⚡ {t('Khuyến nghị chỉnh sửa CV để tăng điểm & lương', 'Actionable Improvements to Boost Score')}
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                        {cvEvalResult.improvements?.map((imp: string, i: number) => (
                          <li key={i} className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-slate-900 border border-amber-200/60 dark:border-slate-800 leading-relaxed">
                            {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* STAR / XYZ Formula Rewrite Example */}
                  {cvEvalResult.star_rewrite_examples?.length > 0 && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white mb-2">
                        💡 {t('Gợi ý nâng cấp câu chữ trong CV theo chuẩn HR (Mô hình STAR / XYZ):', 'HR-Standard Bullet Point Upgrade Examples (STAR / XYZ Formula):')}
                      </h4>
                      <div className="space-y-2">
                        {cvEvalResult.star_rewrite_examples.slice(0, 2).map((ex: any, i: number) => (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5"
                          >
                            <div className="text-rose-600 dark:text-rose-400">
                              <strong>✗ {t('Cách viết chung chung:', 'Weak (Generic):')}</strong> "{ex.before}"
                            </div>
                            <div className="text-emerald-700 dark:text-emerald-400">
                              <strong>✓ {t('Cách viết chuẩn HR (Có số liệu):', 'Strong (Quantified Impact):')}</strong> "{ex.after}"
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Matched Skills, Missing Skills & Top Matching Jobs */}
                <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs space-y-4">
                  {(cvEvalResult.all_extracted_skills?.length > 0 || cvEvalResult.matched_skills?.length > 0) && (
                    <div>
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white mb-2">
                        ✓ {t('Toàn bộ kỹ năng chuyên môn nhận diện trong CV', 'All Recognized Skills in CV')} ({cvEvalResult.all_extracted_skills?.length || cvEvalResult.matched_skills?.length}):
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(cvEvalResult.all_extracted_skills?.length
                          ? cvEvalResult.all_extracted_skills
                          : cvEvalResult.matched_skills.map((s: string) => ({ name: s, esco_code: s }))
                        ).map((skObj: any) => {
                          const isCore = cvEvalResult.matched_skills?.includes(skObj.name);
                          return (
                            <span
                              key={skObj.esco_code || skObj.name}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                                isCore
                                  ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60'
                                  : 'bg-indigo-50/70 dark:bg-slate-900 text-indigo-700 dark:text-slate-300 border-indigo-200/70 dark:border-slate-700'
                              }`}
                            >
                              {isCore ? '★ ' : '✓ '}
                              {skObj.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {cvEvalResult.missing_recommended_skills?.length > 0 && (
                    <div>
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white mb-2">
                        {t('Kỹ năng nên bổ sung vào CV để tăng thu nhập (+', 'Recommended Skills to Add (+')}{cvEvalResult.salary_valuation?.potential_upside_vnd}tr/tháng):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {cvEvalResult.missing_recommended_skills.map((item: any) => (
                          <div
                            key={item.skill_name}
                            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                          >
                            <span className="font-bold text-slate-900 dark:text-white">{item.skill_name}</span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              +{item.salary_boost_pct}% {t('lương', 'pay')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {cvEvalResult.top_matched_jobs?.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white mb-2">
                        {t('Cơ hội việc làm thực tế khớp nhất với CV của bạn:', 'Best Matching Active Job Postings:')}
                      </div>
                      <div className="space-y-2">
                        {cvEvalResult.top_matched_jobs.slice(0, 3).map((job: any) => (
                          <div
                            key={job.job_code}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 dark:text-white truncate">{job.title}</div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {job.company_name} • {job.location_name} • {t('Khớp', 'Match')} {job.matched_skills_count} {t('kỹ năng', 'skills')}
                              </div>
                            </div>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                              {job.salary_range}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: UNIVERSITY CURRICULUM AUDIT */}
      {subTab === 'curriculum' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-5 bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('Đề cương chương trình đào tạo', 'Course Syllabus Input')}
            </h3>

            <input
              type="text"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
            />

            <textarea
              rows={6}
              value={syllabusText}
              onChange={(e) => setSyllabusText(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white leading-relaxed"
            />

            <button
              onClick={runCurriculumAudit}
              disabled={auditLoading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-amber-500 text-white dark:text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>{auditLoading ? t('Đang kiểm toán...', 'Auditing...') : t('Kiểm toán đề cương theo thị trường', 'Audit Syllabus')}</span>
            </button>
          </div>

          <div className="xl:col-span-7">
            {auditResult && (
              <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {auditResult.aligned_occupation}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {auditResult.program_name}
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">{t('Độ khớp thị trường', 'Alignment')}</div>
                    <div className="text-xl font-extrabold font-mono text-indigo-600 dark:text-amber-400">
                      {auditResult.market_alignment_score_pct}%
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2">
                    ✓ {t('Kỹ năng đã trang bị', 'Covered Skills')} ({auditResult.covered_skills?.length || 0}):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {auditResult.covered_skills?.map((sk: any) => (
                      <span
                        key={sk.esco_code}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-xs font-semibold"
                      >
                        ✓ {sk.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2">
                    ⚡ {t('Kỹ năng thực tiễn nên bổ sung:', 'Recommended Additions:')}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {auditResult.missing_high_demand_skills?.map((item: any) => (
                      <div
                        key={item.esco_code}
                        className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-slate-900 border border-amber-200/80 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-slate-900 dark:text-white truncate">{item.name}</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                          +{item.salary_premium_pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
