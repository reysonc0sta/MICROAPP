import React from 'react';
import { LogOut, Menu, Shield, X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export function Header({ usuario, onLogout, menuAberto, onToggleMenu }) {
  return (
    <div className="flex w-full items-center justify-between gap-4 px-6 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-navy-800 text-white shadow-sm dark:bg-navy-600">
          <Shield size={18} />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold tracking-tight text-slate-900 sm:text-base dark:text-white">
            MicroApp
          </h1>
          <span className="mt-0.5 inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-slate-200 bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span className="truncate">
              {usuario.nome}
              <span className="text-slate-400 dark:text-slate-500"> · {usuario.cargo}</span>
            </span>
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <ThemeToggle />
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 transition duration-200 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          title="Sair"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Sair</span>
        </button>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 md:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
          onClick={onToggleMenu}
        >
          {menuAberto ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
    </div>
  );
}
