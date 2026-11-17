import React, { useState, useEffect } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MapPin,
  Bookmark,
  Download
} from 'lucide-react';
import { searchJobs, fetchFilterOptions } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

const FALLBACK_FILTERS = {
  industries: [
    { code: 'IND-IT', name_vi: 'Công nghệ Thông tin, Phần mềm & AI' },
    { code: 'IND-ENV', name_vi: 'Tin học Tài nguyên, Môi trường, GIS & Năng lượng Xanh' },
    { code: 'IND-FIN', name_vi: 'Tài chính, Ngân hàng, Fintech & Bảo hiểm' },
  ],
  locations: [
    { code: 'VN-SG', name: 'TP. Hồ Chí Minh' },
    { code: 'VN-HN', name: 'Hà Nội' },
    { code: 'VN-DN', name: 'Đà Nẵng' },
  ],
  skills: [
    { esco_code: 'ESCO.S1.01', name: 'Python' },
    { esco_code: 'ESCO.S1.02', name: 'FastAPI / RESTful API' },
    { esco_code: 'ESCO.S2.01', name: 'ArcGIS / QGIS & Spatial Analysis' },
  ],
  experience_levels: ['Intern / Fresher', 'Junior (1-2 năm)', 'Mid-level (2-4 năm)', 'Senior (5+ năm)', 'Lead / Manager'],
};

const FALLBACK_JOBS = {
  total: 2,
  page: 1,
  total_pages: 1,
  items: [
    {
      id: 1,
      title: 'Kỹ sư Phân tích Dữ liệu Không gian GIS & Python (WebGIS)',
      company_name: 'FPT Information System (FPT IS)',
      location_name: 'TP. Hồ Chí Minh',
      work_mode: 'Hybrid',
      salary_min_vnd: 20,
      salary_max_vnd: 30,
      experience_level: 'Mid-level (2-4 năm)',
      source_platform: 'ITviec',
      posted_date: '2026-10-28',
      skills: [
        { esco_code: 'ESCO.S2.01', name: 'ArcGIS / QGIS & Spatial Analysis' },
        { esco_code: 'ESCO.S1.01', name: 'Python' },
        { esco_code: 'ESCO.S1.04', name: 'PostgreSQL / SQL' },
      ],
    },
    {
      id: 2,
      title: 'Backend Engineer (Python / FastAPI / PostgreSQL)',
      company_name: 'VNG Corporation',
      location_name: 'TP. Hồ Chí Minh',
      work_mode: 'Hybrid',
      salary_min_vnd: 24,
      salary_max_vnd: 38,
      experience_level: 'Mid-level (2-4 năm)',
      source_platform: 'TopCV',
      posted_date: '2026-10-27',
      skills: [
        { esco_code: 'ESCO.S1.01', name: 'Python' },
        { esco_code: 'ESCO.S1.02', name: 'FastAPI / RESTful API' },
        { esco_code: 'ESCO.S1.08', name: 'Cloud & Docker / Kubernetes' },
      ],
    },
  ],
};

export const JobExplorerView: React.FC<{ onNavigateTab?: (tab: string) => void }> = ({
  onNavigateTab
}) => {
  const { t, expertMode } = useSettings();
  const { savedJobIds, savedJobs, toggleBookmark } = useAuth();
  const [filtersMeta, setFiltersMeta] = useState<any>(FALLBACK_FILTERS);
  const [onlySaved, setOnlySaved] = useState(false);

  const [queryText, setQueryText] = useState('');
  const [industryCode, setIndustryCode] = useState('ALL');
  const [locationCode, setLocationCode] = useState('ALL');
  const [experienceLevel, setExperienceLevel] = useState('ALL');
  const [skillName, setSkillName] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<any>(FALLBACK_JOBS);
  const [selectedJob, setSelectedJob] = useState<any>(FALLBACK_JOBS.items[0]);
  const [showRawJD, setShowRawJD] = useState(false);

  useEffect(() => {
    fetchFilterOptions()
      .then(setFiltersMeta)
      .catch(() => setFiltersMeta(FALLBACK_FILTERS));
  }, []);

  const runSearch = async (
    targetPage = page,
    overrides?: {
      q?: string;
      industry_code?: string;
      location_code?: string;
      experience_level?: string;
      skill_name?: string;
      sort_by?: string;
    }
  ) => {
    try {
      const data = await searchJobs({
        q: overrides?.q ?? queryText,
        industry_code: overrides?.industry_code ?? industryCode,
        location_code: overrides?.location_code ?? locationCode,
        experience_level: overrides?.experience_level ?? experienceLevel,
        skill_name: overrides?.skill_name ?? skillName,
        sort_by: overrides?.sort_by ?? sortBy,
        page: targetPage,
        page_size: 10
      });
      setResult(data);
      setSelectedJob(data.items?.length > 0 ? data.items[0] : null);
    } catch (e) {
      console.error(e);
      setResult(FALLBACK_JOBS);
      setSelectedJob(FALLBACK_JOBS.items[0]);
    }
  };

  const resetFilters = () => {
    setQueryText('');
    setIndustryCode('ALL');
    setLocationCode('ALL');
    setExperienceLevel('ALL');
    setSkillName('ALL');
    setSortBy('newest');
    setPage(1);
    runSearch(1, {
      q: '',
      industry_code: 'ALL',
      location_code: 'ALL',
      experience_level: 'ALL',
      skill_name: 'ALL',
      sort_by: 'newest'
    });
  };

  useEffect(() => {
    runSearch(1);
    setPage(1);
  }, [industryCode, locationCode, experienceLevel, skillName, sortBy]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setPage(1);
      runSearch(1);
    }
  };

  const displayedJobs = onlySaved ? savedJobs : result.items || [];

  const exportJobsCsv = () => {
    const rows = displayedJobs;
    if (!rows.length) return;
    const headers = [
      'Job Code',
      'Title',
      'Company',
      'Location',
      'Industry',
      'Experience',
      'Mode',
      'Salary Min (M)',
      'Salary Max (M)',
      'Skills'
    ];
    const csvLines = [headers.join(',')];
    for (const j of rows) {
      const skList = (j.skills || []).map((s: any) => s.name || s).join('; ');
      const cols = [
        j.job_code || j.job_id || j.id,
        j.title,
        j.company_name,
        j.location_name,
        j.industry_name,
        j.experience_level,
        j.work_mode,
        j.salary_min_vnd,
        j.salary_max_vnd,
        skList
      ].map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`);
      csvLines.push(cols.join(','));
    }
    const blob = new Blob(['\uFEFF' + csvLines.join('\n')], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = onlySaved ? 'vn_labor_saved_jobs.csv' : 'vn_labor_jobs_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Compact Search & Filter Bar (ITviec / LinkedIn style) */}
      <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {expertMode
                ? t('Tra cứu việc làm & Tin tuyển dụng chuẩn hóa', 'Job Explorer & Standardized Listings')
                : t('Tìm việc làm & Xem mức lương thực tế', 'Explore Jobs & Real Salary Ranges')}
            </h1>
            {!expertMode && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t(
                  'Chọn một công việc bên trái để xem kỹ năng nhà tuyển dụng cần, lưu việc yêu thích hoặc thử chấm điểm CV với AI.',
                  'Pick a job on the left to inspect required skills, bookmark roles, or score your CV match with AI.'
                )}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlySaved(!onlySaved)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                onlySaved
                  ? 'bg-indigo-600 text-white border-indigo-600 dark:bg-amber-500 dark:text-slate-950 dark:border-amber-500'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-500'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{t('Đã lưu', 'Saved')} ({savedJobIds.length})</span>
            </button>
            <button
              type="button"
              onClick={exportJobsCsv}
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 transition"
              title={t('Xuất danh sách hiện tại ra file CSV/Excel', 'Export current list to CSV')}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('Xuất CSV', 'Export CSV')}</span>
            </button>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 pl-1">
              <strong className="text-indigo-600 dark:text-amber-400 font-mono">
                {onlySaved ? displayedJobs.length : result.total}
              </strong>{' '}
              {t('việc làm', 'jobs')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-2.5">
          <div className="xl:col-span-2 flex gap-1.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('Chức danh, công ty, kỹ năng (Python, GIS, AI)...', 'Search title, company, skills...')}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setPage(1);
                runSearch(1);
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold shrink-0 transition"
            >
              {t('Tìm kiếm', 'Search')}
            </button>
          </div>

          <select
            value={industryCode}
            onChange={(e) => setIndustryCode(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">{t('Tất cả ngành', 'All Industries')}</option>
            {filtersMeta.industries?.map((i: any) => (
              <option key={i.code} value={i.code}>{i.name_vi}</option>
            ))}
          </select>

          <select
            value={locationCode}
            onChange={(e) => setLocationCode(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">{t('Tất cả tỉnh/thành', 'All Locations')}</option>
            {filtersMeta.locations?.map((l: any) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>

          <select
            value={experienceLevel}
            onChange={(e) => setExperienceLevel(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">{t('Tất cả cấp bậc', 'All Levels')}</option>
            {filtersMeta.experience_levels?.map((lv: string) => (
              <option key={lv} value={lv}>{lv}</option>
            ))}
          </select>

          <select
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">{t('Tất cả kỹ năng', 'All Skills')}</option>
            {filtersMeta.skills?.map((s: any) => (
              <option key={s.esco_code} value={s.name}>{s.name}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            <option value="newest">{t('Mới nhất', 'Newest')}</option>
            <option value="salary_desc">{t('Lương cao → thấp', 'Salary: High to Low')}</option>
            <option value="salary_asc">{t('Lương thấp → cao', 'Salary: Low to High')}</option>
          </select>
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Job List */}
        <div className="xl:col-span-7 space-y-2.5">
          {displayedJobs.length === 0 && (
            <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-8 text-center space-y-3 shadow-2xs">
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {onlySaved
                  ? t('Bạn chưa lưu công việc nào', 'No bookmarked jobs yet')
                  : t('Không tìm thấy việc làm phù hợp với bộ lọc hiện tại', 'No matching jobs found for the current filters')}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {onlySaved
                  ? t('Bấm nút Lưu trên từng tin tuyển dụng để theo dõi tại đây.', 'Click the Bookmark button on any job card to save it here.')
                  : t('Hãy thử nới lỏng từ khóa, đổi tỉnh/thành hoặc xóa bộ lọc để xem toàn bộ thị trường.', 'Try broadening your keyword, changing location, or resetting all filters.')}
              </p>
              <button
                type="button"
                onClick={() => (onlySaved ? setOnlySaved(false) : resetFilters())}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold transition"
              >
                {onlySaved ? t('Xem tất cả việc làm', 'Browse All Jobs') : t('Xóa bộ lọc', 'Reset Filters')}
              </button>
            </div>
          )}
          {displayedJobs.map((job: any) => {
            const jid = Number(job.job_id || job.id);
            const isSelected = Number(selectedJob?.job_id || selectedJob?.id) === jid;
            const isBookmarked = savedJobIds.includes(jid);
            const visibleSkills = job.skills?.slice(0, 4) || [];
            const extraSkills = Math.max(0, (job.skills?.length || 0) - 4);
            return (
              <div
                key={jid}
                onClick={() => setSelectedJob(job)}
                className={`cursor-pointer rounded-2xl p-4 border transition ${
                  isSelected
                    ? 'bg-indigo-50/70 dark:bg-amber-500/10 border-indigo-500 dark:border-amber-500 shadow-2xs'
                    : 'bg-white dark:bg-[#0D1322] border-slate-200/90 dark:border-slate-800/80 hover:border-slate-400'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {job.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {job.company_name} • <span className="font-semibold text-slate-700 dark:text-slate-200">{job.location_name}</span> • {job.work_mode}
                    </p>
                  </div>

                  <div className="flex items-start gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-mono font-extrabold text-indigo-600 dark:text-amber-400">
                        {job.salary_min_vnd}–{job.salary_max_vnd}tr
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {job.experience_level}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(job);
                      }}
                      className={`p-1.5 rounded-lg border transition ${
                        isBookmarked
                          ? 'bg-indigo-50 dark:bg-amber-500/20 border-indigo-300 dark:border-amber-500 text-indigo-600 dark:text-amber-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-600'
                      }`}
                      title={isBookmarked ? t('Bỏ lưu việc làm', 'Remove Bookmark') : t('Lưu việc làm này', 'Bookmark Job')}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {visibleSkills.map((sk: any) => (
                    <span
                      key={sk.esco_code}
                      className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      {sk.name}
                    </span>
                  ))}
                  {extraSkills > 0 && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800">
                      +{extraSkills}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-mono text-slate-500">
              {t('Trang', 'Page')} {result.page}/{result.total_pages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => {
                  const p = Math.max(1, page - 1);
                  setPage(p);
                  runSearch(p);
                }}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4 inline" />
              </button>
              <button
                disabled={page >= result.total_pages}
                onClick={() => {
                  const p = Math.min(result.total_pages, page + 1);
                  setPage(p);
                  runSearch(p);
                }}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4 inline" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Job Detail Panel */}
        <div className="xl:col-span-5">
          {selectedJob ? (
            <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs sticky top-20 space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>{selectedJob.source_platform}</span>
                  <span>{selectedJob.posted_date}</span>
                </div>
                <div className="flex items-start justify-between gap-2 mt-1">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedJob.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedJob.company_name} • {selectedJob.location_name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleBookmark(selectedJob)}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shrink-0 transition ${
                      savedJobIds.includes(Number(selectedJob.job_id || selectedJob.id))
                        ? 'bg-indigo-600 dark:bg-amber-500 border-indigo-600 dark:border-amber-500 text-white dark:text-slate-950'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${savedJobIds.includes(Number(selectedJob.job_id || selectedJob.id)) ? 'fill-current' : ''}`} />
                    <span>
                      {savedJobIds.includes(Number(selectedJob.job_id || selectedJob.id))
                        ? t('Đã lưu', 'Saved')
                        : t('Lưu tin', 'Save')}
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-400">{t('Mức lương', 'Salary')}</div>
                  <div className="text-sm font-mono font-bold text-indigo-600 dark:text-amber-400 mt-0.5">
                    {selectedJob.salary_min_vnd} – {selectedJob.salary_max_vnd} {t('triệu', 'M')}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-400">{t('Cấp bậc & Hình thức', 'Level & Mode')}</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedJob.experience_level} ({selectedJob.work_mode})
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-400">{t('Chức danh chuẩn', 'Standard Role')}</div>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                    {selectedJob.normalized_title}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-400">{t('Ngành', 'Industry')}</div>
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5 truncate">
                    {selectedJob.industry_name}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                  {t('Kỹ năng yêu cầu', 'Required Skills')} ({selectedJob.skills?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedJob.skills?.map((sk: any) => (
                    <span
                      key={sk.esco_code}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50/70 dark:bg-slate-900 border border-indigo-200/70 dark:border-slate-700 text-xs font-semibold text-indigo-700 dark:text-amber-300"
                    >
                      {sk.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setShowRawJD(!showRawJD)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 py-1"
                >
                  <span>{t('Mô tả công việc chi tiết (JD)', 'Job Description Text')}</span>
                  {showRawJD ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showRawJD && (
                  <p className="mt-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 leading-relaxed">
                    {selectedJob.description_raw}
                  </p>
                )}
              </div>

              {/* Action CTAs linking Job Explorer -> AI Lab & Regional Comparison */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem(
                      'vn_labor_cta_job',
                      JSON.stringify({
                        role: selectedJob.normalized_title,
                        location: selectedJob.location_name,
                        jd: selectedJob.description_raw,
                        title: selectedJob.title
                      })
                    );
                    onNavigateTab?.('ai-lab');
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('Đưa JD này sang Phòng AI để Chấm điểm CV', 'Send This JD to AI Lab for CV Scoring')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem(
                      'vn_labor_region_job',
                      JSON.stringify({
                        role: selectedJob.normalized_title,
                        location: selectedJob.location_name
                      })
                    );
                    onNavigateTab?.('regions');
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
                >
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{t('So sánh lương vị trí này theo vùng', 'Compare Salary by Region')}</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
