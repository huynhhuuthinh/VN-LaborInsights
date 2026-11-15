import React, { useState } from 'react';
import {
  BarChart3,
  Cpu,
  Globe2,
  Search,
  Sparkles,
  Database,
  Activity,
  Settings,
  BookOpen,
  GraduationCap
} from 'lucide-react';

import { SettingsProvider, useSettings } from './context/SettingsContext';
import { SettingsDrawer } from './components/SettingsDrawer';
import { ExecutiveDashboardView } from './pages/ExecutiveDashboard';
import { SkillIntelligenceView } from './pages/SkillIntelligence';
import { RegionalAnalysisView } from './pages/RegionalAnalysis';
import { JobExplorerView } from './pages/JobExplorer';
import { AILabStudioView } from './pages/AILabStudio';
import { ETLPipelineMonitorView } from './pages/ETLPipelineMonitor';

class ViewErrorBoundary extends React.Component<
  { children: React.ReactNode; resetKey: string },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: React.ReactNode; resetKey: string }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error?.message || 'Lỗi hiển thị giao diện' };
  }

  componentDidUpdate(prevProps: { resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, errorMsg: '' });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-slate-900 dark:text-slate-100 my-4">
          <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400">
            Đã xảy ra sự cố hiển thị tại phân hệ này
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
            {this.state.errorMsg}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, errorMsg: '' })}
            className="mt-3 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition"
          >
            Tải lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainLayout() {
  const { t, lang, theme, density, expertMode, setExpertMode } = useSettings();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: t('Tổng quan', 'Overview'), icon: BarChart3 },
    { id: 'skills', label: t('Kỹ năng', 'Skills & Pay'), icon: Sparkles },
    { id: 'regions', label: t('Bản đồ vùng', 'Regions'), icon: Globe2 },
    { id: 'jobs', label: t('Tìm việc làm', 'Jobs'), icon: Search },
    { id: 'ai-lab', label: t('Phòng AI', 'AI Studio'), icon: Cpu },
    { id: 'etl', label: t('Nguồn dữ liệu', 'Data Sources'), icon: Database },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#070A12] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/95 dark:bg-[#0B0F19]/90 border-b border-slate-200/90 dark:border-slate-800/80 shadow-2xs">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-2.5">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-emerald-500 flex items-center justify-center shadow-xs shrink-0">
              <Activity className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <span className="block text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                VN-Labor<span className="text-indigo-600 dark:text-amber-500">Insights</span>
              </span>
              <span className="hidden xl:block text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight whitespace-nowrap">
                {t('Cổng thông tin Việc làm & Thu nhập Việt Nam', 'Vietnam Jobs & Salary Observatory')}
              </span>
            </div>
          </div>

          {/* Navigation Pills */}
          <nav className="flex items-center gap-1 overflow-x-auto py-0.5 min-w-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white dark:text-slate-950' : 'text-indigo-600 dark:text-amber-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Dual-Audience Mode Switcher + Settings */}
          <div className="flex items-center gap-2 shrink-0 ml-auto lg:ml-0">
            <div
              className="inline-flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800"
              title={t(
                'Chuyển đổi giữa chế độ ngôn ngữ dễ hiểu cho mọi người và chế độ hiển thị đầy đủ thông số học thuật/chuyên sâu',
                'Switch between Simple Mode for general readers and Expert Mode for technical analysis'
              )}
            >
              <button
                onClick={() => setExpertMode(false)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                  !expertMode
                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span>{t('Dễ hiểu', 'Simple')}</span>
              </button>
              <button
                onClick={() => setExpertMode(true)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                  expertMode
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-amber-400 shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>{t('Chuyên sâu', 'Expert')}</span>
              </button>
            </div>

            <button
              onClick={() => setSettingsOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-500 flex items-center gap-1.5 transition"
            >
              <Settings className="w-3.5 h-3.5 text-indigo-600 dark:text-amber-400" />
              <span className="hidden sm:inline">{t('Cài đặt', 'Settings')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main
        className={`flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 ${
          density === 'compact' ? 'py-4' : 'py-5'
        }`}
      >
        <ViewErrorBoundary resetKey={activeTab}>
          {activeTab === 'dashboard' && <ExecutiveDashboardView onNavigateTab={setActiveTab} />}
          {activeTab === 'skills' && <SkillIntelligenceView />}
          {activeTab === 'regions' && <RegionalAnalysisView />}
          {activeTab === 'jobs' && <JobExplorerView />}
          {activeTab === 'ai-lab' && <AILabStudioView />}
          {activeTab === 'etl' && <ETLPipelineMonitorView />}
        </ViewErrorBoundary>
      </main>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Clean Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0B0F19] py-4 px-4 sm:px-6 mt-8">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>
            <strong className="text-slate-800 dark:text-slate-200">VN-LaborInsights</strong> — {t('Hệ thống Phân tích Việc làm, Mức lương & Định hướng Nghề nghiệp tại Việt Nam', 'Vietnam Jobs, Salary & Career Guidance Platform')}
          </span>
          <span className="text-[11px] text-slate-400">
            {t('Nguồn đối chiếu: Tổng cục Thống kê (GSO) • ILO • TopDev • ITviec • VietnamWorks', 'Sources: GSO • ILO • TopDev • ITviec • VietnamWorks')}
          </span>
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <SettingsProvider>
      <MainLayout />
    </SettingsProvider>
  );
}

export default App;
