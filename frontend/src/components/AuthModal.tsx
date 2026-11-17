import React, { useState } from 'react';
import { X, LogIn, UserPlus, Sparkles, Mail, Lock, User, Briefcase, MapPin } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ open, onClose }) => {
  const { t } = useSettings();
  const { login, register, loginDemo } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [roleType, setRoleType] = useState('Ứng viên / Sinh viên');
  const [targetLocation, setTargetLocation] = useState('TP. Hồ Chí Minh');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({
          email,
          full_name: fullName,
          password,
          role_type: roleType,
          target_location: targetLocation,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || t('Có lỗi xảy ra, vui lòng kiểm tra lại.', 'Authentication error, please check your input.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await loginDemo();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || t('Không thể đăng nhập tài khoản mẫu', 'Could not sign in with demo account'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
      />
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {mode === 'login'
                ? t('Đăng nhập Tài khoản Cá nhân', 'Sign In to Personal Workspace')
                : t('Đăng ký Tài khoản Mới', 'Create New Account')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t(
                'Đồng bộ việc làm đã lưu, lịch sử chat AI và điểm CV ATS của bạn.',
                'Sync saved jobs, AI chat sessions, and ATS CV history.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switch */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
              }}
              className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-amber-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t('Đăng nhập', 'Sign In')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
              }}
              className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-amber-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t('Đăng ký', 'Register')}</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                {t('Họ và tên', 'Full Name')}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  minLength={2}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t('Ví dụ: Trần Thu Hà', 'e.g. Tran Thu Ha')}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              {t('Mật khẩu (tối thiểu 6 ký tự)', 'Password (min 6 chars)')}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {t('Vai trò', 'Role')}
                </label>
                <div className="relative">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <select
                    value={roleType}
                    onChange={(e) => setRoleType(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-900 dark:text-white"
                  >
                    <option value="Ứng viên / Sinh viên">{t('Ứng viên / Sinh viên', 'Candidate / Student')}</option>
                    <option value="Chuyên viên Nhân sự (HR)">{t('Chuyên viên Nhân sự (HR)', 'HR Specialist')}</option>
                    <option value="Giảng viên / Đào tạo">{t('Giảng viên / Đào tạo', 'University Lecturer')}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {t('Khu vực', 'City')}
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <select
                    value={targetLocation}
                    onChange={(e) => setTargetLocation(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-900 dark:text-white"
                  >
                    <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="Đà Nẵng">Đà Nẵng</option>
                    <option value="Bình Dương">Bình Dương</option>
                    <option value="Cần Thơ">Cần Thơ</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-amber-500 text-white dark:text-slate-950 font-bold text-xs transition disabled:opacity-50"
          >
            {loading
              ? t('Đang xử lý...', 'Processing...')
              : mode === 'login'
              ? t('Đăng nhập', 'Sign In')
              : t('Tạo tài khoản', 'Create Account')}
          </button>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleDemo}
              className="w-full py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('Dùng nhanh Tài khoản Mẫu (Nguyễn Minh Quân)', 'Quick Demo Sign-In (Minh Quan)')}</span>
            </button>
            <p className="text-[10.5px] text-center text-slate-400">
              {t('Demo Email: demo@vnlabor.vn • Pass: Demo@2026', 'Demo Email: demo@vnlabor.vn • Pass: Demo@2026')}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
