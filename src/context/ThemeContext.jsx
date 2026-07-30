import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

const THEMES = {
  light: {
    '--bg': '#ffffff',
    '--surface': '#f7f6f2',
    '--surface-2': '#eeecea',
    '--text': '#1a1a1a',
    '--text-muted': '#6b6660',
    '--border': '#d4d0c8',
    '--accent': '#2c4a6e',
    '--accent-text': '#ffffff',
    '--accent-soft': '#e8edf3',
    '--editor-bg': '#ffffff',
    '--sidebar-bg': '#f2f1ed',
    '--danger': '#b04040',
  },
  dark: {
    '--bg': '#151515',
    '--surface': '#1e1e1e',
    '--surface-2': '#272727',
    '--text': '#e5e2da',
    '--text-muted': '#8a8680',
    '--border': '#333330',
    '--accent': '#7a9abf',
    '--accent-text': '#0e1a24',
    '--accent-soft': '#1a2530',
    '--editor-bg': '#1a1a1a',
    '--sidebar-bg': '#161616',
    '--danger': '#c06060',
  },
  parchment: {
    '--bg': '#f5edcc',
    '--surface': '#ede4b8',
    '--surface-2': '#e4d9a8',
    '--text': '#2a1f0e',
    '--text-muted': '#7a6840',
    '--border': '#c4ad80',
    '--accent': '#5c3d18',
    '--accent-text': '#f5edcc',
    '--accent-soft': '#e8ddb0',
    '--editor-bg': '#faf4e0',
    '--sidebar-bg': '#ede4b8',
    '--danger': '#8b3030',
  },
};

const FONTS = {
  baskerville: {
    label: 'Baskerville',
    stack: "'Libre Baskerville', 'Baskerville', Georgia, 'Times New Roman', serif",
  },
  lora: {
    label: 'Lora',
    stack: "'Lora', Georgia, 'Times New Roman', serif",
  },
  inter: {
    label: 'Inter',
    stack: "'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
  },
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('manuscript-theme') || 'light';
  });
  const [font, setFont] = useState(() => {
    return localStorage.getItem('manuscript-font') || 'baskerville';
  });

  useEffect(() => {
    const vars = THEMES[theme] || THEMES.light;
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    root.setAttribute('data-theme', theme);
    localStorage.setItem('manuscript-theme', theme);
  }, [theme]);

  useEffect(() => {
    const stack = (FONTS[font] || FONTS.baskerville).stack;
    document.documentElement.style.setProperty('--font', stack);
    localStorage.setItem('manuscript-font', font);
  }, [font]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        themes: Object.keys(THEMES),
        font,
        setFont,
        fonts: Object.entries(FONTS).map(([id, { label }]) => ({ id, label })),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
