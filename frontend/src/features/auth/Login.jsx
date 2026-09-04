import React, { useState } from 'react';
import { api } from '../../services/api';
import { LogIn, AlertCircle, Shield } from 'lucide-react';

export function Login({ onLoginSuccess }) {
  const [form, setForm] = useState({ email: '', senha: '' });
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const response = await api.post('/usuarios/login', form);
      const { access_token, usuario } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('usuario', JSON.stringify(usuario));
      
      onLoginSuccess(usuario);
    } catch (err) {
      setErro(err.response?.data?.detail || 'Falha ao autenticar. Verifique seus dados.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-blue-100 rounded-full text-blue-600 mb-2">
            <Shield size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Acesso ao Sistema</h2>
          <p className="text-sm text-gray-500">Entre com suas credenciais para continuar</p>
        </div>

        {erro ? (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{erro}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="seu.email@escola.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              required
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="******"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2.5 rounded-md transition-colors flex items-center justify-center gap-2"
          >
            <LogIn size={18} />
            <span>{carregando ? 'Autenticando...' : 'Entrar no Sistema'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}