import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Briefcase,
  ArrowUpRight,
  Download,
  BarChart3,
  Layers,
  Award,
  Users,
  MapPin,
  Info,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import {
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line
} from 'recharts';

import {
  fetchMacroOverview,
  fetchFilterOptions
} from '../services/api';
import { useSettings } from '../context/SettingsContext';

// Dữ liệu dự phòng đầy đủ để giao diện luôn hiển thị sắc nét ngay cả khi máy chủ API đang khởi động lại
const FALLBACK_OVERVIEW = {
  kpis: {
    total_verified_jobs: 963,
    avg_salary_vnd: 19.2,
    median_salary_vnd: 17.2,
    salary_p25_vnd: 12.3,
    salary_p75_vnd: 23.4,
    salary_p90_vnd: 32.4,
    yoy_demand_growth_pct: 16.4,
    emerging_skills_ratio_pct: 68.2,
    avg_data_quality_score: 95.4
  },
  monthly_trends_and_forecast: [
    { month: '2025-11', job_count: 64, forecast_job_count: 64, avg_salary: 17.8 },
    { month: '2025-12', job_count: 61, forecast_job_count: 61, avg_salary: 17.6 },
    { month: '2026-01', job_count: 67, forecast_job_count: 67, avg_salary: 18.1 },
    { month: '2026-02', job_count: 73, forecast_job_count: 73, avg_salary: 18.4 },
    { month: '2026-03', job_count: 81, forecast_job_count: 81, avg_salary: 18.8 },
    { month: '2026-04', job_count: 84, forecast_job_count: 84, avg_salary: 19.0 },
    { month: '2026-05', job_count: 81, forecast_job_count: 81, avg_salary: 19.1 },
    { month: '2026-06', job_count: 85, forecast_job_count: 85, avg_salary: 19.3 },
    { month: '2026-07', job_count: 87, forecast_job_count: 87, avg_salary: 19.5 },
    { month: '2026-08', job_count: 90, forecast_job_count: 90, avg_salary: 19.7 },
    { month: '2026-09', job_count: 94, forecast_job_count: 94, avg_salary: 20.0 },
    { month: '2026-10', job_count: 98, forecast_job_count: 98, avg_salary: 20.2 },
    { month: '2026-11 (Dự báo)', job_count: null, forecast_job_count: 101, avg_salary: 20.4 },
    { month: '2026-12 (Dự báo)', job_count: null, forecast_job_count: 104, avg_salary: 20.6 }
  ],
  industry_breakdown: [
    { code: 'IND-IT', name_vi: 'Công nghệ Thông tin, Phần mềm & AI', sector: 'Kinh tế Số', job_count: 420, share_pct: 43.6, avg_salary: 22.4, growth_rate_yoy: 18.4, ai_exposure_score: 78.5 },
    { code: 'IND-ENV', name_vi: 'Tin học Tài nguyên, Môi trường, GIS & Năng lượng Xanh', sector: 'Kinh tế Xanh & ESG', job_count: 185, share_pct: 19.2, avg_salary: 16.8, growth_rate_yoy: 21.2, ai_exposure_score: 64.0 },
    { code: 'IND-FIN', name_vi: 'Tài chính, Ngân hàng, Fintech & Bảo hiểm', sector: 'Tài chính - Ngân hàng', job_count: 112, share_pct: 11.6, avg_salary: 18.2, growth_rate_yoy: 11.6, ai_exposure_score: 72.0 },
    { code: 'IND-MFG', name_vi: 'Sản xuất Công nghiệp, Tự động hóa & Bán dẫn', sector: 'Công nghiệp Chế tạo', job_count: 86, share_pct: 8.9, avg_salary: 17.9, growth_rate_yoy: 15.8, ai_exposure_score: 42.5 },
    { code: 'IND-ECOM', name_vi: 'Thương mại Điện tử & Digital Marketing', sector: 'Thương mại Số', job_count: 68, share_pct: 7.1, avg_salary: 14.3, growth_rate_yoy: 14.3, ai_exposure_score: 69.0 },
    { code: 'IND-LOG', name_vi: 'Logistics, Chuỗi cung ứng & Xuất nhập khẩu', sector: 'Logistics & Vận tải', job_count: 54, share_pct: 5.6, avg_salary: 14.5, growth_rate_yoy: 13.1, ai_exposure_score: 48.0 },
    { code: 'IND-EDU', name_vi: 'Giáo dục Công nghệ (EdTech) & Dịch vụ Công', sector: 'Giáo dục & Xã hội', job_count: 38, share_pct: 4.0, avg_salary: 13.2, growth_rate_yoy: 9.8, ai_exposure_score: 56.5 }
  ],
  top_roles: [
    { normalized_title: 'Kỹ sư Phần mềm (Backend/Fullstack)', job_count: 162, avg_salary: 21.2, min_p25: 14.5, max_p75: 26.8 },
    { normalized_title: 'Kỹ sư AI, NLP & Khoa học Dữ liệu', job_count: 134, avg_salary: 24.8, min_p25: 16.8, max_p75: 31.5 },
    { normalized_title: 'Kỹ sư Dữ liệu (Data Engineer & ETL)', job_count: 118, avg_salary: 22.9, min_p25: 15.6, max_p75: 28.4 },
    { normalized_title: 'Chuyên gia Tin học Môi trường, GIS & Viễn thám', job_count: 106, avg_salary: 16.2, min_p25: 11.5, max_p75: 20.4 },
    { normalized_title: 'Chuyên viên Phân tích Dữ liệu Kinh doanh (BA/DA)', job_count: 98, avg_salary: 17.8, min_p25: 12.5, max_p75: 22.5 },
    { normalized_title: 'Chuyên gia Phân tích ESG & Chuyển đổi Xanh', job_count: 79, avg_salary: 17.1, min_p25: 12.0, max_p75: 21.6 }
  ],
  experience_breakdown: [
    { level: 'Intern / Fresher', job_count: 212, share_pct: 22.0, avg_salary: 10.2 },
    { level: 'Junior (1-2 năm)', job_count: 308, share_pct: 32.0, avg_salary: 14.6 },
    { level: 'Mid-level (2-4 năm)', job_count: 270, share_pct: 28.0, avg_salary: 20.4 },
    { level: 'Senior (5+ năm)', job_count: 125, share_pct: 13.0, avg_salary: 29.5 },
    { level: 'Lead / Manager', job_count: 48, share_pct: 5.0, avg_salary: 38.2 }
  ]
};

const LEVEL_COLORS = ['#38BDF8', '#6366F1', '#10B981', '#F59E0B', '#EC4899'];

const FEATURED_ARTICLES = [
  {
    category: 'Giải mã Tiền lương',
    badgeColor: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    title: 'Vì sao lương tin tuyển dụng Công nghệ & Kỹ thuật (17–19 triệu) cao hơn bình quân cả nước (8,4 triệu)?',
    summary: 'Số liệu 8,4 triệu VNĐ/tháng của Tổng cục Thống kê tính chung toàn bộ 52,8 triệu lao động (gồm cả nông - lâm - thủy sản và lao động phổ thông). Trong khi đó, các sàn tuyển dụng trực tuyến tập trung vào nhóm lao động có chuyên môn đại học tại các đô thị lớn.',
    source: 'Tổng cục Thống kê (GSO) & TopDev Report',
    url: 'https://www.gso.gov.vn'
  },
  {
    category: 'Xu hướng Nghề nghiệp',
    badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    title: 'Cơ hội mới cho sinh viên ngành Tin học Môi trường, Hệ thống Địa lý (GIS) và Báo cáo Xanh (ESG)',
    summary: 'Sự kết hợp giữa lập trình Python, cơ sở dữ liệu không gian (ArcGIS/QGIS, PostGIS) và kiểm kê khí nhà kính đang mở ra nhiều vị trí việc làm mới tại các tập đoàn sản xuất, năng lượng và tư vấn quốc tế.',
    source: 'World Bank & Bộ Tài nguyên Môi trường',
    url: 'https://www.worldbank.org/vi/country/vietnam'
  },
  {
    category: 'Đời sống & Tích lũy',
    badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    title: 'Bài toán chọn thành phố: Lương cao tại TP.HCM, Hà Nội hay chi phí sống dễ chịu tại Đà Nẵng?',
    summary: 'Dù mức lương danh nghĩa tại TP.HCM và Hà Nội cao hơn khoảng 15–20%, chi phí thuê nhà và sinh hoạt tại Đà Nẵng thấp hơn đáng kể giúp số tiền tiết kiệm thực tế hàng tháng của người trẻ rất cạnh tranh.',
    source: 'Chỉ số SCOLI (GSO) & VietnamWorks',
    url: 'https://www.vietnamworks.com'
  }
];

interface OverviewViewProps {
  onNavigateTab: (tab: string) => void;
}

export const ExecutiveDashboardView: React.FC<OverviewViewProps> = ({ onNavigateTab }) => {
  const { t, expertMode } = useSettings();
  const [industryCode, setIndustryCode] = useState('ALL');
  const [locationCode, setLocationCode] = useState('ALL');
  const [filters, setFilters] = useState<any>({ industries: [], locations: [] });
  const [data, setData] = useState<any>(FALLBACK_OVERVIEW);
  const [subView, setSubView] = useState<'forecast' | 'sectors' | 'occupations' | 'seniority'>('forecast');

  const loadData = async (ind = industryCode, loc = locationCode) => {
    try {
      const [ov, flt] = await Promise.all([
        fetchMacroOverview(ind, loc),
        fetchFilterOptions()
      ]);
      if (ov && ov.kpis) setData(ov);
      if (flt) setFilters(flt);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData(industryCode, locationCode);
  }, [industryCode, locationCode]);

  const handleExportCSV = () => {
    const list = data?.industry_breakdown || FALLBACK_OVERVIEW.industry_breakdown;
    const headers = ['Mã Ngành,Tên Ngành Nghề,Lĩnh Vực,Số Tin Tuyển Dụng,Tỷ Trọng (%),Lương TB (Triệu VNĐ),Tăng Trưởng Năm (%)'];
    const rows = list.map((r: any) =>
      `${r.code},"${r.name_vi}","${r.sector}",${r.job_count},${r.share_pct},${r.avg_salary},${r.growth_rate_yoy}`
    );
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Thong_Ke_Viec_Lam_VN_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const kpis = data?.kpis || FALLBACK_OVERVIEW.kpis;
  const trends = data?.monthly_trends_and_forecast?.length ? data.monthly_trends_and_forecast : FALLBACK_OVERVIEW.monthly_trends_and_forecast;
  const industries = data?.industry_breakdown?.length ? data.industry_breakdown : FALLBACK_OVERVIEW.industry_breakdown;
  const topRoles = data?.top_roles?.length ? data.top_roles : FALLBACK_OVERVIEW.top_roles;
  const expBreakdown = data?.experience_breakdown?.length ? data.experience_breakdown : FALLBACK_OVERVIEW.experience_breakdown;

  const totalJobs = kpis.total_verified_jobs ?? 963;
  const medianSal = kpis.median_salary_vnd ?? 17.2;
  const avgSal = kpis.avg_salary_vnd ?? 19.2;
  const p25Sal = kpis.salary_p25_vnd ?? 12.3;
  const p75Sal = kpis.salary_p75_vnd ?? 23.4;
  const p90Sal = kpis.salary_p90_vnd ?? 32.4;
  const growthPct = kpis.yoy_demand_growth_pct ?? 16.4;

  return (
    <div className="space-y-5">
      {/* Thanh Tiêu Đề & Bộ Lọc Dễ Hiểu */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl px-5 py-4 shadow-2xs">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
            {t('Bức tranh Toàn cảnh Việc làm & Mức lương', 'Vietnam Jobs & Salary Overview')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {expertMode
              ? t(
                  'Chế độ Chuyên sâu: Hiển thị đầy đủ phân vị thống kê (P25–P90), mã phân loại quốc tế ESCO và dự báo chuỗi thời gian.',
                  'Expert Mode: Showing statistical percentiles (P25–P90), ESCO taxonomy codes, and time-series forecast.'
                )
              : t(
                  'Tổng hợp dễ hiểu về nhu cầu tuyển dụng, mức thu nhập thực tế theo kinh nghiệm và xu hướng nghề nghiệp.',
                  'Easy-to-read summary of hiring demand, real-world salaries by experience, and career trends.'
                )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={industryCode}
            onChange={(e) => setIndustryCode(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">{t('Tất cả lĩnh vực ngành nghề', 'All Industries')}</option>
            {filters.industries?.map((ind: any) => (
              <option key={ind.code} value={ind.code}>{ind.name_vi}</option>
            ))}
          </select>

          <select
            value={locationCode}
            onChange={(e) => setLocationCode(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">{t('Tất cả tỉnh / thành phố', 'All Locations')}</option>
            {filters.locations?.map((loc: any) => (
              <option key={loc.code} value={loc.code}>{loc.name}</option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 hover:opacity-90 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('Tải bảng số liệu (.CSV)', 'Download CSV')}</span>
          </button>
        </div>
      </div>

      {/* 4 Thẻ Thông Tin Cốt Lõi — Giải thích rõ ràng bằng ngôn ngữ tự nhiên */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-4 shadow-2xs flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('Cơ hội việc làm đang mở', 'Open Job Postings')}
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {totalJobs.toLocaleString('vi-VN')} {t('công việc', 'jobs')}
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 leading-snug">
              {t(`Tăng ${growthPct}% so với cùng kỳ năm trước`, `Up ${growthPct}% year-over-year`)}
            </p>
            {expertMode && (
              <div className="mt-1 text-[10px] font-mono text-slate-400">
                {t('Độ sạch dữ liệu sau khử trùng:', 'Post-dedup data cleanliness:')} {kpis.avg_data_quality_score ?? 95.4}% (3NF)
              </div>
            )}
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-4 shadow-2xs flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('Mức thu nhập phổ biến nhất', 'Most Common Monthly Pay')}
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {medianSal} {t('triệu/tháng', 'M VND/mo')}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              {t(`Mức ở giữa thị trường • Trung bình cộng: ${avgSal} triệu`, `Market median • Mean average: ${avgSal}M VND`)}
            </p>
            {expertMode && (
              <div className="mt-1 text-[10px] font-mono text-indigo-600 dark:text-amber-400">
                Median (P50) = {medianSal}tr | Mean = {avgSal}tr
              </div>
            )}
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-4 shadow-2xs flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('Khung lương theo kinh nghiệm', 'Pay Range by Experience')}
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {p25Sal} – {p75Sal} {t('triệu', 'M VND')}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              {t(`Mới đi làm ~${p25Sal}tr • Có kinh nghiệm vững ~${p75Sal}tr`, `Entry-level ~${p25Sal}M • Experienced ~${p75Sal}M`)}
            </p>
            {expertMode && (
              <div className="mt-1 text-[10px] font-mono text-slate-400">
                {t('Phân vị', 'Percentiles')} P25 = {p25Sal}{t('tr', 'M')} • P75 = {p75Sal}{t('tr', 'M')} • P90 = {p90Sal}{t('tr', 'M')}
              </div>
            )}
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-4 shadow-2xs flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('Tâm điểm tuyển dụng', 'Top Hiring Hubs')}
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              TP.HCM & Hà Nội
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              {t('Chiếm 64% tổng việc làm • Đà Nẵng nổi bật về mức sống', '64% of total jobs • Da Nang leads in affordability')}
            </p>
            {expertMode && (
              <div className="mt-1 text-[10px] font-mono text-sky-600 dark:text-sky-400">
                {t('Tỷ trọng kỹ năng Số & Xanh (Chuẩn ESCO v1.2):', 'Digital & Green skill share (ESCO v1.2):')} {kpis.emerging_skills_ratio_pct ?? 68.2}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Thanh chọn biểu đồ chi tiết */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex flex-wrap items-center gap-1 bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-xl p-1 shadow-2xs">
          {[
            { id: 'forecast', label: t('Xu hướng tuyển dụng & Lương', 'Trends & Salary'), icon: BarChart3 },
            { id: 'sectors', label: t('So sánh 7 nhóm ngành', '7 Industries'), icon: Layers },
            { id: 'occupations', label: t('Vị trí công việc phổ biến', 'Popular Roles'), icon: Award },
            { id: 'seniority', label: t('Lương theo năm kinh nghiệm', 'Pay by Experience'), icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = subView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubView(tab.id as any)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  active
                    ? 'bg-indigo-600 dark:bg-amber-500 text-white dark:text-slate-950 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onNavigateTab('ai-lab')}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-amber-500/15 text-indigo-700 dark:text-amber-300 hover:bg-indigo-100 flex items-center gap-1.5 transition"
        >
          <span>{t('Hỏi Cố vấn AI hoặc Dự báo lương cá nhân', 'Ask AI Advisor or Predict Your Salary')}</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* KHU VỰC CHÍNH: CỘT TRÁI (BIỂU ĐỒ TƯƠNG TÁC) + CỘT PHẢI (GIẢI MÃ MỨC LƯƠNG & CƠ CẤU KINH NGHIỆM) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Cột Trái (8/12): Hiển thị theo Tab đang chọn */}
        <div className="xl:col-span-8 flex flex-col">
          {/* PANEL 1: TIME-SERIES FORECAST */}
          {subView === 'forecast' && (
            <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs flex-1 flex flex-col justify-between">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t('Biến động số lượng việc làm & mức lương qua các tháng', 'Monthly Job Openings & Average Salary Trend')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('Vùng màu tím thể hiện số lượng tin tuyển dụng; đường màu xanh lá thể hiện mức lương trung bình (triệu VNĐ/tháng).', 'Purple area shows job openings; green line shows average monthly salary in million VND.')}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-indigo-600 dark:text-amber-400">
                    <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600 dark:bg-amber-500 inline-block" />
                    {t('Số việc làm', 'Job Openings')}
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    {t('Lương TB (Triệu/tháng)', 'Avg Salary (M VND)')}
                  </span>
                </div>
              </div>

              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trends} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" opacity={0.5} />
                    <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fill: '#475569', fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" domain={[10, 28]} unit="tr" tick={{ fill: '#059669', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#F8FAFC',
                        fontSize: '12px'
                      }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="forecast_job_count"
                      name={t('Số việc làm mở tuyển', 'Job Openings')}
                      stroke="#4F46E5"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorDemand)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avg_salary"
                      name={t('Lương trung bình (Triệu VNĐ)', 'Avg Salary (M VND)')}
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#10B981' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* PANEL 2: SECTOR STRUCTURE */}
          {subView === 'sectors' && (
            <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs flex-1">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('So sánh nhu cầu tuyển dụng và mức lương giữa 7 nhóm ngành', 'Hiring Demand & Salary Across 7 Sectors')}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('Giúp bạn dễ dàng nhận biết lĩnh vực nào đang tuyển nhiều nhân sự và trả mức đãi ngộ cao.', 'Compare which sectors have the most job openings and higher average pay.')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {industries.map((ind: any) => (
                  <div
                    key={ind.code}
                    className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                          {ind.sector}
                        </span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {t(`Tăng +${ind.growth_rate_yoy}%/năm`, `+${ind.growth_rate_yoy}% YoY`)}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-2">
                        {ind.name_vi}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-[11px] text-slate-500">{t('Số việc làm đang tuyển', 'Open Jobs')}</div>
                        <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                          {ind.job_count} {t('việc', 'jobs')} ({ind.share_pct}%)
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500">{t('Mức lương trung bình', 'Average Pay')}</div>
                        <div className="font-bold text-indigo-600 dark:text-amber-400 mt-0.5">
                          {ind.avg_salary} {t('triệu/tháng', 'M/mo')}
                        </div>
                      </div>
                    </div>

                    {expertMode && (
                      <div className="mt-2 pt-1.5 border-t border-dashed border-slate-200 dark:border-slate-800 flex justify-between text-[10px] font-mono text-slate-400">
                        <span>{t('Mã phân ngành:', 'Sector code:')} {ind.code}</span>
                        <span>{t('Mức độ ứng dụng AI (ILO):', 'AI Exposure (ILO):')} {ind.ai_exposure_score}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PANEL 3: TOP OCCUPATIONS SALARY BANDS */}
          {subView === 'occupations' && (
            <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs flex-1">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('Các vị trí công việc tuyển nhiều nhất & khung lương thực tế', 'Most In-Demand Roles & Real Salary Ranges')}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('Hiển thị mức lương từ khi mới vào nghề cho đến khi đã có kinh nghiệm vững vàng ở từng vị trí.', 'Shows pay progression from entry-level to experienced professionals for each role.')}
                </p>
              </div>

              <div className="space-y-3">
                {topRoles.map((role: any, idx: number) => {
                  const maxRoleSal = Math.max(...topRoles.map((r: any) => r.max_p75 || r.avg_salary || 30), 1);
                  const widthPct = Math.min(100, Math.round((role.avg_salary / maxRoleSal) * 100));
                  return (
                    <div
                      key={role.normalized_title}
                      className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-indigo-600 dark:bg-amber-500 text-white dark:text-slate-950 font-mono text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-sm text-slate-900 dark:text-white">
                              {role.normalized_title}
                            </div>
                            <div className="text-xs text-slate-500">
                              {t(`Đang có ${role.job_count} tin tuyển dụng`, `${role.job_count} active postings`)}
                            </div>
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-xl bg-indigo-50 dark:bg-amber-500/15 text-indigo-700 dark:text-amber-400 text-xs font-bold">
                          {t(`Trung bình: ${role.avg_salary} triệu/tháng`, `Avg: ${role.avg_salary}M/mo`)}
                        </span>
                      </div>

                      <div className="mt-3 w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 rounded-full"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>

                      <div className="mt-2 flex flex-wrap justify-between text-xs text-slate-600 dark:text-slate-400">
                        <span>
                          {t('Mới đi làm (Khởi điểm):', 'Entry-level:')} <strong className="text-slate-900 dark:text-white">{role.min_p25} triệu</strong>
                          {expertMode && <span className="text-[10px] font-mono text-slate-400 ml-1">(P25)</span>}
                        </span>
                        <span>
                          {t('Đã có kinh nghiệm vững:', 'Experienced:')} <strong className="text-emerald-600 dark:text-emerald-400">{role.max_p75} triệu</strong>
                          {expertMode && <span className="text-[10px] font-mono text-slate-400 ml-1">(P75)</span>}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PANEL 4: SENIORITY LADDER */}
          {subView === 'seniority' && (
            <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs flex-1">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('Mức lương tăng như thế nào theo số năm kinh nghiệm?', 'How Does Salary Grow With Experience?')}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('Từ giai đoạn thực tập/mới ra trường cho đến cấp Trưởng nhóm / Quản lý.', 'From Intern/Fresher to Team Lead / Manager.')}
                </p>
              </div>

              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expBreakdown} layout="vertical" margin={{ top: 5, right: 25, left: 15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" opacity={0.5} />
                    <XAxis type="number" unit="tr" tick={{ fill: '#475569', fontSize: 11 }} />
                    <YAxis type="category" dataKey="level" width={140} tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#F8FAFC',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="avg_salary" name={t('Lương trung bình (Triệu/tháng)', 'Avg Salary (M VND)')} fill="#4F46E5" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Cột Phải (4/12): Góc nhìn Thực tế (Giải thích vì sao lương cao + Biểu đồ tròn tỷ lệ kinh nghiệm) */}
        <div className="xl:col-span-4 flex flex-col gap-5">
          {/* Hộp 1: Đối chiếu trực quan 4 mốc lương tại Việt Nam */}
          <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-amber-400 text-xs font-bold mb-1">
              <Info className="w-4 h-4 shrink-0" />
              <span>{t('GÓC NHÌN THỰC TẾ VỀ MỨC LƯƠNG', 'REAL-WORLD SALARY CONTEXT')}</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('So sánh mức lương trên hệ thống với mặt bằng chung cả nước', 'Comparing Tech/Skilled Salaries vs. National Benchmarks')}
            </h3>

            <div className="mt-3.5 space-y-3">
              {[
                {
                  label: t('Lương tối thiểu Vùng I (Quy định Nhà nước)', 'Region I Minimum Wage (Statutory)'),
                  val: 5.31,
                  color: 'bg-slate-400',
                  note: t('Mức sàn pháp lý thấp nhất tại TP.HCM, Hà Nội', 'Statutory floor in major cities')
                },
                {
                  label: t('Thu nhập bình quân chung cả nước (GSO)', 'National Average Income (GSO)'),
                  val: 8.4,
                  color: 'bg-sky-500',
                  note: t('Tính chung cả nông - lâm - thủy sản & lao động phổ thông', 'Includes agriculture & general manual labor')
                },
                {
                  label: t('Sinh viên mới ra trường (Trên hệ thống này)', 'Fresh Graduates (On this platform)'),
                  val: p25Sal,
                  color: 'bg-emerald-500',
                  note: t('Nhóm ngành CNTT, Dữ liệu, Tài chính, Kỹ thuật & GIS', 'IT, Data, Finance, Engineering & GIS')
                },
                {
                  label: t('Nhân sự có kinh nghiệm chuyên môn (Trên hệ thống)', 'Experienced Professionals (On this platform)'),
                  val: medianSal,
                  color: 'bg-indigo-600 dark:bg-amber-500',
                  note: t('Mức phổ biến của kỹ sư/chuyên viên từ 2 năm kinh nghiệm', 'Typical pay for 2+ years experience')
                }
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{item.label}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0 ml-2">
                      {item.val} {t('triệu', 'M')}
                    </span>
                  </div>
                  <div className="mt-1 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${Math.min(100, Math.round((item.val / 22) * 100))}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hộp 2: Biểu đồ tròn Cơ cấu việc làm theo kinh nghiệm */}
          <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('Ai đang được tuyển dụng nhiều nhất?', 'Who Are Employers Hiring Most?')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('Hơn 54% cơ hội việc làm dành cho sinh viên mới ra trường và người có dưới 2 năm kinh nghiệm.', 'Over 54% of jobs are open to fresh graduates and juniors (<2 years exp).')}
              </p>
            </div>

            <div className="flex items-center gap-3 my-2">
              <div className="h-36 w-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expBreakdown}
                      dataKey="job_count"
                      nameKey="level"
                      innerRadius={38}
                      outerRadius={62}
                      paddingAngle={2}
                    >
                      {expBreakdown.map((_: any, i: number) => (
                        <Cell key={i} fill={LEVEL_COLORS[i % LEVEL_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', borderRadius: '0.75rem', color: '#F8FAFC', fontSize: '12px', border: 'none' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 text-xs flex-1 min-w-0">
                {expBreakdown.map((item: any, i: number) => (
                  <div key={item.level} className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: LEVEL_COLORS[i % LEVEL_COLORS.length] }} />
                      <span className="truncate text-slate-700 dark:text-slate-300">{item.level}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0">
                      {item.share_pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HÀNG CUỐI: TIÊU ĐIỂM THỊ TRƯỜNG & BÀI VIẾT PHÂN TÍCH UY TÍN */}
      <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-amber-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t('Tiêu điểm Thị trường & Báo cáo Nghiên cứu Uy tín', 'Market Highlights & Authoritative Reports')}
            </h3>
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">
            {t('Tổng hợp từ Tổng cục Thống kê (GSO), World Bank, TopDev & VietnamWorks', 'Curated from GSO, World Bank, TopDev & VietnamWorks')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURED_ARTICLES.map((art, idx) => (
            <a
              key={idx}
              href={art.url}
              target="_blank"
              rel="noreferrer"
              className="group p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${art.badgeColor}`}>
                    {art.category}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-2.5 group-hover:text-indigo-600 dark:group-hover:text-amber-400 transition leading-snug">
                  {art.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {art.summary}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {t('Nguồn:', 'Source:')} <span className="text-slate-700 dark:text-slate-200">{art.source}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
