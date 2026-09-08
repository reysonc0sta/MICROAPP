import React, { useState } from 'react';
import { api, apiErrorMessage } from '../../services/api';
import { LogIn, AlertCircle, Shield } from 'lucide-react';
import { ThemeToggle } from '../../components/ThemeToggle';

export function Login({ onLoginSuccess }) {
  const [form, setForm] = useState({ email: '', senha: '' });
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const response = await api.post('/usuarios/login', {
        email: form.email.trim(),
        senha: form.senha,
      });
      const { access_token, usuario } = response.data;

      localStorage.setItem('token', access_token);
      localStorage.setItem('usuario', JSON.stringify(usuario));

      onLoginSuccess(usuario);
    } catch (err) {
      setErro(apiErrorMessage(err, 'Falha ao autenticar. Verifique seus dados.'));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="relative flex min-h-svh items-center justify-center bg-zinc-100 p-4 dark:bg-slate-950">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="card w-full max-w-md shadow-md">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex rounded-2xl bg-navy-800 p-3 text-white shadow-sm dark:bg-navy-600">
            <Shield size={28} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Acesso ao Sistema
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Entre com suas credenciais para continuar
          </p>
        </div>

        {erro ? (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{erro}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">E-mail</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="field"
              placeholder="seu.email@escola.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Senha</label>
            <input
              type="password"
              required
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              className="field"
              placeholder="******"
            />
          </div>

          <button type="submit" disabled={carregando} className="btn-primary">
            <LogIn size={18} />
            <span>{carregando ? 'Autenticando...' : 'Entrar no Sistema'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
