import React, { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../services/api';
import {
  UserPlus,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Loader2,
  Users,
  RefreshCw,
  Mail,
  BadgeCheck,
} from 'lucide-react';

const CARGOS = [
  { value: 'ASSISTENTE', label: 'ASSISTENTE (Envios de WhatsApp / Atendimento)' },
  { value: 'PROFESSOR', label: 'PROFESSOR (Lançamento de Notas / Provas)' },
  { value: 'ANALISTA', label: 'ANALISTA (Métricas e Relatórios)' },
  { value: 'DIRETOR', label: 'DIRETOR (Acesso Total / Gestão)' },
  { value: 'ADM', label: 'ADM (Administrador de TI / Sistema)' },
];

function badgeCargo(cargo) {
  const mapa = {
    ADM: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-300',
    DIRETOR:
      'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300',
    ANALISTA:
      'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200',
    PROFESSOR:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300',
    ASSISTENTE:
      'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300',
  };
  return mapa[cargo] || mapa.ASSISTENTE;
}

function formatarData(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

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
  const [usuarios, setUsuarios] = useState([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [erroLista, setErroLista] = useState('');

  const carregarUsuarios = async () => {
    setCarregandoLista(true);
    setErroLista('');
    try {
      const { data } = await api.get('/usuarios/');
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (err) {
      setErroLista(apiErrorMessage(err, 'Erro ao carregar usuários cadastrados.'));
    } finally {
      setCarregandoLista(false);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

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
      await carregarUsuarios();
    } catch (err) {
      setErro(apiErrorMessage(err, 'Erro ao cadastrar usuário.'));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="page-title flex items-center gap-2">
          <UserPlus size={22} className="text-navy-600 dark:text-navy-300" />
          Gestão de Acessos
        </h2>
        <p className="page-subtitle mt-1">
          Cadastre novos usuários e acompanhe os acessos já liberados na instituição.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Formulário */}
        <section className="xl:col-span-4">
          <div className="card xl:sticky xl:top-24">
            <h3 className="mb-4 text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
              Cadastrar novo acesso
            </h3>

            {sucesso ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                <CheckCircle size={16} className="mt-0.5 shrink-0" />
                {sucesso}
              </div>
            ) : null}

            {erro ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {erro}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Nome Completo
                </label>
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
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  E-mail de Acesso
                </label>
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
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Senha
                </label>
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
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Nível de Permissão (Cargo)
                </label>
                <select
                  name="cargo"
                  value={form.cargo}
                  onChange={handleChange}
                  disabled={carregando}
                  className="field"
                >
                  {CARGOS.map((cargo) => (
                    <option key={cargo.value} value={cargo.value}>
                      {cargo.label}
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" disabled={carregando} className="btn-primary">
                {carregando ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                {carregando ? 'Cadastrando...' : 'Cadastrar e Liberar Permissão'}
              </button>
            </form>
          </div>
        </section>

        {/* Lista */}
        <section className="xl:col-span-8">
          <div className="card !p-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6 dark:border-slate-800">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                  <Users size={16} className="text-slate-500" />
                  Usuários cadastrados
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {carregandoLista ? 'Carregando...' : `${usuarios.length} usuário(s) na instituição`}
                </p>
              </div>
              <button
                type="button"
                onClick={carregarUsuarios}
                disabled={carregandoLista}
                className="btn-secondary sm:w-auto"
              >
                <RefreshCw size={14} className={carregandoLista ? 'animate-spin' : ''} />
                Atualizar
              </button>
            </div>

            {erroLista ? (
              <div className="m-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {erroLista}
              </div>
            ) : null}

            {carregandoLista ? (
              <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 size={18} className="animate-spin" />
                Carregando usuários...
              </div>
            ) : usuarios.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
                Nenhum usuário cadastrado ainda.
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                    <tr>
                      <th className="px-4 py-3 font-semibold sm:px-6">Nome</th>
                      <th className="px-4 py-3 font-semibold">E-mail</th>
                      <th className="px-4 py-3 font-semibold">Cargo</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold sm:px-6">Criado em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {usuarios.map((u) => (
                      <tr
                        key={u.id}
                        className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900 sm:px-6 dark:text-slate-100">
                          {u.nome}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Mail size={13} className="text-slate-400" />
                            {u.email}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${badgeCargo(u.cargo)}`}>{u.cargo}</span>
                        </td>
                        <td className="px-4 py-3">
                          {u.ativo ? (
                            <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <BadgeCheck size={11} />
                              Ativo
                            </span>
                          ) : (
                            <span className="badge border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                              Inativo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 sm:px-6 dark:text-slate-400">
                          {formatarData(u.criado_em)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
