import React, { useState, useEffect } from 'react';
import { Login } from './features/auth/Login';
import { ImportarPlanilha } from './features/whatsapp/ImportarPlanilha';
import { CadastroUsuario } from './features/admin/CadastroUsuario';
import { FileSpreadsheet, UserPlus, LogOut, Shield, Menu, X } from 'lucide-react';
import { ThemeToggle } from './components/ThemeToggle';

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('planilha');
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    const usuarioSalvo = localStorage.getItem('usuario');
    if (usuarioSalvo) {
      setUsuario(JSON.parse(usuarioSalvo));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
    setMenuAberto(false);
  };

  if (!usuario) {
    return <Login onLoginSuccess={(u) => setUsuario(u)} />;
  }

  const ehAdmin = ['ADM', 'DIRETOR'].includes(usuario.cargo);

  const irPara = (aba) => {
    setAbaAtiva(aba);
    setMenuAberto(false);
  };

  const classeAba = (aba) =>
    `flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition sm:w-auto ${
      abaAtiva === aba
        ? 'bg-white text-navy-900 shadow-sm dark:bg-navy-700 dark:text-white'
        : 'text-navy-100 hover:bg-white/10'
    }`;

  return (
    <div className="min-h-svh bg-navy-50 font-sans text-navy-900 dark:bg-navy-950 dark:text-navy-50">
      <header className="sticky top-0 z-20 border-b border-navy-900/20 bg-navy-800 text-white shadow-md dark:border-navy-700 dark:bg-navy-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight sm:text-xl">
              MicroApp
            </h1>
            <span className="mt-0.5 flex items-center gap-1 text-xs text-navy-200">
              <Shield size={12} className="shrink-0 text-emerald-300" />
              <span className="truncate">
                <strong>{usuario.nome}</strong>
                <span className="hidden sm:inline"> ({usuario.cargo})</span>
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 md:flex">
              <button type="button" onClick={() => irPara('planilha')} className={classeAba('planilha')}>
                <FileSpreadsheet size={16} />
                WhatsApp
              </button>

              {ehAdmin ? (
                <button type="button" onClick={() => irPara('usuarios')} className={classeAba('usuarios')}>
                  <UserPlus size={16} />
                  Gestão de Acessos
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleLogout}
                className="ml-1 flex items-center gap-1 rounded-xl px-3 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-500/20 hover:text-white"
              >
                <LogOut size={16} />
                Sair
              </button>
            </nav>

            <ThemeToggle variant="onNavy" />

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 md:hidden"
              aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
              onClick={() => setMenuAberto((aberto) => !aberto)}
            >
              {menuAberto ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {menuAberto ? (
          <nav className="space-y-1 border-t border-white/10 px-4 py-3 md:hidden">
            <button type="button" onClick={() => irPara('planilha')} className={classeAba('planilha')}>
              <FileSpreadsheet size={16} />
              WhatsApp
            </button>

            {ehAdmin ? (
              <button type="button" onClick={() => irPara('usuarios')} className={classeAba('usuarios')}>
                <UserPlus size={16} />
                Gestão de Acessos
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-red-200 hover:bg-red-500/20 hover:text-white"
            >
              <LogOut size={16} />
              Sair
            </button>
          </nav>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        {abaAtiva === 'planilha' && <ImportarPlanilha />}
        {abaAtiva === 'usuarios' && ehAdmin && <CadastroUsuario />}
      </main>
    </div>
  );
}
