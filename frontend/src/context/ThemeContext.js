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
    root.style.setProperty('--bg-base',    '#090b10');
    root.style.setProperty('--bg-surface', '#0f1117');
    root.style.setProperty('--text-base',  '#e8eaf0');
  } else {
    root.classList.remove('dark');
    root.style.setProperty('--bg-base',    '#f2f3f7');
    root.style.setProperty('--bg-surface', '#ffffff');
    root.style.setProperty('--text-base',  '#111318');
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
