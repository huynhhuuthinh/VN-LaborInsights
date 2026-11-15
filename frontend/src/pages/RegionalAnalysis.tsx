import React, { useState, useEffect } from 'react';
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Legend
} from 'recharts';
import { MapPin, BarChart3, LayoutGrid, Compass, Calculator } from 'lucide-react';
import { fetchRegionalIntelligence, calculateGrossToNetSCOLI } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { VietnamInteractiveMap } from '../components/VietnamInteractiveMap';

const FALLBACK_REGIONS = [
  { code: 'VN-SG', name: 'TP. Hồ Chí Minh', job_count: 342, market_share_pct: 35.5, avg_salary_vnd: 20.8, p25_salary_vnd: 13.5, p75_salary_vnd: 25.4, real_purchasing_power_index: 16.9, cost_of_living_index: 1.0, dominant_industry: 'Công nghệ & Tài chính' },
  { code: 'VN-HN', name: 'Hà Nội', job_count: 298, market_share_pct: 30.9, avg_salary_vnd: 19.6, p25_salary_vnd: 12.8, p75_salary_vnd: 24.2, real_purchasing_power_index: 16.2, cost_of_living_index: 0.99, dominant_industry: 'Phần mềm & Ngân hàng' },
  { code: 'VN-DN', name: 'Đà Nẵng', job_count: 108, market_share_pct: 11.2, avg_salary_vnd: 16.4, p25_salary_vnd: 10.8, p75_salary_vnd: 20.5, real_purchasing_power_index: 17.8, cost_of_living_index: 0.87, dominant_industry: 'Công nghệ & Du lịch số' },
  { code: 'VN-BD', name: 'Bình Dương', job_count: 74, market_share_pct: 7.7, avg_salary_vnd: 16.8, p25_salary_vnd: 11.2, p75_salary_vnd: 20.8, real_purchasing_power_index: 17.5, cost_of_living_index: 0.89, dominant_industry: 'Sản xuất & Tự động hóa' },
  { code: 'VN-HP', name: 'Hải Phòng', job_count: 52, market_share_pct: 5.4, avg_salary_vnd: 16.1, p25_salary_vnd: 10.6, p75_salary_vnd: 19.8, real_purchasing_power_index: 17.1, cost_of_living_index: 0.88, dominant_industry: 'Cảng biển & Logistics' },
  { code: 'VN-BN', name: 'Bắc Ninh', job_count: 41, market_share_pct: 4.3, avg_salary_vnd: 16.5, p25_salary_vnd: 11.0, p75_salary_vnd: 20.4, real_purchasing_power_index: 17.9, cost_of_living_index: 0.86, dominant_industry: 'Điện tử & Bán dẫn' },
  { code: 'VN-DNA', name: 'Đồng Nai', job_count: 28, market_share_pct: 2.9, avg_salary_vnd: 15.6, p25_salary_vnd: 10.4, p75_salary_vnd: 19.2, real_purchasing_power_index: 16.8, cost_of_living_index: 0.87, dominant_industry: 'Khu công nghiệp & Kho vận' },
  { code: 'VN-CT', name: 'Cần Thơ', job_count: 20, market_share_pct: 2.1, avg_salary_vnd: 14.5, p25_salary_vnd: 9.8, p75_salary_vnd: 18.0, real_purchasing_power_index: 16.6, cost_of_living_index: 0.83, dominant_industry: 'Nông nghiệp CNC & Thương mại' },
];

export const RegionalAnalysisView: React.FC = () => {
  const { t, expertMode } = useSettings();
  const [data, setData] = useState<any>({ regions: FALLBACK_REGIONS });
  const [subView, setSubView] = useState<'map' | 'chart' | 'cards' | 'calculator'>('map');
  const [selectedRegionCode, setSelectedRegionCode] = useState<string>('VN-SG');

  const [grossSalary, setGrossSalary] = useState<number>(18.0);
  const [dependents, setDependents] = useState<number>(0);
  const [g2nResult, setG2nResult] = useState<any>(null);

  useEffect(() => {
    fetchRegionalIntelligence()
      .then((res) => {
        if (res?.regions?.length > 0) {
          setData(res);
          setSelectedRegionCode(res.regions[0].code);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    calculateGrossToNetSCOLI({
      gross_salary_vnd: grossSalary,
      dependents,
      location_code: selectedRegionCode || 'VN-SG',
    })
      .then(setG2nResult)
      .catch(console.error);
  }, [grossSalary, dependents, selectedRegionCode]);

  const regions = data?.regions?.length ? data.regions : FALLBACK_REGIONS;

  return (
    <div className="space-y-5">
      {/* Compact Top Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl px-5 py-3.5 shadow-2xs">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">
            {t('So sánh Lương & Chi phí sống theo Tỉnh/Thành', 'Regional Salary & Cost of Living Comparison')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t(
              'Nơi nào lương cao nhất và nơi nào giúp bạn để dành được nhiều tiền nhất sau chi phí sinh hoạt?',
              'Where are salaries highest and where can you save the most after living expenses?'
            )}
          </p>
        </div>

        <div className="inline-flex shrink-0 flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          <button
            onClick={() => setSubView('map')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              subView === 'map'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-amber-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{t('Bản đồ', 'Map')}</span>
          </button>

          <button
            onClick={() => setSubView('chart')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              subView === 'chart'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-amber-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{t('Biểu đồ so sánh', 'Chart')}</span>
          </button>

          <button
            onClick={() => setSubView('cards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              subView === 'cards'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-amber-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{t('8 Trung tâm kinh tế', '8 Hubs')}</span>
          </button>

          <button
            onClick={() => setSubView('calculator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              subView === 'calculator'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>{t('Tính lương thực nhận', 'Gross → Net')}</span>
          </button>
        </div>
      </div>

      {/* SUBVIEW 1: INTERACTIVE VIETNAM MAP */}
      {subView === 'map' && (
        <VietnamInteractiveMap
          regions={regions}
          selectedCode={selectedRegionCode}
          onSelectRegion={setSelectedRegionCode}
        />
      )}

      {/* SUBVIEW 2: CHART */}
      {subView === 'chart' && (
        <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            {t('So sánh Lương trung bình, Lương nhân sự giỏi & Giá trị thực tế sau chi phí sống', 'Avg Salary, Senior Salary & Real Value After Living Cost')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            {t(
              'Đà Nẵng, Bắc Ninh và Bình Dương tuy lương danh nghĩa thấp hơn TP.HCM nhưng chi phí sinh hoạt dễ chịu hơn nên sức mua thực tế rất cạnh tranh.',
              'Da Nang, Bac Ninh, and Binh Duong have lower nominal salaries than HCMC, but lower living costs make real purchasing power highly competitive.'
            )}
          </p>

          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={regions} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" opacity={0.5} />
                <XAxis dataKey="name" tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }} />
                <YAxis tick={{ fill: '#475569', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#F8FAFC',
                    fontSize: '12px'
                  }}
                />
                <Legend />
                <Bar dataKey="avg_salary_vnd" name={t('Lương trung bình (Triệu)', 'Avg Salary (M)')} fill="#2563EB" radius={[6, 6, 0, 0]} />
                <Bar dataKey="p75_salary_vnd" name={expertMode ? t('Lương P75 (Triệu)', 'P75 Salary (M)') : t('Nhân sự giàu KN (Triệu)', 'Experienced (M)')} fill="#4F46E5" radius={[6, 6, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="real_purchasing_power_index"
                  name={expertMode ? t('Sức mua tương đương (PPP)', 'PPP Index') : t('Giá trị thực sau chi phí sống (Triệu)', 'Real Value After Cost')}
                  stroke="#059669"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#059669' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* SUBVIEW 3: PROVINCE CARDS */}
      {subView === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {regions.map((reg: any) => (
            <div
              key={reg.code}
              onClick={() => {
                setSelectedRegionCode(reg.code);
                setSubView('map');
              }}
              className="cursor-pointer bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 hover:border-emerald-500 rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-amber-400">
                    <MapPin className="w-3.5 h-3.5" />
                    {expertMode ? reg.code : t('Trung tâm việc làm', 'Job Hub')}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                    {reg.market_share_pct}% {t('thị phần', 'share')}
                  </span>
                </div>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-1.5">
                  {reg.name}
                </h4>
                <div className="mt-1 inline-block text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded">
                  {reg.dominant_industry}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('Tin đang tuyển:', 'Active jobs:')}</span>
                  <strong className="font-mono text-slate-900 dark:text-white">{reg.job_count} {t('việc làm', 'jobs')}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    {expertMode ? t('Lương TB / P75:', 'Avg / P75:') : t('Lương phổ biến / Giàu KN:', 'Avg / Senior:')}
                  </span>
                  <strong className="font-mono text-indigo-600 dark:text-amber-400">{reg.avg_salary_vnd}{t('tr', 'M')} – {reg.p75_salary_vnd}{t('tr', 'M')}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    {expertMode ? t('Sức mua PPP (SCOLI):', 'PPP (SCOLI):') : t('Sức mua thực tế:', 'Real purchasing power:')}
                  </span>
                  <strong className="font-mono text-emerald-600 dark:text-emerald-400">~{reg.real_purchasing_power_index} {t('triệu', 'M VND')}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUBVIEW 4: GROSS -> NET & SCOLI SAVINGS CALCULATOR */}
      {subView === 'calculator' && (
        <div className="bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {t('Công cụ tính Lương thực nhận (Gross → Net) & Số tiền để dành mỗi tháng', 'Gross to Net & Monthly Savings Calculator')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t(
                  'Nhập mức lương Gross và số người phụ thuộc để xem sau khi trừ bảo hiểm, thuế và chi phí sinh hoạt bạn tiết kiệm được bao nhiêu.',
                  'Enter Gross salary and dependents to see how much you save after insurance, tax, and living costs.'
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-slate-600 dark:text-slate-400">{t('Lương Gross (Triệu):', 'Gross (M):')}</span>
                <input
                  type="number"
                  min={6}
                  max={150}
                  step={1}
                  value={grossSalary}
                  onChange={(e) => setGrossSalary(Math.max(5, Number(e.target.value) || 15))}
                  className="w-16 px-2 py-1 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono font-bold text-indigo-600 dark:text-amber-400 text-center"
                />
              </div>

              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-slate-600 dark:text-slate-400">{t('Người phụ thuộc:', 'Dependents:')}</span>
                <select
                  value={dependents}
                  onChange={(e) => setDependents(Number(e.target.value))}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                >
                  <option value={0}>{t('0 người', '0 dependents')}</option>
                  <option value={1}>{t('1 người (-4.4tr)', '1 dependent (-4.4M)')}</option>
                  <option value={2}>{t('2 người (-8.8tr)', '2 dependents (-8.8M)')}</option>
                  <option value={3}>{t('3 người (-13.2tr)', '3 dependents (-13.2M)')}</option>
                </select>
              </div>
            </div>
          </div>

          {g2nResult && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              <div className="xl:col-span-5 grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500">{t('Lương Gross thỏa thuận', 'Gross Salary')}</div>
                  <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
                    {g2nResult.gross_salary_vnd} {t('triệu', 'M')}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {t('Bảo hiểm (10.5%):', 'Insurance (10.5%):')} -{g2nResult.deductions?.total_insurance_10_5pct}{t('tr', 'M')}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60">
                  <div className="text-indigo-700 dark:text-indigo-300 font-semibold">{t('Lương Net cầm tay', 'Net Take-home Pay')}</div>
                  <div className="text-lg font-extrabold font-mono text-indigo-700 dark:text-amber-400 mt-0.5">
                    {g2nResult.net_salary_vnd} {t('triệu', 'M')}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {t('Thuế TNCN:', 'PIT Tax:')} -{g2nResult.deductions?.pit_tax_vnd}{t('tr', 'M')}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500">
                    {t('Chi phí sinh hoạt', 'Living Cost')} ({g2nResult.selected_location?.name})
                  </div>
                  <div className="text-base font-extrabold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                    -{g2nResult.selected_location?.estimated_living_cost_vnd} {t('triệu', 'M')}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {expertMode
                      ? `${t('Chỉ số giá SCOLI:', 'SCOLI Price Index:')} ${g2nResult.selected_location?.scoli_index}x`
                      : t('Thuê nhà, ăn uống, đi lại cơ bản', 'Rent, food, basic transport')}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                  <div className="text-emerald-800 dark:text-emerald-300 font-semibold">{t('Tiền để dành mỗi tháng', 'Net Monthly Savings')}</div>
                  <div className="text-lg font-extrabold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                    +{g2nResult.selected_location?.monthly_net_savings_vnd} {t('triệu', 'M')}
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    {t('Tích lũy ~', 'Accumulates ~')}{g2nResult.selected_location?.annual_accumulated_savings_vnd} {t('triệu/năm', 'M/yr')}
                  </div>
                </div>
              </div>

              <div className="xl:col-span-7">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                  {t('Với cùng mức lương này, bạn sẽ để dành được bao nhiêu tại 8 tỉnh/thành? (Bấm để chọn):', 'With this salary, how much would you save across 8 cities? (Click to select):')}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {g2nResult.city_savings_comparison?.slice(0, 8).map((city: any) => {
                    const isSel = city.location_code === selectedRegionCode;
                    return (
                      <div
                        key={city.location_code}
                        onClick={() => setSelectedRegionCode(city.location_code)}
                        className={`cursor-pointer p-2.5 rounded-xl border text-xs transition ${
                          isSel
                            ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500 font-bold'
                            : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                        }`}
                      >
                        <div className="font-bold text-slate-900 dark:text-white truncate">{city.location_name}</div>
                        <div className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold mt-0.5">
                          {t('Dư', 'Surplus')} +{city.monthly_net_savings_vnd}{t('tr', 'M')}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {t('Chi tiêu:', 'Living Cost:')} -{city.estimated_living_cost_vnd}{t('tr', 'M')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
