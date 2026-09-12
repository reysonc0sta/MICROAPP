import React from 'react';
import {
  Bell,
  BookMarked,
  BookOpen,
  FileSpreadsheet,
  GraduationCap,
  QrCode,
  UserPlus,
} from 'lucide-react';

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

function classeAba(abaAtiva, aba, compacta = false) {
  return `inline-flex items-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-200 ease-out ${
    compacta ? 'px-3.5 py-2 text-sm' : 'px-4 py-1.5 text-sm'
  } ${
    abaAtiva === aba
      ? 'bg-navy-800 text-white shadow-sm dark:bg-navy-600'
      : 'text-slate-600 hover:bg-white/90 hover:text-slate-900 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
  }`;
}

function IndicadorWhatsapp({ conectado, className = '' }) {
  return (
    <span
      className={`h-2 w-2 rounded-full ${conectado ? 'bg-emerald-400' : 'bg-amber-400'} ${className}`.trim()}
      title={conectado ? 'Conectado' : 'Desconectado'}
    />
  );
}

export function NavTabs({ cargoUsuario, abaAtiva, onNavigate, menuAberto, whatsappConectado }) {
  const itensNav = NAV_ITEMS.filter((item) => !item.cargos || item.cargos.includes(cargoUsuario));

  return (
    <>
      <nav className="hidden w-full px-6 pb-3 md:block">
        <div className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-slate-200/80 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900/70">
          {itensNav.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => onNavigate(id)} className={classeAba(abaAtiva, id)}>
              <Icon size={15} />
              {label}
              {id === 'conectar' ? <IndicadorWhatsapp conectado={whatsappConectado} /> : null}
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
              onClick={() => onNavigate(id)}
              className={`${classeAba(abaAtiva, id, true)} w-full justify-start`}
            >
              <Icon size={15} />
              {label}
              {id === 'conectar' ? (
                <IndicadorWhatsapp conectado={whatsappConectado} className="ml-auto" />
              ) : null}
            </button>
          ))}
        </nav>
      ) : null}
    </>
  );
}
