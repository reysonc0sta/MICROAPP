import React, { useState } from 'react';
import { Login } from './features/auth/Login';
import { ImportarPlanilha } from './features/whatsapp/ImportarPlanilha';
import { DispararLembretes } from './features/whatsapp/DispararLembretes';
import { CadastroUsuario } from './features/admin/CadastroUsuario';
import { CadastroMateria } from './features/admin/CadastroMateria';
import { ConectarWhatsapp } from './features/whatsapp/ConectarWhatsapp';
import { AcompanhamentoModulos } from './features/acompanhamento/AcompanhamentoModulos';
import { Alunos } from './features/alunos/Alunos';
import { Header } from './components/Header';
import { NavTabs } from './components/NavTabs';
import { useSessao } from './hooks/useSessao';
import { useWhatsappStatus } from './hooks/useWhatsappStatus';

export default function App() {
  const { usuario, validandoSessao, definirUsuario, logout } = useSessao();
  const { conectado: whatsappConectado, atualizarStatus } = useWhatsappStatus(usuario?.id);
  const [abaAtiva, setAbaAtiva] = useState('conectar');
  const [menuAberto, setMenuAberto] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuAberto(false);
  };

  const irPara = (aba) => {
    setAbaAtiva(aba);
    setMenuAberto(false);
  };

  if (validandoSessao) {
    return (
      <div className="app-shell flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        Validando sessão...
      </div>
    );
  }

  if (!usuario) {
    return <Login onLoginSuccess={definirUsuario} />;
  }

  const ehAdmin = ['ADM', 'DIRETOR'].includes(usuario.cargo);

  return (
    <div className="app-shell font-sans text-slate-900 dark:text-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/70 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/70">
        <Header
          usuario={usuario}
          onLogout={handleLogout}
          menuAberto={menuAberto}
          onToggleMenu={() => setMenuAberto((aberto) => !aberto)}
        />
        <NavTabs
          cargoUsuario={usuario.cargo}
          abaAtiva={abaAtiva}
          onNavigate={irPara}
          menuAberto={menuAberto}
          whatsappConectado={whatsappConectado}
        />
      </header>

      <main className="w-full px-6 py-6">
        {abaAtiva === 'conectar' ? (
          <ConectarWhatsapp onStatusChange={(status) => atualizarStatus(status === 'CONNECTED')} />
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
