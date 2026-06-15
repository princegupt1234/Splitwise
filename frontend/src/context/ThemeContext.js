import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const THEMES = ['light', 'dark', 'system'];

function resolveTheme(mode) {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

function applyTheme(resolved) {
  const root = document.documentElement;

  if (resolved === 'dark') {
    root.classList.add('dark');
    root.style.setProperty('--bg-base',           '#090b10');
    root.style.setProperty('--bg-surface',        '#0f1117');
    root.style.setProperty('--bg-surface-strong', 'rgba(255,255,255,0.035)');
    root.style.setProperty('--text-base',         '#e8eaf0');
    root.style.setProperty('--text-muted',        '#4a4d5e');
    root.style.setProperty('--text-subtle',       '#3a3d50');
    root.style.setProperty('--surface-border',    'rgba(255,255,255,0.07)');
    root.style.setProperty('--btn-secondary-bg',  'rgba(255,255,255,0.05)');
    root.style.setProperty('--btn-secondary-text','#c8cad4');
    root.style.setProperty('--btn-secondary-border','rgba(255,255,255,0.08)');
    root.style.setProperty('--btn-secondary-bg-hover','rgba(255,255,255,0.09)');
    root.style.setProperty('--btn-secondary-border-hover','rgba(255,255,255,0.14)');
    root.style.setProperty('--input-bg',          'rgba(255,255,255,0.04)');
    root.style.setProperty('--input-border',      'rgba(255,255,255,0.08)');
    root.style.setProperty('--nav-bg',            'rgba(9,11,16,0.85)');
    root.style.setProperty('--panel-bg',          'rgba(15,17,23,0.95)');
    root.style.setProperty('--panel-border',      'rgba(255,255,255,0.06)');
    root.style.setProperty('--surface-overlay',   'rgba(255,255,255,0.06)');
    root.style.setProperty('--accent',            '#6574f3');
    root.style.setProperty('--success',           '#10b981');
    root.style.setProperty('--warning',           '#f59e0b');
    root.style.setProperty('--danger',            '#ef4444');
  } else {
    root.classList.remove('dark');
    root.style.setProperty('--bg-base',           '#f2f3f7');
    root.style.setProperty('--bg-surface',        '#ffffff');
    root.style.setProperty('--bg-surface-strong', 'rgba(17,19,24,0.04)');
    root.style.setProperty('--text-base',         '#111318');
    root.style.setProperty('--text-muted',        '#6b7280');
    root.style.setProperty('--text-subtle',       '#4b5563');
    root.style.setProperty('--surface-border',    'rgba(15,23,42,0.08)');
    root.style.setProperty('--btn-secondary-bg',  'rgba(17,19,24,0.05)');
    root.style.setProperty('--btn-secondary-text','#111318');
    root.style.setProperty('--btn-secondary-border','rgba(17,19,24,0.08)');
    root.style.setProperty('--btn-secondary-bg-hover','rgba(17,19,24,0.08)');
    root.style.setProperty('--btn-secondary-border-hover','rgba(17,19,24,0.12)');
    root.style.setProperty('--input-bg',          'rgba(17,19,24,0.04)');
    root.style.setProperty('--input-border',      'rgba(17,19,24,0.08)');
    root.style.setProperty('--nav-bg',            'rgba(242,243,247,0.9)');
    root.style.setProperty('--panel-bg',          'rgba(255,255,255,0.92)');
    root.style.setProperty('--panel-border',      'rgba(0,0,0,0.07)');
    root.style.setProperty('--surface-overlay',   'rgba(0,0,0,0.04)');
    root.style.setProperty('--accent',            '#6574f3');
    root.style.setProperty('--success',           '#10b981');
    root.style.setProperty('--warning',           '#f59e0b');
    root.style.setProperty('--danger',            '#ef4444');
  }
}

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('themeMode');
    return THEMES.includes(saved) ? saved : 'dark';
  });

  // derived boolean for components that only need isDark
  const isDark = resolveTheme(mode) === 'dark';

  useEffect(() => {
    const resolved = resolveTheme(mode);
    applyTheme(resolved);
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  // Listen to system preference changes when mode === 'system'
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme(resolveTheme('system'));
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  const setThemeMode = (newMode) => {
    if (THEMES.includes(newMode)) setMode(newMode);
  };

  // backward-compat toggle (dark ↔ light)
  const toggleTheme = () => setMode((prev) => (resolveTheme(prev) === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ mode, isDark, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
