import React, { useState, useEffect } from 'react';
import {
  Play,
  CheckCircle2,
  RefreshCw,
  Database,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  FilePlus2,
  History
} from 'lucide-react';
import { fetchETLStatus, triggerETLPipeline } from '../services/api';
import { useSettings } from '../context/SettingsContext';

const DEFAULT_SOURCES_FALLBACK = [
  {
    id: 'SRC-GSO',
    name: 'Tổng cục Thống kê Việt Nam (GSO)',
    category: 'Cơ quan Thống kê & Quốc tế',
    data_type: 'Điều tra Lao động Việc làm & Chỉ số giá sinh hoạt (SCOLI)',
    frequency: 'Hàng quý',
    reliability: '99.8%',
    official_url: 'https://www.gso.gov.vn'
  },
  {
    id: 'SRC-ILO',
    name: 'Tổ chức Lao động Quốc tế (ILO & OECD)',
    category: 'Cơ quan Thống kê & Quốc tế',
    data_type: 'Báo cáo Tiền lương, Năng suất & Khung Kỹ năng ESCO',
    frequency: 'Thường niên',
    reliability: '99.5%',
    official_url: 'https://www.ilo.org/vi'
  },
  {
    id: 'SRC-MOLISA',
    name: 'Bộ Lao động – TB&XH (MOLISA)',
    category: 'Cơ quan Thống kê & Quốc tế',
    data_type: 'Bản tin Thị trường Lao động Việt Nam',
    frequency: 'Hàng quý',
    reliability: '99.6%',
    official_url: 'https://www.molisa.gov.vn'
  },
  {
    id: 'SRC-WB-ADB',
    name: 'World Bank & ADB Vietnam',
    category: 'Cơ quan Thống kê & Quốc tế',
    data_type: 'Báo cáo Kinh tế Số, Việc làm Xanh & ESG',
    frequency: 'Thường niên',
    reliability: '99.4%',
    official_url: 'https://www.worldbank.org/vi/country/vietnam'
  },
  {
    id: 'SRC-TOPCV-VNW',
    name: 'TopCV & VietnamWorks',
    category: 'Sàn Tuyển dụng Trực tuyến',
    data_type: 'Tin tuyển dụng đa ngành & Báo cáo Nhân sự',
    frequency: 'Thời gian thực',
    reliability: '98.2%',
    official_url: 'https://www.vietnamworks.com'
  },
  {
    id: 'SRC-ITVIEC-TOPDEV',
    name: 'ITviec & TopDev Vietnam',
    category: 'Sàn Tuyển dụng Trực tuyến',
    data_type: 'Khảo sát Lương Phần mềm, Dữ liệu & AI',
    frequency: 'Thời gian thực',
    reliability: '98.8%',
    official_url: 'https://itviec.com/report'
  },
  {
    id: 'SRC-LINKEDIN-GLINTS',
    name: 'LinkedIn & Glints Đông Nam Á',
    category: 'Sàn Tuyển dụng Trực tuyến',
    data_type: 'Nhân tài Quốc tế & Việc làm Hybrid / Remote',
    frequency: 'Thời gian thực',
    reliability: '97.9%',
    official_url: 'https://www.linkedin.com'
  },
  {
    id: 'SRC-CAREERVIET-JOBSGO',
    name: 'CareerViet & JobsGO',
    category: 'Sàn Tuyển dụng Trực tuyến',
    data_type: 'Tuyển dụng Khu Công nghiệp, Sản xuất & Logistics',
    frequency: 'Thời gian thực',
    reliability: '97.5%',
    official_url: 'https://careerviet.vn'
  },
  {
    id: 'SRC-RW-MP',
    name: 'Robert Walters & Michael Page',
    category: 'Báo cáo Lương & Chuyên ngành',
    data_type: 'Định chuẩn Lương Chuyên gia & Quản lý (P75–P90)',
    frequency: 'Thường niên',
    reliability: '99.1%',
    official_url: 'https://www.robertwalters.com.vn'
  },
  {
    id: 'SRC-MONRE-GIS',
    name: 'Cổng Dữ liệu Tài nguyên Môi trường & GIS',
    category: 'Báo cáo Lương & Chuyên ngành',
    data_type: 'Tin học Môi trường, Viễn thám, GIS & Tín chỉ Carbon',
    frequency: 'Hàng tháng',
    reliability: '98.9%',
    official_url: 'https://monre.gov.vn'
  },
  {
    id: 'SRC-VINASA-MIC',
    name: 'Hiệp hội Phần mềm VINASA & Bộ TT&TT',
    category: 'Báo cáo Lương & Chuyên ngành',
    data_type: 'Nhân lực Bán dẫn, Điện toán Đám mây & AI',
    frequency: 'Hàng quý',
    reliability: '99.2%',
    official_url: 'https://www.vinasa.org.vn'
  }
];

export const ETLPipelineMonitorView: React.FC = () => {
  const { t } = useSettings();
  const [statusData, setStatusData] = useState<any>(null);
  const [subTab, setSubTab] = useState<'catalog' | 'add-custom' | 'history'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const [sourcePlatform, setSourcePlatform] = useState('TopCV & VietnamWorks');
  const [customSourceName, setCustomSourceName] = useState('');
  const [sampleSize, setSampleSize] = useState(25);
  const [customJobText, setCustomJobText] = useState('');
  const [running, setRunning] = useState(false);
  const [latestRunResult, setLatestRunResult] = useState<any>(null);

  const loadStatus = async () => {
    try {
      const res = await fetchETLStatus();
      setStatusData(res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleRunETL = async (overrideSource?: string, overrideText?: string) => {
    setRunning(true);
    const activeSource =
      overrideSource ||
      (customSourceName.trim() ? customSourceName.trim() : sourcePlatform);
    try {
      const res = await triggerETLPipeline({
        source_platform: activeSource,
        sample_size: sampleSize,
        raw_html_or_text: overrideText !== undefined ? overrideText : undefined
      });
      setLatestRunResult(res);
      await loadStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setRunning(false);
    }
  };

  const summary = statusData?.pipeline_summary || {};
  const catalog: any[] =
    statusData?.data_sources_catalog?.length > 0
      ? statusData.data_sources_catalog
      : DEFAULT_SOURCES_FALLBACK;
  const history = statusData?.run_history || [];

  const filteredCatalog =
    selectedCategory === 'ALL'
      ? catalog
      : catalog.filter((item) => item.category === selectedCategory);

  return (
    <div className="space-y-5">
      {/* Compact Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl px-5 py-3.5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">
            {t('Nguồn dữ liệu & Đồng bộ ETL', 'Data Sources & ETL Sync')}
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-amber-300">
            {summary.total_clean_records_in_db || 960} {t('bản ghi', 'records')}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
            {summary.average_data_quality_pct || 96.4}% {t('sạch', 'clean')}
          </span>
        </div>

        <div className="inline-flex shrink-0 flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          <button
            onClick={() => setSubTab('catalog')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              subTab === 'catalog'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-amber-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{t('11 Nguồn tích hợp', '11 Sources')}</span>
          </button>

          <button
            onClick={() => setSubTab('add-custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              subTab === 'add-custom'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-amber-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{t('Thêm dữ liệu', 'Add Data')}</span>
          </button>

          <button
            onClick={() => setSubTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              subTab === 'history'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-amber-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{t('Nhật ký', 'Sync Logs')}</span>
          </button>
        </div>
      </div>

      {/* Compact Ingestion Toast Notification */}
      {latestRunResult && (
        <div className="bg-emerald-50/90 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <strong className="text-emerald-700 dark:text-emerald-400 font-mono mr-2">✓ {latestRunResult.run_code}</strong>
            <span className="text-slate-800 dark:text-slate-200">
              {t('Đã đồng bộ thêm', 'Synced')} <strong>+{latestRunResult.metrics?.records_cleaned_and_stored}</strong> {t('bản ghi từ', 'records from')} <strong>{latestRunResult.source_platform}</strong>
            </span>
          </div>
          <span className="font-mono text-emerald-700 dark:text-emerald-300">
            {latestRunResult.metrics?.total_duration_ms} ms
          </span>
        </div>
      )}

      {/* TAB 1: COMPACT 11 DATA SOURCES CATALOG */}
      {subTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: t('Tất cả (11)', 'All (11)') },
              { id: 'Cơ quan Thống kê & Quốc tế', label: t('Thống kê & Quốc tế', 'Statistical & Intl') },
              { id: 'Sàn Tuyển dụng Trực tuyến', label: t('Sàn Tuyển dụng', 'Job Portals') },
              { id: 'Báo cáo Lương & Chuyên ngành', label: t('Báo cáo Chuyên ngành', 'Specialized Reports') }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950'
                    : 'bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredCatalog.map((src: any) => (
              <div
                key={src.id}
                className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:border-indigo-400 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                      {src.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      <ShieldCheck className="w-3 h-3" />
                      {src.reliability}
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-2">
                    {src.name}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                    {src.data_type}
                  </p>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleRunETL(src.name)}
                    disabled={running}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 dark:bg-slate-800 dark:hover:bg-amber-500 text-white dark:hover:text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    {running ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    <span>{t('Đồng bộ (+25)', 'Sync (+25)')}</span>
                  </button>

                  <a
                    href={src.official_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-amber-400"
                  >
                    <span>{t('Nguồn', 'Site')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: ADD CUSTOM DATA */}
      {subTab === 'add-custom' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-indigo-600 dark:text-amber-400" />
              <span>{t('1. Đồng bộ theo lô từ nguồn chọn lọc', '1. Batch Sync from Source')}</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('Nguồn tích hợp:', 'Built-in Source:')}
              </label>
              <select
                value={sourcePlatform}
                onChange={(e) => {
                  setSourcePlatform(e.target.value);
                  setCustomSourceName('');
                }}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="TopCV & VietnamWorks">TopCV & VietnamWorks</option>
                <option value="ITviec & TopDev Vietnam">ITviec & TopDev Vietnam</option>
                <option value="LinkedIn & Glints Đông Nam Á">LinkedIn & Glints Đông Nam Á</option>
                <option value="CareerViet & JobsGO">CareerViet & JobsGO</option>
                <option value="Robert Walters & Michael Page">Robert Walters & Michael Page</option>
                <option value="Tổng cục Thống kê (GSO) & Bộ LĐ-TB&XH">Tổng cục Thống kê (GSO) & MOLISA</option>
                <option value="Cổng Dữ liệu Tài nguyên Môi trường, GIS & ESG (MONRE)">Cổng Dữ liệu Môi trường, GIS & ESG</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {t('Hoặc nhập tên nguồn mới:', 'Custom Source Name:')}
                </label>
                <input
                  type="text"
                  value={customSourceName}
                  onChange={(e) => setCustomSourceName(e.target.value)}
                  placeholder="VD: Báo cáo Lương 2026..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {t('Số lượng bản ghi:', 'Batch Size:')}
                </label>
                <select
                  value={sampleSize}
                  onChange={(e) => setSampleSize(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value={15}>15 bản ghi</option>
                  <option value={25}>25 bản ghi</option>
                  <option value={50}>50 bản ghi</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => handleRunETL()}
              disabled={running}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>{t('Nạp lô dữ liệu vào CSDL', 'Ingest Batch Now')}</span>
            </button>
          </div>

          <div className="lg:col-span-6 bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FilePlus2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{t('2. Dán trực tiếp văn bản tin tuyển dụng (JD)', '2. Paste Raw Job Posting Text')}</span>
              </h3>

              <textarea
                rows={5}
                value={customJobText}
                onChange={(e) => setCustomJobText(e.target.value)}
                placeholder={t(
                  'Dán nội dung JD (VD: Tuyển Kỹ sư Python, FastAPI, GIS tại Đà Nẵng, 2 năm kinh nghiệm, lương 24 - 34 triệu VNĐ)...',
                  'Paste job description text here...'
                )}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white leading-relaxed"
              />
            </div>

            <button
              onClick={() =>
                handleRunETL(
                  customSourceName.trim() || 'Nguồn Nhập Trực Tiếp',
                  customJobText ||
                    'Tuyển dụng Kỹ sư Dữ liệu & AI (Python, FastAPI, PostgreSQL, GIS) làm việc Hybrid tại TP. Hồ Chí Minh, 2 năm kinh nghiệm, lương 25 - 35 triệu VNĐ/tháng.'
                )
              }
              disabled={running}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('Bóc tách NLP & Lưu vào CSDL', 'Parse & Save to DB')}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: SYNC LOGS */}
      {subTab === 'history' && (
        <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500">
                  <th className="py-2.5 px-3">{t('Mã phiên', 'Run Code')}</th>
                  <th className="py-2.5 px-3">{t('Nguồn', 'Source')}</th>
                  <th className="py-2.5 px-3">{t('Thời gian', 'Time')}</th>
                  <th className="py-2.5 px-3 text-right">{t('Thô', 'Raw')}</th>
                  <th className="py-2.5 px-3 text-right">{t('Trùng', 'Dup')}</th>
                  <th className="py-2.5 px-3 text-right">{t('Đã lưu', 'Saved')}</th>
                  <th className="py-2.5 px-3 text-right">{t('Kỹ năng', 'Skills')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70 text-xs">
                {history.map((h: any) => (
                  <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-indigo-600 dark:text-amber-500 font-bold">{h.run_code}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{h.source_platform}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{h.started_at}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{h.records_crawled}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-600">-{h.records_duplicated}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-600 font-bold">+{h.records_cleaned}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-blue-600 font-bold">{h.skills_extracted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
