import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  loginUser,
  registerUser,
  fetchSavedJobs,
  toggleSavedJob,
  removeSavedJob,
  updateUserProfile,
} from '../services/api';

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role_type: string;
  target_role: string;
  target_location: string;
  experience_years: number;
  skills: string[];
  created_at?: string;
}

export interface SavedJobItem {
  bookmark_id?: number;
  job_id: number;
  job_code?: string;
  title: string;
  normalized_title?: string;
  company_name: string;
  location_name: string;
  industry_name?: string;
  salary_min_vnd: number;
  salary_max_vnd: number;
  experience_level?: string;
  work_mode?: string;
  description_raw?: string;
  skills?: any[];
  application_status: string;
  notes?: string;
  saved_at?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  savedJobs: SavedJobItem[];
  savedJobIds: number[];
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (payload: {
    email: string;
    full_name: string;
    password: string;
    role_type?: string;
    target_role?: string;
    target_location?: string;
    experience_years?: number;
  }) => Promise<UserProfile>;
  loginDemo: () => Promise<UserProfile>;
  logout: () => void;
  updateProfile: (payload: Partial<UserProfile>) => Promise<UserProfile>;
  refreshSavedJobs: () => Promise<void>;
  toggleBookmark: (job: any) => Promise<boolean>;
  updateJobStatus: (jobId: number, status: string, notes?: string) => Promise<void>;
  deleteBookmark: (jobId: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USER_KEY = 'vn_labor_auth_user';
const TOKEN_KEY = 'vn_labor_auth_token';
const GUEST_SAVED_KEY = 'vn_labor_guest_saved_jobs';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [savedJobs, setSavedJobs] = useState<SavedJobItem[]>(() => {
    try {
      const raw = localStorage.getItem(GUEST_SAVED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const refreshSavedJobs = useCallback(async () => {
    if (!user?.email) {
      try {
        const raw = localStorage.getItem(GUEST_SAVED_KEY);
        setSavedJobs(raw ? JSON.parse(raw) : []);
      } catch {
        setSavedJobs([]);
      }
      return;
    }
    try {
      const res = await fetchSavedJobs(user.email);
      if (Array.isArray(res?.items)) {
        setSavedJobs(res.items);
      }
    } catch {
      // Keep local state if offline
    }
  }, [user?.email]);

  useEffect(() => {
    refreshSavedJobs();
  }, [refreshSavedJobs]);

  const persistSession = (u: UserProfile, tk: string) => {
    setUser(u);
    setToken(tk);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    localStorage.setItem(TOKEN_KEY, tk);
  };

  const login = async (email: string, password: string) => {
    const res = await loginUser({ email, password });
    persistSession(res.user, res.token);
    return res.user;
  };

  const register = async (payload: {
    email: string;
    full_name: string;
    password: string;
    role_type?: string;
    target_role?: string;
    target_location?: string;
    experience_years?: number;
  }) => {
    const res = await registerUser(payload);
    persistSession(res.user, res.token);
    return res.user;
  };

  const loginDemo = async () => {
    try {
      const res = await loginUser({ email: 'demo@vnlabor.vn', password: 'Demo@2026' });
      persistSession(res.user, res.token);
      return res.user;
    } catch {
      const fallbackUser: UserProfile = {
        id: 1,
        email: 'demo@vnlabor.vn',
        full_name: 'Nguyễn Minh Quân',
        role_type: 'Ứng viên / Kỹ sư Phần mềm & GIS',
        target_role: 'Kỹ sư Phần mềm (Backend/Fullstack)',
        target_location: 'TP. Hồ Chí Minh',
        experience_years: 2.5,
        skills: ['Python', 'FastAPI / RESTful API', 'PostgreSQL / SQL', 'React / TypeScript'],
      };
      persistSession(fallbackUser, 'vnl.demo.offline');
      return fallbackUser;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    try {
      const raw = localStorage.getItem(GUEST_SAVED_KEY);
      setSavedJobs(raw ? JSON.parse(raw) : []);
    } catch {
      setSavedJobs([]);
    }
  };

  const updateProfile = async (payload: Partial<UserProfile>) => {
    if (!user?.email) throw new Error('Chưa đăng nhập');
    try {
      const res = await updateUserProfile(user.email, payload);
      setUser(res.user);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      return res.user;
    } catch {
      const merged = { ...user, ...payload };
      setUser(merged);
      localStorage.setItem(USER_KEY, JSON.stringify(merged));
      return merged;
    }
  };

  const toggleBookmark = async (job: any): Promise<boolean> => {
    const jobId = Number(job.job_id || job.id);
    const exists = savedJobs.some((item) => item.job_id === jobId);

    if (user?.email) {
      try {
        await toggleSavedJob({
          user_email: user.email,
          job_id: jobId,
          application_status: exists ? 'REMOVE' : 'Đã lưu',
        });
        await refreshSavedJobs();
        return !exists;
      } catch {
        // Optimistic fallback below
      }
    }

    let next: SavedJobItem[];
    if (exists) {
      next = savedJobs.filter((item) => item.job_id !== jobId);
    } else {
      next = [
        {
          job_id: jobId,
          job_code: job.job_code,
          title: job.title,
          normalized_title: job.normalized_title,
          company_name: job.company_name,
          location_name: job.location_name,
          industry_name: job.industry_name,
          salary_min_vnd: job.salary_min_vnd,
          salary_max_vnd: job.salary_max_vnd,
          experience_level: job.experience_level,
          work_mode: job.work_mode,
          description_raw: job.description_raw,
          skills: job.skills,
          application_status: 'Đã lưu',
          saved_at: new Date().toISOString(),
        },
        ...savedJobs,
      ];
    }
    setSavedJobs(next);
    if (!user?.email) {
      localStorage.setItem(GUEST_SAVED_KEY, JSON.stringify(next));
    }
    return !exists;
  };

  const updateJobStatus = async (jobId: number, status: string, notes?: string) => {
    if (user?.email) {
      try {
        await toggleSavedJob({
          user_email: user.email,
          job_id: jobId,
          application_status: status,
          notes,
        });
        await refreshSavedJobs();
        return;
      } catch {
        // Fallback local update
      }
    }
    const next = savedJobs.map((item) =>
      item.job_id === jobId
        ? { ...item, application_status: status, ...(notes !== undefined ? { notes } : {}) }
        : item
    );
    setSavedJobs(next);
    if (!user?.email) {
      localStorage.setItem(GUEST_SAVED_KEY, JSON.stringify(next));
    }
  };

  const deleteBookmark = async (jobId: number) => {
    if (user?.email) {
      try {
        await removeSavedJob(jobId, user.email);
        await refreshSavedJobs();
        return;
      } catch {
        // Fallback local removal
      }
    }
    const next = savedJobs.filter((item) => item.job_id !== jobId);
    setSavedJobs(next);
    if (!user?.email) {
      localStorage.setItem(GUEST_SAVED_KEY, JSON.stringify(next));
    }
  };

  const savedJobIds = savedJobs.map((item) => item.job_id);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        savedJobs,
        savedJobIds,
        login,
        register,
        loginDemo,
        logout,
        updateProfile,
        refreshSavedJobs,
        toggleBookmark,
        updateJobStatus,
        deleteBookmark,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
