import React, { useState } from 'react';
import { api } from '../../services/api';
import { UserPlus, ShieldCheck, CheckCircle, AlertCircle } from 'lucide-react';

export function CadastroUsuario() {
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    cargo: 'ASSISTENTE'
  });
  const [sucesso, setSucesso] = useState('');
  const [erro, setErro] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSucesso('');
    setErro('');

    try {
      await api.post('/usuarios/cadastrar', form);
      setSucesso(`Usuário ${form.nome} registrado com sucesso no perfil ${form.cargo}!`);
      setForm({ nome: '', email: '', senha: '', cargo: 'ASSISTENTE' });
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao cadastrar usuário.');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md mt-6">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
        <UserPlus className="text-blue-600" />
        Cadastrar Novo Acesso ao Sistema
      </h2>

      {sucesso && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm flex items-center gap-2">
          <CheckCircle size={16} />
          {sucesso}
        </div>
      )}

      {erro && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {erro}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
          <input
            type="text"
            name="nome"
            value={form.nome}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Ana Maria Souza"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail de Acesso</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="exemplo@escola.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
          <input
            type="password"
            name="senha"
            value={form.senha}
            onChange={handleChange}
            required
            minLength={6}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="******"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nível de Permissão (Cargo)</label>
          <select
            name="cargo"
            value={form.cargo}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="ASSISTENTE">ASSISTENTE (Envios de WhatsApp / Atendimento)</option>
            <option value="PROFESSOR">PROFESSOR (Lançamento de Notas / Provas)</option>
            <option value="ANALISTA">ANALISTA (Métricas e Relatórios)</option>
            <option value="DIRETOR">DIRETOR (Acesso Total / Gestão)</option>
            <option value="ADM">ADM (Administrador de TI / Sistema)</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
        >
          <ShieldCheck size={18} />
          Cadastrar e Liberar Permissão
        </button>
      </form>
    </div>
  );
}