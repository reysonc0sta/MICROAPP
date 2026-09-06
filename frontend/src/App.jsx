import React, { useState, useEffect } from 'react';
import { Login } from './features/auth/Login';
import { ImportarPlanilha } from './features/whatsapp/ImportarPlanilha';
import { CadastroUsuario } from './features/admin/CadastroUsuario';
import { ConectarWhatsapp } from './features/whatsapp/ConectarWhatsapp';
import { EditarMensagem } from './features/configuracoes/EditarMensagem';
import { FileSpreadsheet, UserPlus, LogOut, Shield, QrCode, Menu, X, MessageSquareText } from 'lucide-react';
import { ThemeToggle } from './components/ThemeToggle';
import { api } from './services/api';
import { statusWhatsappConectado } from './features/whatsapp/statusWhatsapp';

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('conectar');
  const [menuAberto, setMenuAberto] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState(
    localStorage.getItem('whatsapp_status') || 'DISCONNECTED'
  );

  const atualizarStatusWhatsapp = (conectado) => {
    const status = conectado ? 'CONNECTED' : 'DISCONNECTED';
    setWhatsappStatus(status);
    localStorage.setItem('whatsapp_status', status);
  };

  useEffect(() => {
    const usuarioSalvo = localStorage.getItem('usuario');
    if (usuarioSalvo) {
      setUsuario(JSON.parse(usuarioSalvo));
    }
  }, []);

  useEffect(() => {
    if (!usuario) return undefined;

    let cancelado = false;

    const consultar = async () => {
      try {
        const { data } = await api.get('/whatsapp/status');
        if (!cancelado) {
          atualizarStatusWhatsapp(statusWhatsappConectado(data));
        }
      } catch {
        if (!cancelado) {
          atualizarStatusWhatsapp(false);
        }
      }
    };

    consultar();
    const intervalo = setInterval(consultar, 8000);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [usuario]);

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
  const whatsappConectado = whatsappStatus === 'CONNECTED';

  const irPara = (aba) => {
    setAbaAtiva(aba);
    setMenuAberto(false);
  };

  const classeAba = (aba) =>
    `inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition ${
      abaAtiva === aba
        ? 'bg-white text-navy-900 shadow-sm dark:bg-navy-700 dark:text-white'
        : 'text-navy-100 hover:bg-white/10'
    }`;

  return (
    <div className="min-h-svh bg-navy-50 font-sans text-navy-900 dark:bg-navy-950 dark:text-navy-50">
      <header className="sticky top-0 z-20 border-b border-navy-900/20 bg-navy-800 text-white shadow-md dark:border-navy-700 dark:bg-navy-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight sm:text-xl">MicroApp</h1>
            <span className="mt-0.5 flex items-center gap-1 text-xs text-navy-200">
              <Shield size={12} className="shrink-0 text-emerald-300" />
              <span className="truncate">
                <strong>{usuario.nome}</strong> ({usuario.cargo})
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={() => irPara('conectar')} className={classeAba('conectar')}>
              <QrCode size={16} />
              Conectar WhatsApp
              <span
                className={`h-2.5 w-2.5 rounded-full ${whatsappConectado ? 'bg-emerald-400' : 'bg-amber-400'}`}
                title={whatsappConectado ? 'Conectado' : 'Desconectado'}
              />
            </button>

            <nav className="hidden items-center gap-1 lg:flex">
              <button type="button" onClick={() => irPara('planilha')} className={classeAba('planilha')}>
                <FileSpreadsheet size={16} />
                Disparar Planilha
              </button>

              <button type="button" onClick={() => irPara('mensagem')} className={classeAba('mensagem')}>
                <MessageSquareText size={16} />
                Editar Mensagem
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
                className="inline-flex items-center gap-1 rounded-xl px-3 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-500/20 hover:text-white"
              >
                <LogOut size={16} />
                Sair
              </button>
            </nav>

            <ThemeToggle variant="onNavy" />

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 lg:hidden"
              aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
              onClick={() => setMenuAberto((aberto) => !aberto)}
            >
              {menuAberto ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {menuAberto ? (
          <nav className="space-y-1 border-t border-white/10 px-4 py-3 lg:hidden">
            <button type="button" onClick={() => irPara('planilha')} className={`${classeAba('planilha')} w-full`}>
              <FileSpreadsheet size={16} />
              Disparar Planilha
            </button>

            <button type="button" onClick={() => irPara('mensagem')} className={`${classeAba('mensagem')} w-full`}>
              <MessageSquareText size={16} />
              Editar Mensagem
            </button>

            {ehAdmin ? (
              <button type="button" onClick={() => irPara('usuarios')} className={`${classeAba('usuarios')} w-full`}>
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
        {abaAtiva === 'conectar' ? (
          <ConectarWhatsapp onStatusChange={(status) => atualizarStatusWhatsapp(status === 'CONNECTED')} />
        ) : null}
        {abaAtiva === 'planilha' ? (
          <ImportarPlanilha
            whatsappConectado={whatsappConectado}
            onIrParaConexao={() => irPara('conectar')}
          />
        ) : null}
        {abaAtiva === 'mensagem' ? <EditarMensagem /> : null}
        {abaAtiva === 'usuarios' && ehAdmin ? <CadastroUsuario /> : null}
      </main>
    </div>
  );
}