import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'vi' | 'en';
export type ThemeMode = 'light' | 'dark';
export type ViewDensity = 'compact' | 'comfortable';

interface SettingsContextType {
  lang: Language;
  setLang: (l: Language) => void;
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  density: ViewDensity;
  setDensity: (d: ViewDensity) => void;
  showAnimations: boolean;
  setShowAnimations: (b: boolean) => void;
  expertMode: boolean;
  setExpertMode: (b: boolean) => void;
  t: (viText: string, enText: string) => string;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>('vi');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [density, setDensity] = useState<ViewDensity>('comfortable');
  const [showAnimations, setShowAnimations] = useState<boolean>(true);
  const [expertMode, setExpertMode] = useState<boolean>(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const t = (viText: string, enText: string) => (lang === 'vi' ? viText : enText);

  return (
    <SettingsContext.Provider
      value={{
        lang,
        setLang,
        theme,
        setTheme,
        density,
        setDensity,
        showAnimations,
        setShowAnimations,
        expertMode,
        setExpertMode,
        t,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
};
