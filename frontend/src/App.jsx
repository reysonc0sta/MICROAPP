import React, { useState, useEffect } from 'react';
import { Login } from './features/auth/Login';
import { ImportarPlanilha } from './features/whatsapp/ImportarPlanilha';
import { DispararLembretes } from './features/whatsapp/DispararLembretes';
import { CadastroUsuario } from './features/admin/CadastroUsuario';
import { ConectarWhatsapp } from './features/whatsapp/ConectarWhatsapp';
import { EditarMensagem } from './features/configuracoes/EditarMensagem';
import { AcompanhamentoModulos } from './features/acompanhamento/AcompanhamentoModulos';
import {
  FileSpreadsheet,
  UserPlus,
  LogOut,
  Shield,
  QrCode,
  Menu,
  X,
  MessageSquareText,
  Bell,
  BookOpen,
} from 'lucide-react';
import { ThemeToggle } from './components/ThemeToggle';
import { api } from './services/api';
import { statusWhatsappConectado, lerStatusWhatsapp, gravarStatusWhatsapp, limparStatusWhatsapp } from './features/whatsapp/statusWhatsapp';

const NAV_ITEMS = [
  { id: 'conectar', label: 'Conectar WhatsApp', icon: QrCode, admin: false },
  { id: 'planilha', label: 'Disparar Planilha', icon: FileSpreadsheet, admin: false },
  { id: 'usuarios', label: 'Gestão de Acessos', icon: UserPlus, admin: true },
  { id: 'lembretes', label: 'Lembretes', icon: Bell, admin: false },
  { id: 'mensagem', label: 'Mensagem', icon: MessageSquareText, admin: false },
  { id: 'modulos', label: 'Módulos', icon: BookOpen, admin: false },
];

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('conectar');
  const [menuAberto, setMenuAberto] = useState(false);
  const [validandoSessao, setValidandoSessao] = useState(true);
  const [whatsappStatus, setWhatsappStatus] = useState('DISCONNECTED');

  const atualizarStatusWhatsapp = (conectado, usuarioId = usuario?.id) => {
    const status = conectado ? 'CONNECTED' : 'DISCONNECTED';
    setWhatsappStatus(status);
    if (usuarioId) {
      gravarStatusWhatsapp(usuarioId, status);
    }
  };

  const handleLogout = () => {
    limparStatusWhatsapp(usuario?.id);
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setWhatsappStatus('DISCONNECTED');
    setUsuario(null);
    setMenuAberto(false);
  };

  useEffect(() => {
    const onAuthLogout = () => handleLogout();
    window.addEventListener('auth:logout', onAuthLogout);
    return () => window.removeEventListener('auth:logout', onAuthLogout);
  }, []);

  useEffect(() => {
    const restaurarSessao = async () => {
      const token = localStorage.getItem('token');
      const raw = localStorage.getItem('usuario');

      if (!token || !raw) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        setValidandoSessao(false);
        return;
      }

      try {
        JSON.parse(raw);
        const { data } = await api.get('/usuarios/me');
        localStorage.setItem('usuario', JSON.stringify(data));
        setUsuario(data);
        setWhatsappStatus(lerStatusWhatsapp(data.id));
      } catch {
        handleLogout();
      } finally {
        setValidandoSessao(false);
      }
    };

    restaurarSessao();
  }, []);

  useEffect(() => {
    if (!usuario) return undefined;

    setWhatsappStatus(lerStatusWhatsapp(usuario.id));

    let cancelado = false;

    const consultar = async () => {
      try {
        const { data } = await api.get('/whatsapp/status');
        if (!cancelado) {
          atualizarStatusWhatsapp(statusWhatsappConectado(data), usuario.id);
        }
      } catch {
        if (!cancelado) {
          atualizarStatusWhatsapp(false, usuario.id);
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

  if (validandoSessao) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-zinc-100 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        Validando sessão...
      </div>
    );
  }

  if (!usuario) {
    return (
      <Login
        onLoginSuccess={(u) => {
          setUsuario(u);
          setWhatsappStatus(lerStatusWhatsapp(u.id));
        }}
      />
    );
  }

  const ehAdmin = ['ADM', 'DIRETOR'].includes(usuario.cargo);
  const whatsappConectado = whatsappStatus === 'CONNECTED';
  const itensNav = NAV_ITEMS.filter((item) => !item.admin || ehAdmin);

  const irPara = (aba) => {
    setAbaAtiva(aba);
    setMenuAberto(false);
  };

  const classeAba = (aba) =>
    `inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
      abaAtiva === aba
        ? 'bg-navy-800 text-white shadow-sm dark:bg-navy-600'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
    }`;

  return (
    <div className="min-h-svh bg-zinc-100 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
        {/* Barra superior */}
        <div className="flex w-full items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-800 text-white shadow-sm dark:bg-navy-600">
              <Shield size={18} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold tracking-tight text-slate-900 sm:text-base dark:text-white">
                MicroApp
              </h1>
              <span className="mt-0.5 inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
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
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
              title="Sair"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sair</span>
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 md:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
              onClick={() => setMenuAberto((aberto) => !aberto)}
            >
              {menuAberto ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Abas desktop / tablet */}
        <nav className="hidden w-full gap-1 overflow-x-auto px-4 pb-2.5 sm:px-6 md:flex lg:px-8">
          {itensNav.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => irPara(id)} className={classeAba(id)}>
              <Icon size={15} />
              {label}
              {id === 'conectar' ? (
                <span
                  className={`h-2 w-2 rounded-full ${whatsappConectado ? 'bg-emerald-400' : 'bg-amber-400'}`}
                  title={whatsappConectado ? 'Conectado' : 'Desconectado'}
                />
              ) : null}
            </button>
          ))}
        </nav>

        {/* Menu mobile */}
        {menuAberto ? (
          <nav className="space-y-1 border-t border-slate-200 px-4 py-3 md:hidden dark:border-slate-800">
            {itensNav.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => irPara(id)}
                className={`${classeAba(id)} w-full justify-start`}
              >
                <Icon size={15} />
                {label}
                {id === 'conectar' ? (
                  <span
                    className={`ml-auto h-2 w-2 rounded-full ${
                      whatsappConectado ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                ) : null}
              </button>
            ))}
          </nav>
        ) : null}
      </header>

      <main className="w-full px-4 py-6 sm:px-6 lg:px-8">
        {abaAtiva === 'conectar' ? (
          <ConectarWhatsapp onStatusChange={(status) => atualizarStatusWhatsapp(status === 'CONNECTED', usuario.id)} />
        ) : null}
        {abaAtiva === 'planilha' ? (
          <ImportarPlanilha
            whatsappConectado={whatsappConectado}
            onIrParaConexao={() => irPara('conectar')}
          />
        ) : null}
        {abaAtiva === 'lembretes' ? (
          <DispararLembretes
            whatsappConectado={whatsappConectado}
            onIrParaConexao={() => irPara('conectar')}
          />
        ) : null}
        {abaAtiva === 'mensagem' ? <EditarMensagem /> : null}
        {abaAtiva === 'modulos' ? <AcompanhamentoModulos /> : null}
        {abaAtiva === 'usuarios' && ehAdmin ? <CadastroUsuario /> : null}
      </main>
    </div>
  );
}
