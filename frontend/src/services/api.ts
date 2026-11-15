const API_BASE = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_URL || '';

export async function fetchMacroOverview(industryCode = 'ALL', locationCode = 'ALL') {
  const params = new URLSearchParams();
  if (industryCode && industryCode !== 'ALL') params.set('industry_code', industryCode);
  if (locationCode && locationCode !== 'ALL') params.set('location_code', locationCode);
  const res = await fetch(`${API_BASE}/api/v1/analytics/overview?${params.toString()}`);
  if (!res.ok) throw new Error('Không thể tải dữ liệu thống kê tổng quan');
  return res.json();
}

export async function fetchSkillsIntelligence(category = 'ALL') {
  const params = new URLSearchParams();
  if (category && category !== 'ALL') params.set('category', category);
  const res = await fetch(`${API_BASE}/api/v1/analytics/skills?${params.toString()}`);
  if (!res.ok) throw new Error('Không thể tải dữ liệu kỹ năng ESCO');
  return res.json();
}

export async function fetchRegionalIntelligence() {
  const res = await fetch(`${API_BASE}/api/v1/analytics/regions`);
  if (!res.ok) throw new Error('Không thể tải dữ liệu phân tích vùng địa lý');
  return res.json();
}

export async function fetchFilterOptions() {
  const res = await fetch(`${API_BASE}/api/v1/analytics/filters`);
  if (!res.ok) throw new Error('Không thể tải bộ lọc');
  return res.json();
}

export async function searchJobs(paramsObj: Record<string, any>) {
  const params = new URLSearchParams();
  Object.entries(paramsObj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
      params.set(k, String(v));
    }
  });
  const res = await fetch(`${API_BASE}/api/v1/jobs?${params.toString()}`);
  if (!res.ok) throw new Error('Không thể tra cứu tin tuyển dụng');
  return res.json();
}

export async function analyzeVietnameseJD(payload: {
  title?: string;
  raw_text: string;
  location_hint?: string;
}) {
  const res = await fetch(`${API_BASE}/api/v1/ai/analyze-jd`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Lỗi khi phân tích NLP mô tả công việc');
  return res.json();
}

export async function predictSalaryML(payload: {
  normalized_title: string;
  industry_code: string;
  location_code: string;
  experience_level: string;
  years_of_experience: number;
  work_mode: string;
  skill_names: string[];
}) {
  const res = await fetch(`${API_BASE}/api/v1/ai/predict-salary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Lỗi khi dự báo mức lương bằng Machine Learning');
  return res.json();
}

export async function analyzeSkillGap(payload: {
  target_role: string;
  current_skills: string[];
  experience_years: number;
  target_location: string;
}) {
  const res = await fetch(`${API_BASE}/api/v1/ai/skill-gap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Lỗi khi phân tích khoảng cách kỹ năng');
  return res.json();
}

export async function askAIEconomist(
  question: string,
  history: string[] = [],
  geminiApiKey?: string
) {
  const res = await fetch(`${API_BASE}/api/v1/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      history,
      gemini_api_key: geminiApiKey ? geminiApiKey.trim() : undefined,
    }),
  });
  if (!res.ok) throw new Error('Lỗi khi kết nối Trợ lý AI');
  return res.json();
}

export async function evaluateCandidateProfile(payload: {
  raw_text: string;
  location_hint?: string;
  target_role?: string;
}) {
  const res = await fetch(`${API_BASE}/api/v1/ai/evaluate-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Lỗi khi chấm điểm hồ sơ ứng viên');
  return res.json();
}

export async function uploadAndEvaluateCVFile(payload: {
  filename: string;
  file_base64: string;
  location_hint?: string;
  target_role?: string;
}) {
  const res = await fetch(`${API_BASE}/api/v1/ai/parse-cv-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Lỗi khi đọc và phân tích tệp CV tải lên');
  return res.json();
}

export async function auditUniversityCurriculum(payload: {
  program_name?: string;
  syllabus_text: string;
}) {
  const res = await fetch(`${API_BASE}/api/v1/ai/audit-curriculum`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Lỗi khi kiểm toán đề cương đào tạo');
  return res.json();
}

export async function calculateGrossToNetSCOLI(payload: {
  gross_salary_vnd: number;
  dependents: number;
  location_code: string;
}) {
  const res = await fetch(`${API_BASE}/api/v1/analytics/gross-to-net`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Lỗi khi tính lương Gross sang Net & SCOLI');
  return res.json();
}

export async function fetchETLStatus() {
  const res = await fetch(`${API_BASE}/api/v1/etl/status`);
  if (!res.ok) throw new Error('Không thể tải trạng thái ETL Pipeline');
  return res.json();
}

export async function triggerETLPipeline(payload: {
  source_platform: string;
  sample_size: number;
  raw_html_or_text?: string;
}) {
  const res = await fetch(`${API_BASE}/api/v1/etl/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Không thể kích hoạt luồng thu thập dữ liệu');
  return res.json();
}

