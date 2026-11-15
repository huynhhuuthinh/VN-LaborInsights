import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell
} from 'recharts';
import { BarChart3, Sparkles, Table2, Cpu, Leaf, Wrench, Users } from 'lucide-react';
import { fetchSkillsIntelligence } from '../services/api';
import { useSettings } from '../context/SettingsContext';

const CATEGORY_COLORS: Record<string, string> = {
  'Digital & AI': '#2563EB',
  'Green & ESG': '#059669',
  'Technical / Hard Skill': '#D97706',
  'Soft & Management': '#7C3AED',
};

const FALLBACK_SKILLS_DATA = {
  category_overview: [
    { category: 'Digital & AI', total_mentions: 1840, avg_growth_yoy: 28.1 },
    { category: 'Green & ESG', total_mentions: 620, avg_growth_yoy: 28.2 },
    { category: 'Technical / Hard Skill', total_mentions: 510, avg_growth_yoy: 17.9 },
    { category: 'Soft & Management', total_mentions: 790, avg_growth_yoy: 18.0 },
  ],
  skills: [
    { esco_code: 'ESCO.S1.01', name: 'Python', name_vi: 'Lập trình Python & Xử lý dữ liệu', category: 'Digital & AI', job_count: 412, demand_growth_yoy: 28.5, salary_premium_pct: 18.0, is_emerging: true },
    { esco_code: 'ESCO.S1.04', name: 'PostgreSQL / SQL', name_vi: 'Quản trị Cơ sở dữ liệu SQL & PostgreSQL', category: 'Digital & AI', job_count: 386, demand_growth_yoy: 17.8, salary_premium_pct: 13.5, is_emerging: false },
    { esco_code: 'ESCO.M4.02', name: 'English / Bilingual Communication', name_vi: 'Giao tiếp Tiếng Anh trong công việc', category: 'Soft & Management', job_count: 340, demand_growth_yoy: 16.8, salary_premium_pct: 19.5, is_emerging: false },
    { esco_code: 'ESCO.S1.02', name: 'FastAPI / RESTful API', name_vi: 'Xây dựng hệ thống Backend API', category: 'Digital & AI', job_count: 278, demand_growth_yoy: 31.2, salary_premium_pct: 16.5, is_emerging: true },
    { esco_code: 'ESCO.S1.03', name: 'React / TypeScript', name_vi: 'Phát triển giao diện Web hiện đại', category: 'Digital & AI', job_count: 264, demand_growth_yoy: 19.4, salary_premium_pct: 14.0, is_emerging: false },
    { esco_code: 'ESCO.S1.09', name: 'Power BI / Tableau', name_vi: 'Trực quan hóa dữ liệu & Báo cáo thông minh', category: 'Digital & AI', job_count: 245, demand_growth_yoy: 21.0, salary_premium_pct: 12.5, is_emerging: false },
    { esco_code: 'ESCO.G2.01', name: 'ArcGIS / QGIS & Spatial Analysis', name_vi: 'Bản đồ số GIS & Phân tích không gian', category: 'Green & ESG', job_count: 198, demand_growth_yoy: 26.8, salary_premium_pct: 17.5, is_emerging: true },
    { esco_code: 'ESCO.S1.05', name: 'Machine Learning (Scikit-learn)', name_vi: 'Học máy & Xây dựng mô hình dự báo', category: 'Digital & AI', job_count: 182, demand_growth_yoy: 36.4, salary_premium_pct: 26.0, is_emerging: true },
    { esco_code: 'ESCO.S1.07', name: 'Data Engineering & ETL', name_vi: 'Thu thập & Chuẩn hóa đường ống dữ liệu', category: 'Digital & AI', job_count: 174, demand_growth_yoy: 27.1, salary_premium_pct: 21.5, is_emerging: true },
    { esco_code: 'ESCO.G2.03', name: 'Carbon Accounting & ESG Reporting', name_vi: 'Kiểm kê khí nhà kính & Báo cáo bền vững ESG', category: 'Green & ESG', job_count: 156, demand_growth_yoy: 39.5, salary_premium_pct: 23.5, is_emerging: true },
    { esco_code: 'ESCO.S1.06', name: 'Vietnamese NLP / LLM', name_vi: 'Xử lý ngôn ngữ tự nhiên Tiếng Việt & AI tạo sinh', category: 'Digital & AI', job_count: 148, demand_growth_yoy: 44.8, salary_premium_pct: 31.0, is_emerging: true },
    { esco_code: 'ESCO.G2.02', name: 'Remote Sensing & Satellite Data', name_vi: 'Viễn thám & Phân tích ảnh vệ tinh', category: 'Green & ESG', job_count: 132, demand_growth_yoy: 24.2, salary_premium_pct: 19.0, is_emerging: true },
  ]
};

export const SkillIntelligenceView: React.FC = () => {
  const { t, expertMode } = useSettings();
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [subView, setSubView] = useState<'ranking' | 'matrix' | 'catalog'>('ranking');
  const [data, setData] = useState<any>(FALLBACK_SKILLS_DATA);

  useEffect(() => {
    fetchSkillsIntelligence(selectedCategory)
      .then((res) => {
        if (res && res.skills?.length) setData(res);
      })
      .catch(console.error);
  }, [selectedCategory]);

  const rawSkills = data?.skills?.length ? data.skills : FALLBACK_SKILLS_DATA.skills;
  const skills =
    selectedCategory === 'ALL'
      ? rawSkills
      : rawSkills.filter((s: any) => s.category === selectedCategory);
  const categories = data?.category_overview?.length
    ? data.category_overview
    : FALLBACK_SKILLS_DATA.category_overview;

  const getCategoryViLabel = (cat: string) => {
    if (cat === 'Digital & AI') return t('Công nghệ Số & AI', 'Digital & AI');
    if (cat === 'Green & ESG') return t('Môi trường, GIS & Xanh', 'Green & ESG');
    if (cat === 'Technical / Hard Skill') return t('Nghiệp vụ Kỹ thuật', 'Technical');
    if (cat === 'Soft & Management') return t('Ngoại ngữ & Quản lý', 'Soft & Management');
    return t('Tất cả nhóm kỹ năng', 'All Skills');
  };

  const getCategoryIcon = (cat: string) => {
    if (cat === 'Digital & AI') return <Cpu className="w-5 h-5" />;
    if (cat === 'Green & ESG') return <Leaf className="w-5 h-5" />;
    if (cat === 'Technical / Hard Skill') return <Wrench className="w-5 h-5" />;
    return <Users className="w-5 h-5" />;
  };

  return (
    <div className="space-y-5">
      {/* Thanh Tiêu Đề & Bộ Lọc Nhóm Kỹ Năng */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl px-5 py-4 shadow-2xs">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
            {t('Kỹ năng Nhà tuyển dụng Cần & Mức Cộng thêm Thu nhập', 'In-Demand Skills & Salary Boosts')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t(
              'Xem những kỹ năng nào xuất hiện nhiều nhất trong tin tuyển dụng và giúp người đi làm đàm phán lương tốt hơn.',
              'Discover which skills appear most frequently in job postings and help command higher pay.'
            )}
          </p>
        </div>

        {/* Sub-view Switcher */}
        <div className="inline-flex shrink-0 items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-xl p-1 self-start lg:self-auto">
          <button
            onClick={() => setSubView('ranking')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              subView === 'ranking'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-amber-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{t('Xếp hạng phổ biến', 'Top Skills')}</span>
          </button>

          <button
            onClick={() => setSubView('matrix')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              subView === 'matrix'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-amber-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('Biểu đồ Giá trị kỹ năng', 'Value Matrix')}</span>
          </button>

          <button
            onClick={() => setSubView('catalog')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              subView === 'catalog'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-amber-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>{t('Chi tiết từng kỹ năng', 'All Skills')} ({skills.length})</span>
          </button>
        </div>
      </div>

      {/* 4 Thẻ Nhóm Kỹ Năng (Bấm vào để lọc) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {categories.map((cat: any) => {
          const color = CATEGORY_COLORS[cat.category] || '#2563EB';
          const isSelected = selectedCategory === cat.category;
          return (
            <div
              key={cat.category}
              onClick={() => setSelectedCategory(isSelected ? 'ALL' : cat.category)}
              className={`cursor-pointer bg-white dark:bg-[#0D1322] border rounded-2xl p-4 shadow-2xs transition flex items-start gap-3.5 ${
                isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200/90 dark:border-slate-800/80 hover:border-indigo-400'
              }`}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${color}18`, color }}
              >
                {getCategoryIcon(cat.category)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {getCategoryViLabel(cat.category)}
                </div>
                <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {cat.total_mentions.toLocaleString('vi-VN')} {t('lượt yêu cầu', 'mentions')}
                </div>
                <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {t(`Nhu cầu tăng +${cat.avg_growth_yoy}%/năm`, `Demand up +${cat.avg_growth_yoy}%/yr`)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SUBVIEW 1: RANKING BAR CHART + TOP TĂNG TRƯỞNG */}
      {subView === 'ranking' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-8 bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t('12 Kỹ năng được doanh nghiệp yêu cầu nhiều nhất', 'Top 12 Most Requested Skills by Employers')}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {t('Số lượng tin tuyển dụng đang đòi hỏi từng kỹ năng.', 'Number of active job postings requiring each skill.')}
            </p>
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skills.slice(0, 12)} layout="vertical" margin={{ top: 5, right: 20, left: 25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" opacity={0.5} />
                  <XAxis type="number" tick={{ fill: '#475569', fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={175}
                    tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#F8FAFC',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="job_count" name={t('Số việc làm yêu cầu', 'Jobs requiring skill')} radius={[0, 6, 6, 0]}>
                    {skills.slice(0, 12).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || '#2563EB'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cột phải: Giải thích rõ kỹ năng nào tăng nhanh & kỹ năng nào giúp lương cao */}
          <div className="xl:col-span-4 space-y-4">
            <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-4 shadow-2xs">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('Kỹ năng đang tăng nhu cầu nhanh nhất', 'Fastest Growing Skills')}
              </h4>
              <p className="text-[11px] text-slate-500 mb-3">
                {t('Tốc độ tăng số lượng tin tuyển dụng so với năm trước', 'Year-over-year growth in job postings')}
              </p>
              <div className="space-y-2.5">
                {[...skills]
                  .sort((a: any, b: any) => (b.demand_growth_yoy || 0) - (a.demand_growth_yoy || 0))
                  .slice(0, 5)
                  .map((s: any, i: number) => (
                    <div key={s.esco_code}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {i + 1}. {s.name}
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                          {t(`Tăng +${s.demand_growth_yoy}%`, `+${s.demand_growth_yoy}%`)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{s.name_vi}</div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-4 shadow-2xs">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('Kỹ năng giúp tăng thu nhập tốt nhất', 'Skills With Highest Pay Boost')}
              </h4>
              <p className="text-[11px] text-slate-500 mb-3">
                {t('Mức lương cao hơn trung bình khi bạn thành thạo kỹ năng này', 'Average salary boost when you master this skill')}
              </p>
              <div className="space-y-2.5">
                {[...skills]
                  .sort((a: any, b: any) => (b.salary_premium_pct || 0) - (a.salary_premium_pct || 0))
                  .slice(0, 5)
                  .map((s: any, i: number) => (
                    <div key={s.esco_code}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {i + 1}. {s.name}
                        </span>
                        <span className="font-bold text-indigo-600 dark:text-amber-400 shrink-0 ml-2">
                          {t(`Lương cao hơn +${s.salary_premium_pct}%`, `+${s.salary_premium_pct}% pay`)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{s.name_vi}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 2: SCATTER MATRIX */}
      {subView === 'matrix' && (
        <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t('Biểu đồ tương quan: Tốc độ tăng nhu cầu & Mức cộng thêm thu nhập', 'Demand Growth vs. Salary Boost Matrix')}
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            {t('Các chấm càng nằm về góc trên bên phải thì kỹ năng đó vừa đang khát nhân lực, vừa trả lương cao.', 'Dots toward the top-right represent skills with both rapid demand growth and high salary boost.')}
          </p>
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 15, right: 25, bottom: 15, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" opacity={0.5} />
                <XAxis
                  type="number"
                  dataKey="demand_growth_yoy"
                  name={t('Tăng nhu cầu', 'Demand Growth')}
                  unit="%"
                  tick={{ fill: '#475569', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="salary_premium_pct"
                  name={t('Tăng thu nhập', 'Salary Boost')}
                  unit="%"
                  tick={{ fill: '#475569', fontSize: 11 }}
                />
                <ZAxis type="number" dataKey="job_count" range={[90, 420]} name={t('Số việc làm', 'Jobs')} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs shadow-xl text-white">
                          <div className="font-bold text-amber-400">{d.name}</div>
                          <div className="text-slate-300 text-[11px]">{d.name_vi}</div>
                          <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-200">
                            <div>{t('Tốc độ tăng nhu cầu:', 'Demand growth:')} <span className="text-emerald-400">+{d.demand_growth_yoy}%{t('/năm', '/yr')}</span></div>
                            <div>{t('Cộng thêm thu nhập:', 'Pay boost:')} <span className="text-amber-400">+{d.salary_premium_pct}%</span></div>
                            <div>{t('Số việc làm đang tuyển:', 'Open jobs:')} <strong>{d.job_count}</strong></div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Skills" data={skills}>
                  {skills.map((entry: any, idx: number) => (
                    <Cell key={`sc-${idx}`} fill={CATEGORY_COLORS[entry.category] || '#2563EB'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* SUBVIEW 3: SKILL CATALOG */}
      {subView === 'catalog' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {skills.map((sk: any) => (
            <div
              key={sk.esco_code}
              className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {sk.name}
                  </h4>
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0"
                    style={{
                      backgroundColor: `${CATEGORY_COLORS[sk.category] || '#2563EB'}18`,
                      color: CATEGORY_COLORS[sk.category] || '#2563EB'
                    }}
                  >
                    {getCategoryViLabel(sk.category)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sk.name_vi}</p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('Số tin tuyển dụng:', 'Open jobs:')}</span>
                  <strong className="text-slate-900 dark:text-white">{sk.job_count} {t('việc', 'jobs')}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('Giúp tăng thu nhập thêm:', 'Salary boost:')}</span>
                  <strong className="text-indigo-600 dark:text-amber-400">+{sk.salary_premium_pct}%</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('Mức tăng nhu cầu hàng năm:', 'Annual demand growth:')}</span>
                  <strong className="text-emerald-600 dark:text-emerald-400">+{sk.demand_growth_yoy}%{t('/năm', '/yr')}</strong>
                </div>
                {expertMode && (
                  <div className="pt-1 text-[10px] font-mono text-slate-400">
                    {t('Mã chuẩn Châu Âu:', 'ESCO Standard Code:')} {sk.esco_code}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
