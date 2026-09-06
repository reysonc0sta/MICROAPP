import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';

export function ThemeToggle({ variant = 'default' }) {
  const { theme, toggleTheme } = useTheme();
  const escuro = theme === 'dark';

  const base =
    variant === 'onNavy'
      ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
      : 'border-navy-200 bg-white text-navy-800 hover:bg-navy-50 dark:border-navy-600 dark:bg-navy-800 dark:text-navy-50 dark:hover:bg-navy-700';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={escuro ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={escuro ? 'Tema claro' : 'Tema escuro'}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${base}`}
    >
      {escuro ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
