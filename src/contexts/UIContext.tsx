import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

type Theme = 'claro' | 'escuro';
type Tab = 'dashboard' | 'tickets' | 'chamados' | 'reports' | 'relatorios' | 'settings' | 'configuracoes' | 'profile' | 'perfil' | 'devices' | 'device_intelligence' | 'licenses' | 'licencas' | 'knowledge';
type ToastType = 'success' | 'info' | 'error';

interface Toast {
  message: string;
  type: ToastType;
}

interface UIContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (isCollapsed: boolean) => void;
  toast: Toast | null;
  showToast: (message: string, type?: ToastType) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'escuro' ? 'escuro' : 'claro';
  });

  const [activeTab, setActiveTabState] = useState<Tab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'escuro') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const setActiveTab = useCallback((newTab: Tab) => {
    setActiveTabState(newTab);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  const value: UIContextType = {
    theme,
    setTheme,
    activeTab,
    setActiveTab,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isSidebarCollapsed,
    setSidebarCollapsed,
    toast,
    showToast,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
