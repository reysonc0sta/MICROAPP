import React, { useState, useEffect } from 'react';
import { Login } from './features/auth/Login';
import { ImportarPlanilha } from './features/whatsapp/ImportarPlanilha';
import { CadastroUsuario } from './features/admin/CadastroUsuario';
import { FileSpreadsheet, UserPlus, LogOut, Shield } from 'lucide-react';

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('planilha');

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
  };

  if (!usuario) {
    return <Login onLoginSuccess={(u) => setUsuario(u)} />;
  }

  const ehAdmin = ['ADM', 'DIRETOR'].includes(usuario.cargo);

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-blue-400">MicroApp - Plataforma Central</h1>
            <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <Shield size={12} className="text-green-400" />
              Usuário: <strong>{usuario.nome}</strong> ({usuario.cargo})
            </span>
          </div>

          <nav className="flex items-center gap-2">
            <button
              onClick={() => setAbaAtiva('planilha')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                abaAtiva === 'planilha' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-gray-300'
              }`}
            >
              <FileSpreadsheet size={16} />
              WhatsApp
            </button>

            {ehAdmin ? (
              <button
                onClick={() => setAbaAtiva('usuarios')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  abaAtiva === 'usuarios' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-gray-300'
                }`}
              >
                <UserPlus size={16} />
                Gestão de Acessos
              </button>
            ) : null}

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 ml-4 px-3 py-2 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-md text-sm font-medium transition-colors"
            >
              <LogOut size={16} />
              Sair
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {abaAtiva === 'planilha' && <ImportarPlanilha />}
        {abaAtiva === 'usuarios' && ehAdmin && <CadastroUsuario />}
      </main>
    </div>
  );
}