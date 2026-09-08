import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';

export function ThemeToggle({ variant = 'default' }) {
  const { theme, toggleTheme } = useTheme();
  const escuro = theme === 'dark';

  const base =
    variant === 'onNavy'
      ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={escuro ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={escuro ? 'Tema claro' : 'Tema escuro'}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${base}`}
    >
      {escuro ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
