import React, { useState, useEffect } from 'react';
import {
  X,
  Bookmark,
  MessageSquare,
  Award,
  LogOut,
  LogIn,
  Trash2,
  ArrowRight,
  Save,
  CheckCircle2,
  UserCircle2
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import {
  fetchAIChatHistory,
  deleteAIChatHistoryItem,
  fetchCVEvaluationHistory
} from '../services/api';

interface UserWorkspaceDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
  onNavigateTab: (tab: string) => void;
}

export const UserWorkspaceDrawer: React.FC<UserWorkspaceDrawerProps> = ({
  open,
  onClose,
  onOpenAuth,
  onNavigateTab,
}) => {
  const { t } = useSettings();
  const { user, logout, savedJobs, updateJobStatus, deleteBookmark, updateProfile } = useAuth();

  const [tab, setTab] = useState<'saved' | 'history' | 'profile'>('saved');
  const [chatLogs, setChatLogs] = useState<any[]>([]);
  const [cvLogs, setCvLogs] = useState<any[]>([]);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editYears, setEditYears] = useState(2.5);
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (user) {
      setEditName(user.full_name);
      setEditRole(user.target_role);
      setEditCity(user.target_location);
      setEditYears(user.experience_years);
    }
    fetchAIChatHistory(20)
      .then((res) => setChatLogs(res.items || []))
      .catch(() => {});
    fetchCVEvaluationHistory(user?.email || 'demo@vnlabor.vn')
      .then((res) => setCvLogs(res.items || []))
      .catch(() => {});
  }, [open, user]);

  if (!open) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await updateProfile({
      full_name: editName,
      target_role: editRole,
      target_location: editCity,
      experience_years: Number(editYears) || 0,
    });
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2200);
  };

  const handleRestoreChat = (log: any) => {
    sessionStorage.setItem('vn_labor_restore_chat', JSON.stringify(log));
    onNavigateTab('ai-lab');
    onClose();
  };

  const handleSendSavedJobToAi = (job: any) => {
    sessionStorage.setItem(
      'vn_labor_cta_job',
      JSON.stringify({
        role: job.normalized_title,
        location: job.location_name,
        jd: job.description_raw || job.title,
        title: job.title,
      })
    );
    onNavigateTab('ai-lab');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
      />
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-[#0D1322] border-l border-slate-200 dark:border-slate-800 h-full shadow-2xl flex flex-col">
        {/* Top User Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 dark:bg-amber-500 text-white dark:text-slate-950 flex items-center justify-center font-extrabold text-sm shrink-0">
              {user ? user.full_name.slice(0, 1).toUpperCase() : <UserCircle2 className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                {user ? user.full_name : t('Khách tham quan (Chưa đăng nhập)', 'Guest Mode (Not Signed In)')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {user ? `${user.email} • ${user.role_type}` : t('Đăng nhập để lưu đồng bộ việc làm & lịch sử AI', 'Sign in to sync saved jobs & AI sessions')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {user ? (
              <button
                type="button"
                onClick={logout}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t('Đăng xuất', 'Sign Out')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t('Đăng nhập', 'Sign In')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setTab('saved')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition ${
                tab === 'saved'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-amber-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{t('Việc đã lưu', 'Saved')} ({savedJobs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('history')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition ${
                tab === 'history'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-amber-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{t('Chat AI', 'AI Logs')} ({chatLogs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('profile')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition ${
                tab === 'profile'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-amber-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>{t('Hồ sơ & CV', 'CV & Profile')}</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {/* TAB 1: SAVED JOBS */}
          {tab === 'saved' && (
            <>
              {savedJobs.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {t('Bạn chưa lưu tin tuyển dụng nào', 'No saved jobs yet')}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {t('Nhấn biểu tượng Lưu tại mục Tìm việc làm để theo dõi trạng thái nộp hồ sơ.', 'Click the Bookmark icon in Job Explorer to track applications.')}
                  </p>
                </div>
              ) : (
                savedJobs.map((job) => (
                  <div
                    key={job.job_id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {job.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {job.company_name} • {job.location_name} •{' '}
                          <span className="font-mono font-bold text-indigo-600 dark:text-amber-400">
                            {job.salary_min_vnd}–{job.salary_max_vnd}tr
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteBookmark(job.job_id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                        title={t('Xóa khỏi danh sách lưu', 'Remove saved job')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <select
                        value={job.application_status || 'Đã lưu'}
                        onChange={(e) => updateJobStatus(job.job_id, e.target.value)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-emerald-700 dark:text-emerald-400"
                      >
                        <option value="Đã lưu">{t('Trạng thái: Đã lưu', 'Status: Saved')}</option>
                        <option value="Đã nộp CV">{t('Trạng thái: Đã nộp CV', 'Status: Applied')}</option>
                        <option value="Phỏng vấn">{t('Trạng thái: Phỏng vấn', 'Status: Interviewing')}</option>
                        <option value="Nhận Offer">{t('Trạng thái: Nhận Offer', 'Status: Offer Received')}</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleSendSavedJobToAi(job)}
                        className="text-[11px] font-bold text-indigo-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <span>{t('Chấm CV theo JD', 'Check CV Match')}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* TAB 2: CHAT HISTORY */}
          {tab === 'history' && (
            <>
              {chatLogs.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">
                  {t('Chưa có lịch sử trò chuyện cùng Cố vấn AI.', 'No AI conversation logs recorded yet.')}
                </div>
              ) : (
                chatLogs.map((lg) => (
                  <div
                    key={lg.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleRestoreChat(lg)}
                        className="text-left text-xs font-bold text-indigo-700 dark:text-amber-300 hover:underline line-clamp-2"
                      >
                        {lg.user_question}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteAIChatHistoryItem(lg.id).catch(() => {});
                          setChatLogs((prev) => prev.filter((item) => item.id !== lg.id));
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 shrink-0"
                        title={t('Xóa câu hỏi này', 'Delete item')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {lg.ai_answer && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                        {lg.ai_answer}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>{lg.ai_topic || lg.ai_mode}</span>
                      <button
                        type="button"
                        onClick={() => handleRestoreChat(lg)}
                        className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        {t('Mở lại hội thoại →', 'Resume Chat →')}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* TAB 3: PROFILE & CV HISTORY */}
          {tab === 'profile' && (
            <div className="space-y-4">
              {user ? (
                <form
                  onSubmit={handleSaveProfile}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {t('Thông tin Mục tiêu Nghề nghiệp', 'Career Target Profile')}
                    </h4>
                    {savedBanner && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t('Đã lưu', 'Saved')}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder={t('Họ và tên', 'Full name')}
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      placeholder={t('Vị trí mục tiêu', 'Target role')}
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        placeholder={t('Thành phố', 'City')}
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="35"
                        value={editYears}
                        onChange={(e) => setEditYears(Number(e.target.value))}
                        placeholder={t('Số năm KN', 'Years exp')}
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{t('Cập nhật Hồ sơ', 'Save Profile')}</span>
                  </button>
                </form>
              ) : (
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs space-y-2">
                  <div className="font-bold text-indigo-900 dark:text-indigo-200">
                    {t('Đăng nhập để lưu hồ sơ mục tiêu cá nhân', 'Sign in to customize and save your career profile')}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAuth();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
                  >
                    {t('Mở trang Đăng nhập / Đăng ký', 'Open Sign In / Register')}
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                  {t('Lịch sử Điểm Chấm CV ATS gần đây', 'Recent ATS CV Evaluation Progress')}
                </h4>
                {cvLogs.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    {t('Chưa có lịch sử chấm CV.', 'No CV evaluation logs yet.')}
                  </p>
                ) : (
                  cvLogs.map((cv) => (
                    <div
                      key={cv.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {cv.filename}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {cv.target_role} • {cv.target_location}
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-extrabold shrink-0 ${
                          cv.total_score >= 80
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                        }`}
                      >
                        {cv.total_score}/100
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
