'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? 'Cambiar a modo claro (Día)' : 'Cambiar a modo oscuro (Noche)'}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-amber-300 dark:hover:bg-slate-800 transition-all flex items-center justify-center relative focus:outline-hidden"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-90 animate-in fade-in zoom-in-75" />
      ) : (
        <Moon className="w-5 h-5 text-gray-600 transition-transform duration-300 -rotate-12 hover:rotate-0 animate-in fade-in zoom-in-75" />
      )}
    </button>
  );
}
