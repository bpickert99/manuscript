import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { PenLine, Grid3X3, Map, BookOpen, StickyNote, ArrowLeft, Menu, Sun, Moon, Scroll } from 'lucide-react';

const TABS = [
  { id: 'write', label: 'Write', icon: PenLine },
  { id: 'plot', label: 'Plot Grid', icon: Grid3X3 },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'wiki', label: 'Wiki', icon: BookOpen },
];

export default function TopNav({ activeTab, setActiveTab, notesOpen, setNotesOpen, onMobileMenuOpen }) {
  const { currentProject, clearProject } = useApp();
  const { theme, setTheme } = useTheme();

  function cycleTheme() {
    const themes = ['light', 'dark', 'parchment'];
    const next = themes[(themes.indexOf(theme) + 1) % themes.length];
    setTheme(next);
  }

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'parchment' ? Scroll : Sun;

  return (
    <div className="top-nav">
      <button className="mobile-menu-btn icon-btn" onClick={onMobileMenuOpen} style={{ display: 'none' }}>
        <Menu size={18} />
      </button>

      <button
        className="icon-btn"
        onClick={clearProject}
        title="Back to projects"
        style={{ marginRight: '0.25rem' }}
      >
        <ArrowLeft size={15} />
      </button>

      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginRight: '0.5rem', fontStyle: 'italic' }}>
        {currentProject?.title}
      </span>

      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={"top-nav-tab" + (activeTab === id ? " active" : "")}
          onClick={() => setActiveTab(id)}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}

      <div className="top-nav-spacer" />

      <div className="top-nav-right">
        <button
          className={"icon-btn" + (notesOpen ? " active" : "")}
          onClick={() => setNotesOpen(!notesOpen)}
          title="Toggle notes panel"
        >
          <StickyNote size={15} />
        </button>
        <button className="icon-btn" onClick={cycleTheme} title="Change theme">
          <ThemeIcon size={15} />
        </button>
      </div>
    </div>
  );
}
