import React, { useState } from 'react';
import { api, apiErrorMessage } from '../../services/api';
import { UserPlus, ShieldCheck, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export function CadastroUsuario() {
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    cargo: 'ASSISTENTE',
  });
  const [sucesso, setSucesso] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSucesso('');
    setErro('');
    setCarregando(true);

    try {
      await api.post('/usuarios/cadastrar', {
        ...form,
        email: form.email.trim().toLowerCase(),
      });
      setSucesso(`Usuário ${form.nome} registrado com sucesso no perfil ${form.cargo}!`);
      setForm({ nome: '', email: '', senha: '', cargo: 'ASSISTENTE' });
    } catch (err) {
      setErro(apiErrorMessage(err, 'Erro ao cadastrar usuário.'));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="card mx-auto max-w-xl">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-navy-900 sm:text-xl dark:text-white">
        <UserPlus className="shrink-0 text-navy-600 dark:text-navy-300" />
        Cadastrar Novo Acesso ao Sistema
      </h2>

      {sucesso ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <CheckCircle size={16} className="mt-0.5 shrink-0" />
          {sucesso}
        </div>
      ) : null}

      {erro ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {erro}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-navy-800 dark:text-navy-100">Nome Completo</label>
          <input
            type="text"
            name="nome"
            value={form.nome}
            onChange={handleChange}
            required
            disabled={carregando}
            className="field"
            placeholder="Ex: Ana Maria Souza"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy-800 dark:text-navy-100">E-mail de Acesso</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            disabled={carregando}
            className="field"
            placeholder="exemplo@escola.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy-800 dark:text-navy-100">Senha</label>
          <input
            type="password"
            name="senha"
            value={form.senha}
            onChange={handleChange}
            required
            minLength={6}
            disabled={carregando}
            className="field"
            placeholder="******"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy-800 dark:text-navy-100">
            Nível de Permissão (Cargo)
          </label>
          <select
            name="cargo"
            value={form.cargo}
            onChange={handleChange}
            disabled={carregando}
            className="field"
          >
            <option value="ASSISTENTE">ASSISTENTE (Envios de WhatsApp / Atendimento)</option>
            <option value="PROFESSOR">PROFESSOR (Lançamento de Notas / Provas)</option>
            <option value="ANALISTA">ANALISTA (Métricas e Relatórios)</option>
            <option value="DIRETOR">DIRETOR (Acesso Total / Gestão)</option>
            <option value="ADM">ADM (Administrador de TI / Sistema)</option>
          </select>
        </div>

        <button type="submit" disabled={carregando} className="btn-primary">
          {carregando ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
          {carregando ? 'Cadastrando...' : 'Cadastrar e Liberar Permissão'}
        </button>
      </form>
    </div>
  );
}
