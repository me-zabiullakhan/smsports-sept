
import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-3 rounded-2xl bg-surface border border-accent/20 text-accent hover:bg-accent/10 transition-all active:scale-95 shadow-lg group"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 group-hover:rotate-45 transition-transform" />
      ) : (
        <Moon className="w-5 h-5 group-hover:-rotate-12 transition-transform" />
      )}
    </button>
  );
};

export default ThemeToggle;
