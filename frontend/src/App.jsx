import React, { useState, useEffect } from 'react';
import { Login } from './features/auth/Login';
import { ImportarPlanilha } from './features/whatsapp/ImportarPlanilha';
import { DispararLembretes } from './features/whatsapp/DispararLembretes';
import { CadastroUsuario } from './features/admin/CadastroUsuario';
import { CadastroMateria } from './features/admin/CadastroMateria';
import { ConectarWhatsapp } from './features/whatsapp/ConectarWhatsapp';
import { AcompanhamentoModulos } from './features/acompanhamento/AcompanhamentoModulos';
import { Alunos } from './features/alunos/Alunos';
import {
  FileSpreadsheet,
  UserPlus,
  LogOut,
  Shield,
  QrCode,
  Menu,
  X,
  Bell,
  BookOpen,
  GraduationCap,
  BookMarked,
} from 'lucide-react';
import { ThemeToggle } from './components/ThemeToggle';
import { api } from './services/api';
import { statusWhatsappConectado, lerStatusWhatsapp, gravarStatusWhatsapp, limparStatusWhatsapp } from './features/whatsapp/statusWhatsapp';

const NAV_ITEMS = [
  { id: 'conectar', label: 'Conectar WhatsApp', icon: QrCode },
  {
    id: 'planilha',
    label: 'Disparar Faltas',
    icon: FileSpreadsheet,
    cargos: ['ADM', 'DIRETOR', 'PROFESSOR', 'ASSISTENTE'],
  },
  { id: 'alunos', label: 'Alunos', icon: GraduationCap },
  { id: 'materias', label: 'Matérias', icon: BookMarked, cargos: ['ADM', 'DIRETOR'] },
  { id: 'usuarios', label: 'Gestão de Acessos', icon: UserPlus, cargos: ['ADM', 'DIRETOR'] },
  {
    id: 'lembretes',
    label: 'Lembretes',
    icon: Bell,
    cargos: ['ADM', 'DIRETOR', 'PROFESSOR', 'ASSISTENTE'],
  },
  { id: 'modulos', label: 'Módulos', icon: BookOpen },
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
      <div className="app-shell flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
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
  const itensNav = NAV_ITEMS.filter((item) => !item.cargos || item.cargos.includes(usuario.cargo));

  const irPara = (aba) => {
    setAbaAtiva(aba);
    setMenuAberto(false);
  };

  const classeAba = (aba, compacta = false) =>
    `inline-flex items-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-200 ease-out ${compacta ? 'px-3.5 py-2 text-sm' : 'px-4 py-1.5 text-sm'
    } ${abaAtiva === aba
      ? 'bg-navy-800 text-white shadow-sm dark:bg-navy-600'
      : 'text-slate-600 hover:bg-white/90 hover:text-slate-900 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
    }`;

  return (
    <div className="app-shell font-sans text-slate-900 dark:text-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/70 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/70">
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
              onClick={handleLogout}
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
              onClick={() => setMenuAberto((aberto) => !aberto)}
            >
              {menuAberto ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        <nav className="hidden w-full px-6 pb-3 md:block">
          <div className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-slate-200/80 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900/70">
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
          </div>
        </nav>

        {menuAberto ? (
          <nav className="space-y-1 border-t border-slate-200 px-6 py-3 md:hidden dark:border-slate-800">
            {itensNav.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => irPara(id)}
                className={`${classeAba(id, true)} w-full justify-start`}
              >
                <Icon size={15} />
                {label}
                {id === 'conectar' ? (
                  <span
                    className={`ml-auto h-2 w-2 rounded-full ${whatsappConectado ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                  />
                ) : null}
              </button>
            ))}
          </nav>
        ) : null}
      </header>

      <main className="w-full px-6 py-6">
        {abaAtiva === 'conectar' ? (
          <ConectarWhatsapp onStatusChange={(status) => atualizarStatusWhatsapp(status === 'CONNECTED', usuario.id)} />
        ) : null}
        {abaAtiva === 'planilha' ? (
          <ImportarPlanilha
            whatsappConectado={whatsappConectado}
            onIrParaConexao={() => irPara('conectar')}
          />
        ) : null}
        {abaAtiva === 'alunos' ? <Alunos cargoUsuario={usuario.cargo} /> : null}
        {abaAtiva === 'materias' && ehAdmin ? <CadastroMateria /> : null}
        {abaAtiva === 'lembretes' ? (
          <DispararLembretes
            whatsappConectado={whatsappConectado}
            onIrParaConexao={() => irPara('conectar')}
          />
        ) : null}
        {abaAtiva === 'modulos' ? <AcompanhamentoModulos /> : null}
        {abaAtiva === 'usuarios' && ehAdmin ? <CadastroUsuario /> : null}
      </main>
    </div>
  );
}
