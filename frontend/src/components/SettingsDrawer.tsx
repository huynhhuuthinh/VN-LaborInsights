import React from 'react';
import {
  X,
  Sun,
  Moon,
  Globe,
  Sliders,
  Sparkles,
  ExternalLink,
  Check,
  Database,
  LayoutGrid
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ open, onClose }) => {
  const {
    lang,
    setLang,
    theme,
    setTheme,
    density,
    setDensity,
    showAnimations,
    setShowAnimations,
    t
  } = useSettings();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Content */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#0D1322] border-l border-slate-200 dark:border-slate-800 h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Header */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-amber-500/15 text-indigo-600 dark:text-amber-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('Cài Đặt Hệ Thống', 'System Settings')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('Tùy chỉnh giao diện, ngôn ngữ và hiển thị', 'Customize appearance, language & display')}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Settings Sections */}
          <div className="p-5 space-y-6">
            {/* 1. Theme Mode */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                {t('1. Chế độ Giao diện', '1. Appearance Theme')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                    theme === 'light'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sun className="w-5 h-5 text-amber-500" />
                    <div>
                      <div className="text-xs font-bold">{t('Giao diện Sáng', 'Light Mode')}</div>
                      <div className="text-[10px] opacity-75">{t('Trang nhã, rõ nét', 'Clean & Crisp')}</div>
                    </div>
                  </div>
                  {theme === 'light' && <Check className="w-4 h-4 text-indigo-600" />}
                </button>

                <button
                  onClick={() => setTheme('dark')}
                  className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                    theme === 'dark'
                      ? 'border-amber-500 bg-amber-500/15 text-white font-bold shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Moon className="w-5 h-5 text-indigo-400" />
                    <div>
                      <div className="text-xs font-bold">{t('Giao diện Tối', 'Dark Mode')}</div>
                      <div className="text-[10px] opacity-75">{t('Chuyên sâu, dịu mắt', 'Deep Obsidian')}</div>
                    </div>
                  </div>
                  {theme === 'dark' && <Check className="w-4 h-4 text-amber-400" />}
                </button>
              </div>
            </div>

            {/* 2. Language Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                {t('2. Ngôn ngữ Hiển thị', '2. Display Language')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setLang('vi')}
                  className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                    lang === 'vi'
                      ? 'border-indigo-600 dark:border-amber-500 bg-indigo-50/70 dark:bg-amber-500/15 text-indigo-950 dark:text-white font-bold'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-5 h-5 text-emerald-500" />
                    <div>
                      <div className="text-xs font-bold">Tiếng Việt</div>
                      <div className="text-[10px] opacity-75">Chuẩn thuật ngữ VN</div>
                    </div>
                  </div>
                  {lang === 'vi' && <Check className="w-4 h-4 text-indigo-600 dark:text-amber-400" />}
                </button>

                <button
                  onClick={() => setLang('en')}
                  className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                    lang === 'en'
                      ? 'border-indigo-600 dark:border-amber-500 bg-indigo-50/70 dark:bg-amber-500/15 text-indigo-950 dark:text-white font-bold'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className="text-xs font-bold">English</div>
                      <div className="text-[10px] opacity-75">International Standard</div>
                    </div>
                  </div>
                  {lang === 'en' && <Check className="w-4 h-4 text-indigo-600 dark:text-amber-400" />}
                </button>
              </div>
            </div>

            {/* 3. Layout Density */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                {t('3. Mật độ Bố cục', '3. Layout Density')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDensity('comfortable')}
                  className={`p-3 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
                    density === 'comfortable'
                      ? 'border-indigo-600 dark:border-amber-500 bg-indigo-50/70 dark:bg-amber-500/15 text-indigo-950 dark:text-white'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  {t('Thoáng đãng (Khuyên dùng)', 'Comfortable')}
                </button>
                <button
                  onClick={() => setDensity('compact')}
                  className={`p-3 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
                    density === 'compact'
                      ? 'border-indigo-600 dark:border-amber-500 bg-indigo-50/70 dark:bg-amber-500/15 text-indigo-950 dark:text-white'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  {t('Thu gọn', 'Compact')}
                </button>
              </div>
            </div>

            {/* 4. Developer & API Links */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('4. Liên kết Kỹ thuật & Tài liệu API', '4. Technical Links & API Docs')}
              </label>

              <a
                href="http://127.0.0.1:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
              >
                <span className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-600 dark:text-amber-400" />
                  {t('Tài liệu kiểm thử FastAPI (Swagger UI)', 'FastAPI Interactive Docs (Swagger UI)')}
                </span>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold text-xs transition"
          >
            {t('Hoàn tất & Đóng', 'Done & Close')}
          </button>
        </div>
      </div>
    </div>
  );
};

